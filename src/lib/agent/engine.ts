/**
 * Agent engine — core execution loop for browsing + summarizing tasks.
 * Used server-side only.
 */
import { simplifyHtml, extractTitle, extractDescription } from './html-parser';
import { summarizeWebContent } from './llm';
import { JINA_READER_URL } from '@/lib/constants';
import { db } from '@/lib/db';

export interface AgentStep {
  type: 'fetch' | 'parse' | 'think' | 'summarize' | 'done' | 'error';
  message: string;
  progress: number;
}

export type StepCallback = (step: AgentStep) => void;

export interface AgentOptions {
  maxTurns?: number;
  saveReport?: boolean;
  userId?: string;
  onStep?: StepCallback;
  noOp?: (step: AgentStep) => void;
}

export async function runAgent(
  url: string,
  prompt: string,
  maxTurns: number,
  userId: string,
  onStep: StepCallback
): Promise<{ title: string; summary: string }> {
  try {
    // Step 1: Fetch content via Jina Reader
    onStep({ type: 'fetch', message: `Fetching content from ${url}...`, progress: 10 });

    let rawHtml: string;
    let fetchError: string | null = null;

    try {
      const resp = await fetch(`${JINA_READER_URL}${url}`, {
        headers: { Accept: 'text/plain', 'X-Return-Format': 'html' },
        signal: AbortSignal.timeout(30000),
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }

      rawHtml = await resp.text();
    } catch (fetchErr) {
      fetchError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      // Fallback: try direct fetch
      try {
        onStep({ type: 'fetch', message: 'Jina Reader failed, trying direct fetch...', progress: 15 });
        const directResp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)',
            Accept: 'text/html',
          },
          signal: AbortSignal.timeout(30000),
        });
        if (!directResp.ok) throw new Error(`HTTP ${directResp.status}`);
        rawHtml = await directResp.text();
        fetchError = null;
      } catch {
        throw new Error(`Failed to fetch URL: ${fetchError}`);
      }
    }

    onStep({ type: 'fetch', message: 'Content fetched successfully', progress: 30 });

    // Step 2: Parse and simplify HTML
    onStep({ type: 'parse', message: 'Parsing and simplifying HTML content...', progress: 40 });

    const title = extractTitle(rawHtml);
    const description = extractDescription(rawHtml);
    const simplifiedContent = simplifyHtml(rawHtml);

    if (simplifiedContent.length < 50) {
      throw new Error('Page content is too short or empty. The page might be behind a paywall or require JavaScript.');
    }

    onStep({ type: 'parse', message: `Extracted ${simplifiedContent.length.toLocaleString()} characters of content`, progress: 50 });

    // Step 3: Summarize with configured LLM
    onStep({ type: 'think', message: 'Analyzing content with AI...', progress: 60 });
    onStep({ type: 'summarize', message: 'Generating summary...', progress: 70 });

    const fullPrompt = description
      ? `${prompt}\n\nPage Title: ${title}\nPage Description: ${description}\n\nPlease summarize the following web content:`
      : `${prompt}\n\nPlease summarize the following web page (${title}):`;

    // Uses the currently configured LLM provider/model from llm.ts
    const summary = await summarizeWebContent(simplifiedContent, fullPrompt);

    onStep({ type: 'summarize', message: 'Summary generated successfully', progress: 90 });

    // Step 4: Save report to database
    onStep({ type: 'done', message: 'Saving report...', progress: 95 });

    const wordCount = summary.split(/\s+/).length;
    await db.report.create({
      data: {
        userId,
        title: `[Browse] ${title}`,
        content: summary,
        summary: summary.substring(0, 200) + (summary.length > 200 ? '...' : ''),
        source: JSON.stringify([url]),
        channel: 'web',
        status: 'completed',
        wordCount,
      },
    });

    onStep({ type: 'done', message: 'Task completed!', progress: 100 });

    return { title, summary };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
    onStep({ type: 'error', message: errorMsg, progress: 0 });
    throw err;
  }
}
