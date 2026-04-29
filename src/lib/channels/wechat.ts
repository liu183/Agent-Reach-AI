import type { Channel, ChannelHealth } from './base';

export const wechatChannel: Channel = {
  id: 'wechat',
  canHandle(url: string): boolean { return /mp\.weixin\.qq\.com|weixin\.qq\.com/i.test(url); },
  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://mp.weixin.qq.com', { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
      return resp.ok ? { status: 'ok', message: 'WeChat articles platform is reachable' } : { status: 'warn', message: `WeChat returned ${resp.status}` };
    } catch (err) { return { status: 'error', message: `WeChat error: ${err instanceof Error ? err.message : 'Unknown'}` }; }
  },
  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    const url = query.startsWith('http') ? query : `https://mp.weixin.qq.com/s/${query}`;
    return { title: 'WeChat Article', content: `Article URL: ${url}\nNote: WeChat articles can be fetched directly via URL using Jina Reader.`, url };
  },
};
