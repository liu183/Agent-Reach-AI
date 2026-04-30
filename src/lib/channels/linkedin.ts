import type { Channel, ChannelHealth } from './base';
import { JINA_READER_URL } from '@/lib/constants';

export const linkedinChannel: Channel = {
  id: 'linkedin',

  canHandle(url: string): boolean {
    return /linkedin\.com/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://www.linkedin.com', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)' },
        signal: AbortSignal.timeout(10000),
      });
      return resp.ok
        ? { status: 'ok', message: 'LinkedIn is reachable' }
        : { status: 'warn', message: `LinkedIn returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `LinkedIn error: ${err instanceof Error ? err.message : 'Unknown'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    // Use Jina Reader to extract LinkedIn content
    const isUrl = query.startsWith('http') || /linkedin\.com/i.test(query);
    const url = isUrl
      ? (query.startsWith('http') ? query : `https://${query}`)
      : `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query)}`;

    try {
      const resp = await fetch(`${JINA_READER_URL}${url}`, {
        headers: { Accept: 'text/plain', 'X-Return-Format': 'html' },
        signal: AbortSignal.timeout(30000),
      });
      if (resp.ok) {
        const content = await resp.text();
        if (content.length > 50) {
          return { title: `LinkedIn: ${query}`, content, url };
        }
      }
    } catch {
      // Jina failed
    }

    return { title: 'LinkedIn', content: `Failed to fetch LinkedIn content for: ${query}`, url };
  },
};
