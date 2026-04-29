import type { Channel, ChannelHealth } from './base';

export const douyinChannel: Channel = {
  id: 'douyin',
  canHandle(url: string): boolean { return /douyin\.com/i.test(url); },
  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://www.douyin.com', { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
      return resp.ok ? { status: 'ok', message: 'Douyin is reachable' } : { status: 'warn', message: `Douyin returned ${resp.status}` };
    } catch (err) { return { status: 'error', message: `Douyin error: ${err instanceof Error ? err.message : 'Unknown'}` }; }
  },
  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    return { title: 'Douyin', content: `Query: ${query}\nNote: Douyin content extraction is limited. Full extraction requires browser automation.`, url: 'https://www.douyin.com' };
  },
};
