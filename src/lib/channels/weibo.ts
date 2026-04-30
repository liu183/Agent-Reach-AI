import type { Channel, ChannelHealth } from './base';

export const weiboChannel: Channel = {
  id: 'weibo',

  canHandle(url: string): boolean {
    return /weibo\.com|weibo\.cn/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot', {
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        const data = await resp.json();
        const count = data?.data?.cards?.length ?? 0;
        return { status: 'ok', message: `Weibo API OK (${count} hot topics loaded)` };
      }
      return { status: 'warn', message: `Weibo returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `Weibo error: ${err instanceof Error ? err.message : 'Unknown'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    try {
      // Fetch Weibo hot search topics
      const resp = await fetch('https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot', {
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const cards = data?.data?.cards?.[0]?.card_group || [];
      const topics = cards.slice(0, 15).map((item: { desc: string; desc_extr: string }) => ({
        title: item.desc,
        hot: item.desc_extr || '',
      }));
      const content = topics.map((t: { title: string; hot: string }, i: number) =>
        `${i + 1}. **${t.title}**${t.hot ? ` (${t.hot})` : ''}`
      ).join('\n');
      return { title: 'Weibo Hot Search', content: content || 'No hot topics found', url: 'https://weibo.com/hot/search' };
    } catch (err) {
      return { title: 'Weibo', content: `Error fetching Weibo: ${err instanceof Error ? err.message : 'Unknown'}`, url: 'https://weibo.com' };
    }
  },
};
