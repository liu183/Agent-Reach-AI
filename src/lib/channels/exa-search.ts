import type { Channel, ChannelHealth } from './base';

export const exaSearchChannel: Channel = {
  id: 'exa-search',

  canHandle(): boolean {
    return false; // Exa is a search engine, not a URL handler
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      return { status: 'warn', message: 'Exa API key not configured. Set EXA_API_KEY in environment variables.' };
    }
    try {
      const resp = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ query: 'test', numResults: 1 }),
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        return { status: 'ok', message: 'Exa Search API is functional' };
      }
      return { status: 'warn', message: `Exa API returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `Exa error: ${err instanceof Error ? err.message : 'Unknown'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    const apiKey = process.env.EXA_API_KEY;

    if (!apiKey) {
      // Fallback to Jina Reader for web search via DuckDuckGo
      try {
        const { JINA_READER_URL } = await import('@/lib/constants');
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const resp = await fetch(`${JINA_READER_URL}${searchUrl}`, {
          headers: { Accept: 'text/plain', 'X-Return-Format': 'html' },
          signal: AbortSignal.timeout(30000),
        });
        if (resp.ok) {
          const content = await resp.text();
          if (content.length > 50) {
            return { title: `Web Search: ${query}`, content, url: searchUrl };
          }
        }
      } catch {
        // Fallback failed
      }
      return { title: 'Exa Search', content: `Exa API key not configured. Set EXA_API_KEY in environment variables to enable AI-powered search. Query: ${query}`, url: 'https://exa.ai' };
    }

    try {
      const resp = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          query,
          numResults: 10,
          type: 'auto',
          contents: { text: { maxCharacters: 500 } },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`Exa API error (${resp.status}): ${errText}`);
      }

      const data = await resp.json();
      const results = (data?.results || []).slice(0, 10);
      const content = results.map((r: { title: string; text: string; url: string; score: number }, i: number) =>
        `${i + 1}. **${r.title}** (Score: ${(r.score || 0).toFixed(2)})\n   ${r.text?.substring(0, 200) || ''}\n   ${r.url}`
      ).join('\n\n');

      return {
        title: `Exa Search: ${query}`,
        content: content || 'No results found',
        url: 'https://exa.ai',
      };
    } catch (err) {
      return { title: 'Exa Search', content: `Error: ${err instanceof Error ? err.message : 'Unknown'}`, url: 'https://exa.ai' };
    }
  },
};
