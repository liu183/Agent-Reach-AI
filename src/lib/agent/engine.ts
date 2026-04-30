/**
 * ReAct Agent Engine — Autonomous web browsing agent.
 *
 * Architecture: Observe → Think → Act → Reflect loop
 *
 * Each turn:
 *   1. OBSERVE: Get current page state (content, links, forms)
 *   2. THINK: LLM analyzes page + task + history → decides next action
 *   3. ACT: Execute the action (navigate, click, fill form, extract, etc.)
 *   4. REFLECT: Check if task is complete, adjust strategy
 *
 * The agent maintains a history of all turns for context.
 */

import { chatCompletion, ChatMessage } from './llm';
import { fetchPage, navigateToLink, submitForm, formatPageForLLM } from './browser-toolkit';
import { db } from '@/lib/db';
import type {
  AgentStep,
  AgentAction,
  AgentTurn,
  PageSnapshot,
  AgentConfig,
  DEFAULT_AGENT_CONFIG,
} from './agent-types';

// ===== System Prompt =====

const AGENT_SYSTEM_PROMPT = `You are an autonomous web browsing agent. You can navigate websites, click links, fill forms, extract data, and complete complex multi-step web tasks.

## Your Capabilities
- **navigate**: Go to any URL
- **click_link**: Click a link on the current page (by link index or URL)
- **fill_form**: Fill in form fields and submit
- **extract**: Extract specific information from the page
- **search**: Look for specific content on the page
- **scroll**: Indicate you need to see more content (we'll re-fetch)
- **think**: Pure reasoning step to plan your approach
- **complete**: Task is done, provide final summary

## Rules
1. Always explain your REASONING before taking an action
2. Break complex tasks into small, sequential steps
3. If a page doesn't have what you need, navigate to another page
4. When filling forms, provide realistic/meaningful values
5. After completing the task, use "complete" with a comprehensive summary
6. If you cannot complete the task after several attempts, explain why and use "complete"
7. Be thorough — explore multiple pages if needed
8. You can visit the same page multiple times if needed

## Response Format
You MUST respond in this exact JSON format:
{"reasoning":"Your step-by-step reasoning here","action":{"type":"action_type","target":"target_value","data":{},"query":"search_query","extract":"what_to_extract","summary":"final_summary"}}

Action types and their parameters:
- navigate: {"type":"navigate","target":"https://example.com"}
- click_link: {"type":"click_link","target":"link_index_or_url"}
- fill_form: {"type":"fill_form","target":"form_index","data":{"field_name":"value"}}
- extract: {"type":"extract","extract":"what information to extract"}
- search: {"type":"search","query":"text to find on page"}
- scroll: {"type":"scroll"}
- think: {"type":"think"} (just reasoning, no parameters needed)
- complete: {"type":"complete","summary":"final comprehensive summary of findings"}

DO NOT include any text outside the JSON. Only valid JSON.`;

// ===== Main Agent Loop =====

export interface AgentResult {
  title: string;
  summary: string;
  turnsUsed: number;
}

export type StepCallback = (step: AgentStep) => void;

/**
 * Run the ReAct agent loop
 */
