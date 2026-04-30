import type { Channel, ChannelHealth } from './base';
import { JINA_READER_URL } from '@/lib/constants';

export const douyinChannel: Channel = {
  id: 'douyin',

  canHandle(url: string): boolean {
    return /douyin\.com/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://www.douyin.com', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)' },
        signal: AbortSignal.timeout(10000),
      });
      return resp.ok
        ? { status: 'ok', message: 'Douyin is reachable' }
        : { status: 'warn', message: `Douyin returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `Douyin error: ${err instanceof Error ? err.message : 'Unknown'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    // Use Jina Reader to extract Douyin content
    const isUrl = query.startsWith('http') || /douyin\.com/i.test(query);
    const url = isUrl
      ? (query.startsWith('http') ? query : `https://${query}`)
      : `https://www.douyin.com/search/${encodeURIComponent(query)}`;

    try {
      const resp = await fetch(`${JINA_READER_URL}${url}`, {
        headers: { Accept: 'text/plain', 'X-Return-Format': 'html' },
        signal: AbortSignal.timeout(30000),
      });
      if (resp.ok) {
        const content = await resp.text();
        if (content.length > 50) {
          return { title: `Douyin: ${query}`, content, url };
        }
      }
    } catch {
      // Jina failed
    }

    return { title: 'Douyin', content: `Failed to fetch Douyin content for: ${query}`, url };
  },
};
