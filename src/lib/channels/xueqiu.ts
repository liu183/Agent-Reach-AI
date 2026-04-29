import type { Channel, ChannelHealth } from './base';

export const xueqiuChannel: Channel = {
  id: 'xueqiu',
  canHandle(url: string): boolean { return /xueqiu\.com/i.test(url); },
  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://xueqiu.com', { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
      return resp.ok ? { status: 'ok', message: 'Xueqiu is reachable (cookie needed)' } : { status: 'warn', message: `Xueqiu returned ${resp.status}` };
    } catch (err) { return { status: 'error', message: `Xueqiu error: ${err instanceof Error ? err.message : 'Unknown'}` }; }
  },
  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    return { title: 'Xueqiu', content: `Query: ${query}\nNote: Xueqiu requires authentication cookies for stock data. Configure in Settings.`, url: 'https://xueqiu.com' };
  },
};