export async function runAgent(
  url: string,
  task: string,
  maxTurns: number,
  userId: string,
  onStep: StepCallback
): Promise<AgentResult> {
  const config: AgentConfig = {
    maxTurns,
    maxContentLength: 30000,
    verbose: true,
  };

  const turns: AgentTurn[] = [];
  let currentSnapshot: PageSnapshot | null = null;
  let currentUrl = url;

  try {
    // === Initial Observation ===
    onStep({
      turn: 0, phase: 'observe',
      message: `Starting agent for task: "${task}"`,
      progress: 5, url: currentUrl,
    });

    currentSnapshot = await fetchPage(currentUrl);
    turns.push({
      turn: 0,
      observation: `Fetched page: "${currentSnapshot.title}" (${currentSnapshot.contentLength} chars, ${currentSnapshot.links.length} links, ${currentSnapshot.forms.length} forms)`,
      thinking: '',
      action: { type: 'think', reasoning: 'Initial page loaded, analyzing task requirements.' },
      result: 'Page loaded successfully.',
    });

    onStep({
      turn: 0, phase: 'observe',
      message: `Fetched: "${currentSnapshot.title}" — ${currentSnapshot.contentLength.toLocaleString()} chars, ${currentSnapshot.links.length} links, ${currentSnapshot.forms.length} forms`,
      progress: 15, url: currentUrl, title: currentSnapshot.title,
    });

    // === Agent Loop ===
    for (let turn = 1; turn <= config.maxTurns; turn++) {
      const progressBase = 15 + Math.floor((turn / config.maxTurns) * 75);

      // --- THINK Phase ---
      onStep({
        turn, phase: 'think',
        message: `Turn ${turn}/${config.maxTurns}: Analyzing page and planning next action...`,
        progress: progressBase, url: currentUrl,
      });

      // Build context for LLM
      const pageContext = currentSnapshot
        ? formatPageForLLM(currentSnapshot, config.maxContentLength)
        : 'No page loaded.';

      const historyContext = turns.slice(-6).map((t, i) =>
        `--- Previous Step ${i + 1} ---\nObservation: ${t.observation}\nAction: ${t.action.type} → ${t.action.target || ''}\nResult: ${t.result}`
      ).join('\n\n');

      const thinkPrompt = `## Current Task
${task}

## Current Page
${pageContext}

## Action History (recent)
${historyContext || 'No previous actions yet.'}

## Turn ${turn} of ${config.maxTurns}
Based on the task and current page state, decide your next action. Remember to output ONLY valid JSON.`;

      let action: AgentAction;
      try {
        const llmResponse = await chatCompletion([
          { role: 'system', content: AGENT_SYSTEM_PROMPT },
          { role: 'user', content: thinkPrompt },
        ], { maxTokens: 2000, temperature: 0.3 });

        action = parseAction(llmResponse, turn);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        onStep({
          turn, phase: 'think',
          message: `LLM reasoning error: ${errMsg}. Retrying with simplified prompt...`,
          progress: progressBase, url: currentUrl,
        });

        // Fallback: simple completion with less context
        const fallbackResponse = await chatCompletion([
          { role: 'system', content: AGENT_SYSTEM_PROMPT },
          { role: 'user', content: `Task: ${task}\nCurrent page: ${currentSnapshot?.title || 'unknown'}\nWhat should I do next? Respond with ONLY JSON.` },
        ], { maxTokens: 500, temperature: 0.2 });

        action = parseAction(fallbackResponse, turn);
      }

      // Log the thinking
      onStep({
        turn, phase: 'think',
        message: action.reasoning || `Planning to: ${action.type}`,
        progress: progressBase + 5, url: currentUrl,
      });

      // --- Check for completion ---
      if (action.type === 'complete') {
        onStep({
          turn, phase: 'act',
          message: `Task completed! Generating final summary...`,
          progress: 95, url: currentUrl,
        });

        const summary = action.summary || 'Task completed.';

        // Save report
        await saveReport(userId, currentSnapshot?.title || 'Agent Task', summary, [currentUrl], turns.length);

        onStep({
          turn, phase: 'reflect',
          message: summary,
          progress: 100, url: currentUrl,
        });

        return {
          title: currentSnapshot?.title || 'Agent Task',
          summary,
          turnsUsed: turn,
        };
      }

      // --- ACT Phase ---
      onStep({
        turn, phase: 'act',
        message: `Executing: ${action.type}${action.target ? ` → ${action.target}` : ''}...`,
        progress: progressBase + 10, url: currentUrl,
        action,
      });

      let result = '';
      let observation = '';

      try {
        switch (action.type) {
          case 'navigate': {
            if (!action.target) throw new Error('No target URL provided');
            onStep({ turn, phase: 'act', message: `Navigating to ${action.target}...`, progress: progressBase + 15, url: currentUrl });
            currentSnapshot = await fetchPage(action.target);
            currentUrl = action.target;
            observation = `Navigated to "${currentSnapshot.title}" (${currentSnapshot.contentLength} chars, ${currentSnapshot.links.length} links, ${currentSnapshot.forms.length} forms)`;
            result = `Successfully navigated to ${action.target}`;
            break;
          }

          case 'click_link': {
            const target = action.target || '';
            // Try to find link by index or URL match
            let linkHref = target;
            if (currentSnapshot) {
              // Try matching by index: "Link 5"
              const indexMatch = target.match(/link\s*(\d+)/i);
              if (indexMatch) {
                const idx = parseInt(indexMatch[1]);
                const link = currentSnapshot.links.find(l => l.index === idx);
                if (link) linkHref = link.href;
              } else {
                // Try matching by text or URL
                const byText = currentSnapshot.links.find(l =>
                  l.text.toLowerCase().includes(target.toLowerCase()) ||
                  l.href.toLowerCase().includes(target.toLowerCase())
                );
                if (byText) linkHref = byText.href;
              }
            }
            onStep({ turn, phase: 'act', message: `Clicking link → ${linkHref}...`, progress: progressBase + 15, url: currentUrl });
            currentSnapshot = await navigateToLink(linkHref, currentUrl);
            currentUrl = currentSnapshot.url;
            observation = `Clicked link, now on "${currentSnapshot.title}" (${currentSnapshot.contentLength} chars)`;
            result = `Clicked link, navigated to ${currentSnapshot.url}`;
            break;
          }

          case 'fill_form': {
            if (!currentSnapshot) throw new Error('No page loaded');
            const formIndex = action.target ? parseInt(action.target) : 0;
            const form = currentSnapshot.forms[formIndex] || currentSnapshot.forms[0];
            if (!form) throw new Error(`No form found (index ${formIndex})`);
            if (!action.data || Object.keys(action.data).length === 0) throw new Error('No form data provided');

            // Merge provided data with existing form field names
            const submitData: Record<string, string> = {};
            for (const [key, value] of Object.entries(action.data)) {
              // If key is a form field name, use it; otherwise try to match
              const field = form.inputs.find(f => f.name === key);
              submitData[field ? field.name : key] = value;
            }

            // Fill in any required fields that weren't provided
            for (const field of form.inputs) {
              if (field.required && !(field.name in submitData)) {
                submitData[field.name] = `[${field.type}]`;
              }
            }

            onStep({
              turn, phase: 'act',
              message: `Submitting form at ${form.action} (method: ${form.method}) with ${Object.keys(submitData).length} fields...`,
              progress: progressBase + 15, url: currentUrl,
            });

            currentSnapshot = await submitForm(form.action, form.method, submitData, currentUrl);
            currentUrl = currentSnapshot.url;
            observation = `Form submitted to ${form.action}, now on "${currentSnapshot.title}"`;
            result = `Form submitted successfully. New page: ${currentSnapshot.title}`;
            break;
          }

          case 'extract': {
            if (!currentSnapshot) throw new Error('No page loaded');
            const extractQuery = action.extract || 'all important information';
            // Use LLM to extract specific info from page content
            const extractResponse = await chatCompletion([
              { role: 'system', content: 'Extract the requested information from the page content. Be thorough and specific. If the information is not found, say so clearly.' },
              { role: 'user', content: `Extract from page "${currentSnapshot.title}":\n${extractQuery}\n\nPage content:\n${currentSnapshot.content.substring(0, 15000)}` },
            ], { maxTokens: 2000, temperature: 0.1 });
            observation = `Extracted information from "${currentSnapshot.title}"`;
            result = extractResponse;
            onStep({
              turn, phase: 'observe',
              message: `Extracted: ${extractResponse.substring(0, 200)}...`,
              progress: progressBase + 20, url: currentUrl,
            });
            break;
          }

          case 'search': {
            if (!currentSnapshot) throw new Error('No page loaded');
            const query = action.query || '';
            const hasMatch = currentSnapshot.content.toLowerCase().includes(query.toLowerCase());
            if (hasMatch) {
              // Find surrounding context
              const idx = currentSnapshot.content.toLowerCase().indexOf(query.toLowerCase());
              const start = Math.max(0, idx - 200);
              const end = Math.min(currentSnapshot.content.length, idx + query.length + 500);
              const context = currentSnapshot.content.substring(start, end);
              observation = `Found "${query}" on page`;
              result = `Found match for "${query}": ...${context}...`;
            } else {
              // Try searching for links that match
              const matchingLinks = currentSnapshot.links.filter(l =>
                l.text.toLowerCase().includes(query.toLowerCase()) ||
                l.href.toLowerCase().includes(query.toLowerCase())
              );
              if (matchingLinks.length > 0) {
                observation = `Found ${matchingLinks.length} links matching "${query}"`;
                result = `Matching links:\n${matchingLinks.map(l => `- [Link ${l.index}] "${l.text}" → ${l.href}`).join('\n')}`;
              } else {
                observation = `Could not find "${query}" on current page`;
                result = `"${query}" not found on "${currentSnapshot.title}". Consider navigating to a different page.`;
              }
            }
            onStep({
              turn, phase: 'observe',
              message: result.substring(0, 300) + (result.length > 300 ? '...' : ''),
              progress: progressBase + 15, url: currentUrl,
            });
            break;
          }

          case 'scroll': {
            // Re-fetch the page (simulate scroll/load more)
            onStep({ turn, phase: 'act', message: 'Re-fetching page for updated content...', progress: progressBase + 15, url: currentUrl });
            currentSnapshot = await fetchPage(currentUrl);
            observation = `Page re-fetched: "${currentSnapshot.title}" (${currentSnapshot.contentLength} chars)`;
            result = `Page refreshed, ${currentSnapshot.contentLength} chars available`;
            break;
          }

          case 'think': {
            observation = 'Pure reasoning step.';
            result = action.reasoning || 'Continued planning...';
            break;
          }

          default: {
            observation = `Unknown action type: ${action.type}`;
            result = `Skipped unknown action: ${action.type}`;
          }
        }
      } catch (actErr) {
        const errMsg = actErr instanceof Error ? actErr.message : String(actErr);
        observation = `Action failed: ${errMsg}`;
        result = `Error: ${errMsg}`;
        onStep({
          turn, phase: 'act',
          message: `Action failed: ${errMsg}`,
          progress: progressBase + 10, url: currentUrl,
        });
      }

      // Record turn
      turns.push({
        turn,
        observation,
        thinking: action.reasoning || '',
        action,
        result,
      });

      // --- REFLECT Phase ---
      onStep({
        turn, phase: 'reflect',
        message: result.substring(0, 300) + (result.length > 300 ? '...' : ''),
        progress: progressBase + 25, url: currentUrl,
      });
    }

    // Max turns reached — auto-complete
    onStep({
      turn: maxTurns, phase: 'reflect',
      message: `Reached maximum turns (${maxTurns}). Compiling findings...`,
      progress: 95, url: currentUrl,
    });

    // Generate final summary from all turns
    const finalSummary = await generateFinalSummary(task, turns);
    await saveReport(userId, currentSnapshot?.title || 'Agent Task', finalSummary,
      turns.map(t => t.result.match(/https?:\/\/[^\s"]+/)?.[0] || currentUrl).filter(Boolean),
      turns.length,
    );

    onStep({
      turn: maxTurns, phase: 'reflect',
      message: finalSummary,
      progress: 100, url: currentUrl,
    });

    return {
      title: currentSnapshot?.title || 'Agent Task',
      summary: finalSummary,
      turnsUsed: maxTurns,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
    onStep({ turn: 0, phase: 'act', message: `Agent error: ${errorMsg}`, progress: 0, url: currentUrl });
    throw err;
  }
}

// ===== Helpers =====

function parseAction(llmResponse: string, turn: number): AgentAction {
  // Try to extract JSON from the response
  const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      type: 'think',
      reasoning: `Could not parse LLM response as JSON. Raw response: ${llmResponse.substring(0, 200)}`,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize action type
    const validTypes = ['navigate', 'click_link', 'fill_form', 'extract', 'search', 'scroll', 'think', 'complete'];
    let actionType = parsed.action?.type || parsed.type || 'think';
    if (!validTypes.includes(actionType)) actionType = 'think';

    return {
      type: actionType as AgentAction['type'],
      reasoning: parsed.reasoning || parsed.action?.reasoning || `Turn ${turn}: ${actionType}`,
      target: parsed.action?.target || parsed.target,
      data: parsed.action?.data || parsed.data,
      query: parsed.action?.query || parsed.query,
      extract: parsed.action?.extract || parsed.extract,
      summary: parsed.action?.summary || parsed.summary,
    };
  } catch {
    return {
      type: 'think',
      reasoning: `JSON parse error. Raw: ${jsonMatch[0].substring(0, 200)}`,
    };
  }
}

async function generateFinalSummary(task: string, turns: AgentTurn[]): Promise<string> {
  const historySummary = turns.map(t =>
    `[Turn ${t.turn}] ${t.action.type}: ${t.result.substring(0, 200)}`
  ).join('\n');

  return chatCompletion([
    {
      role: 'system',
      content: 'You are summarizing the results of an autonomous web browsing agent. Compile all findings into a comprehensive, well-structured Markdown summary. Include key discoveries, data collected, and conclusions. Use the same language as the task description.',
    },
    {
      role: 'user',
      content: `## Original Task\n${task}\n\n## Agent Execution Log\n${historySummary}\n\nPlease provide a comprehensive summary of what was accomplished.`,
    },
  ], { maxTokens: 3000, temperature: 0.3 });
}

async function saveReport(
  userId: string,
  title: string,
  summary: string,
  urls: string[],
  turnsUsed: number
): Promise<void> {
  try {
    const wordCount = summary.split(/\s+/).length;
    await db.report.create({
      data: {
        userId,
        title: `[Agent] ${title}`,
        content: summary,
        summary: summary.substring(0, 300) + (summary.length > 300 ? '...' : ''),
        source: JSON.stringify(urls.filter(Boolean)),
        channel: 'web',
        status: 'completed',
        wordCount,
        metadata: { turnsUsed },
      },
    });
  } catch (err) {
    console.error('Failed to save agent report:', err);
  }
}
