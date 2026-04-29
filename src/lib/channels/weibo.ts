import type { Channel, ChannelHealth } from './base';

export const weiboChannel: Channel = {
  id: 'weibo',
  canHandle(url: string): boolean { return /weibo\.com|weibo\.cn/i.test(url); },
  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot', { signal: AbortSignal.timeout(10000) });
      if (resp.ok) { return { status: 'ok', message: 'Weibo API reachable' }; }
      return { status: 'warn', message: `Weibo returned ${resp.status}` };
    } catch (err) { return { status: 'error', message: `Weibo error: ${err instanceof Error ? err.message : 'Unknown'}` }; }
  },
  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    return { title: 'Weibo', content: `Query: ${query}\nNote: Weibo hot topics can be fetched via API. Configure search parameters.`, url: 'https://weibo.com' };
  },
};
