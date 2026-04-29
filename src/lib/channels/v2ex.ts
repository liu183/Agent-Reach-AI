import type { Channel, ChannelHealth } from './base';

export const v2exChannel: Channel = {
  id: 'v2ex',
  canHandle(url: string): boolean { return /v2ex\.com/i.test(url); },
  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://www.v2ex.com/api/topics/hot.json', { signal: AbortSignal.timeout(10000) });
      if (resp.ok) { const d = await resp.json(); return { status: 'ok', message: `V2EX API OK (${d?.length ?? 0} hot topics)` }; }
      return { status: 'warn', message: `V2EX returned ${resp.status}` };
    } catch (err) { return { status: 'error', message: `V2EX error: ${err instanceof Error ? err.message : 'Unknown'}` }; }
  },
  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    try {
      const resp = await fetch('https://www.v2ex.com/api/topics/hot.json', { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const items = (Array.isArray(data) ? data : []).slice(0, 10).map((t: { title: string; content: string; url: string; replies: number; node: { name: string } }) => ({
        title: t.title, node: t.node?.name || '', replies: t.replies, url: t.url, snippet: (t.content || '').replace(/<[^>]*>/g, '').substring(0, 150),
      }));
      const content = items.map((t: { title: string; node: string; replies: number; snippet: string; url: string }, i: number) => `${i + 1}. **${t.title}** [${t.node}] (${t.replies} replies)\n   ${t.snippet}\n   ${t.url}`).join('\n\n');
      return { title: 'V2EX Hot Topics', content: content || 'No topics found', url: 'https://www.v2ex.com' };
    } catch (err) { return { title: 'V2EX', content: `Error: ${err instanceof Error ? err.message : 'Unknown'}`, url: 'https://www.v2ex.com' }; }
  },
};
