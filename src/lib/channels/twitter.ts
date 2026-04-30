import type { Channel, ChannelHealth } from './base';
import { JINA_READER_URL } from '@/lib/constants';

export const twitterChannel: Channel = {
  id: 'twitter',

  canHandle(url: string): boolean {
    return /twitter\.com|x\.com/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://x.com', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)' },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok || resp.status === 200) {
        return { status: 'ok', message: 'X/Twitter is reachable' };
      }
      return { status: 'warn', message: `X/Twitter returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `X/Twitter unavailable: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    // Use Jina Reader to read Twitter/X content
    const isUrl = query.startsWith('http') || /x\.com|twitter\.com/i.test(query);
    const url = isUrl
      ? (query.startsWith('http') ? query : `https://${query}`)
      : `https://x.com/search?q=${encodeURIComponent(query)}`;

    try {
      const resp = await fetch(`${JINA_READER_URL}${url}`, {
        headers: { Accept: 'text/plain', 'X-Return-Format': 'html' },
        signal: AbortSignal.timeout(30000),
      });
      if (resp.ok) {
        const content = await resp.text();
        if (content.length > 50) {
          return { title: `Twitter/X: ${isUrl ? query : query}`, content, url };
        }
      }
    } catch {
      // Jina Reader failed
    }

    return { title: 'Twitter/X', content: `Failed to fetch X/Twitter content for: ${query}`, url };
  },
};
