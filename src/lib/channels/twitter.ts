import type { Channel, ChannelHealth } from './base';

export const twitterChannel: Channel = {
  id: 'twitter',

  canHandle(url: string): boolean {
    return /twitter\.com|x\.com/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://x.com', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok || resp.status === 200) {
        return { status: 'ok', message: 'X/Twitter is reachable (cookie may be needed for content)' };
      }
      return { status: 'warn', message: `X/Twitter returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `X/Twitter unavailable: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    return { title: 'Twitter/X', content: `Query: ${query}\nNote: Twitter content extraction requires authentication cookies. Configure in Settings.`, url: `https://x.com/search?q=${encodeURIComponent(query)}` };
  },
};
