import type { Channel, ChannelHealth } from './base';
import { JINA_READER_URL } from '@/lib/constants';

export const xiaoyuzhouChannel: Channel = {
  id: 'xiaoyuzhou',

  canHandle(url: string): boolean {
    return /xiaoyuzhoufm\.com|xiaoyuzhou/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://www.xiaoyuzhoufm.com', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)' },
        signal: AbortSignal.timeout(10000),
      });
      return resp.ok
        ? { status: 'ok', message: 'XiaoYuZhou is reachable' }
        : { status: 'warn', message: `XHS returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `XiaoYuZhou error: ${err instanceof Error ? err.message : 'Unknown'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    // Use Jina Reader to fetch podcast page content
    const isUrl = query.startsWith('http') || /xiaoyuzhoufm\.com/i.test(query);
    const url = isUrl
      ? (query.startsWith('http') ? query : `https://${query}`)
      : `https://www.xiaoyuzhoufm.com/search?q=${encodeURIComponent(query)}`;

    try {
      const resp = await fetch(`${JINA_READER_URL}${url}`, {
        headers: { Accept: 'text/plain', 'X-Return-Format': 'html' },
        signal: AbortSignal.timeout(30000),
      });
      if (resp.ok) {
        const content = await resp.text();
        if (content.length > 50) {
          return { title: `XiaoYuZhou: ${query}`, content, url };
        }
      }
    } catch {
      // Jina failed
    }

    // Fallback: fetch from XiaoYuZhou API for popular podcasts
    try {
      const apiResp = await fetch('https://www.xiaoyuzhoufm.com/api/v1/podcast/toplist?page=1&pageSize=10', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)' },
        signal: AbortSignal.timeout(15000),
      });
      if (apiResp.ok) {
        const data = await apiResp.json();
        const podcasts = data?.data?.podcasts || data?.data || [];
        if (Array.isArray(podcasts) && podcasts.length > 0) {
          const content = podcasts.slice(0, 10).map((p: { title: string; description: string; author?: string }, i: number) =>
            `${i + 1}. **${p.title}**${p.author ? ` by ${p.author}` : ''}\n   ${p.description?.substring(0, 150) || ''}`
          ).join('\n\n');
          return { title: 'XiaoYuZhou Popular Podcasts', content, url: 'https://www.xiaoyuzhoufm.com' };
        }
      }
    } catch {
      // API failed too
    }

    return { title: 'XiaoYuZhou', content: `Failed to fetch XiaoYuZhou content for: ${query}`, url };
  },
};
