import type { Channel, ChannelHealth } from './base';

export const xiaohongshuChannel: Channel = {
  id: 'xiaohongshu',
  canHandle(url: string): boolean { return /xiaohongshu\.com|xhslink\.com/i.test(url); },
  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://www.xiaohongshu.com', { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
      return resp.ok ? { status: 'ok', message: 'XiaoHongShu is reachable (cookie needed for content)' } : { status: 'warn', message: `XHS returned ${resp.status}` };
    } catch (err) { return { status: 'error', message: `XHS error: ${err instanceof Error ? err.message : 'Unknown'}` }; }
  },
  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    return { title: 'XiaoHongShu', content: `Query: ${query}\nNote: XiaoHongShu requires authentication cookies. Configure in Settings.`, url: 'https://www.xiaohongshu.com' };
  },
};
