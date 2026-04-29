import type { Channel, ChannelHealth } from './base';

export const bilibiliChannel: Channel = {
  id: 'bilibili',
  canHandle(url: string): boolean { return /bilibili\.com|b23\.tv/i.test(url); },
  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://api.bilibili.com/x/web-interface/nav', { signal: AbortSignal.timeout(10000) });
      if (resp.ok) { const d = await resp.json(); return { status: d?.code === 0 ? 'ok' : 'warn', message: `Bilibili API: ${d?.message || 'OK'}` }; }
      return { status: 'warn', message: `Bilibili returned ${resp.status}` };
    } catch (err) { return { status: 'error', message: `Bilibili error: ${err instanceof Error ? err.message : 'Unknown'}` }; }
  },
  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    try {
      const resp = await fetch(`https://api.bilibili.com/x/web-interface/search/type?keyword=${encodeURIComponent(query)}&page=1`, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const results = data?.data?.results?.slice(0, 5) || [];
      const content = results.map((r: { title: string; description: string; bvid: string }, i: number) => `${i + 1}. ${r.title.replace(/<[^>]*>/g, '')}\n   ${r.description?.substring(0, 100) || ''}\n   https://www.bilibili.com/video/${r.bvid}`).join('\n\n');
      return { title: `Bilibili: ${query}`, content: content || 'No results found', url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(query)}` };
    } catch (err) { return { title: 'Bilibili', content: `Error: ${err instanceof Error ? err.message : 'Unknown'}`, url: 'https://www.bilibili.com' }; }
  },
};
