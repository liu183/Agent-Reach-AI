import type { Channel, ChannelHealth } from './base';

export const rssChannel: Channel = {
  id: 'rss',

  canHandle(url: string): boolean {
    return /\.(xml|rss|atom|feed)/i.test(url) || /\/(rss|feed|atom)/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://hnrss.org/frontpage', { signal: AbortSignal.timeout(10000) });
      if (resp.ok) {
        return { status: 'ok', message: 'RSS parsing is functional' };
      }
      return { status: 'warn', message: `RSS test feed returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `RSS unavailable: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    const feedUrl = query.startsWith('http') ? query : `https://${query}`;
    try {
      const resp = await fetch(feedUrl, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) throw new Error(`Feed returned ${resp.status}`);
      const text = await resp.text();
      // Simple XML parsing for RSS items
      const items = text.match(/<item>[\s\S]*?<\/item>/gi) || [];
      const parsed = items.slice(0, 10).map((item: string) => {
        const title = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i)?.[1] || item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i)?.[2] || 'Untitled';
        const link = item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '';
        const desc = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/i)?.[1] || '';
        return { title: title.replace(/<[^>]*>/g, ''), link, desc: desc.replace(/<[^>]*>/g, '').substring(0, 200) };
      });
      const content = parsed.map((p: { title: string; link: string; desc: string }, i: number) => `${i + 1}. **${p.title}**\n   ${p.desc}\n   ${p.link}`).join('\n\n');
      return { title: `RSS Feed: ${feedUrl}`, content: content || 'No items found in feed', url: feedUrl };
    } catch (err) {
      return { title: 'RSS', content: `Error fetching feed: ${err instanceof Error ? err.message : 'Unknown'}`, url: feedUrl };
    }
  },
};
