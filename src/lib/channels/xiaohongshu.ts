import type { Channel, ChannelHealth } from './base';
import { JINA_READER_URL } from '@/lib/constants';

export const xiaohongshuChannel: Channel = {
  id: 'xiaohongshu',

  canHandle(url: string): boolean {
    return /xiaohongshu\.com|xhslink\.com/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://www.xiaohongshu.com/explore', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)' },
        signal: AbortSignal.timeout(10000),
      });
      return resp.ok
        ? { status: 'ok', message: 'XiaoHongShu is reachable' }
        : { status: 'warn', message: `XHS returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `XHS error: ${err instanceof Error ? err.message : 'Unknown'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    // Use Jina Reader to fetch XiaoHongShu content
    const isUrl = query.startsWith('http') || /xiaohongshu\.com/i.test(query);
    const url = isUrl
      ? (query.startsWith('http') ? query : `https://${query}`)
      : `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(query)}`;

    try {
      const resp = await fetch(`${JINA_READER_URL}${url}`, {
        headers: { Accept: 'text/plain', 'X-Return-Format': 'html' },
        signal: AbortSignal.timeout(30000),
      });
      if (resp.ok) {
        const content = await resp.text();
        if (content.length > 50) {
          return { title: `XiaoHongShu: ${query}`, content, url };
        }
      }
    } catch {
      // Jina Reader failed
    }

    // Fallback: use explore page
    try {
      const resp = await fetch(`${JINA_READER_URL}https://www.xiaohongshu.com/explore`, {
        headers: { Accept: 'text/plain', 'X-Return-Format': 'html' },
        signal: AbortSignal.timeout(30000),
      });
      if (resp.ok) {
        const content = await resp.text();
        if (content.length > 50) {
          return { title: 'XiaoHongShu Explore', content, url: 'https://www.xiaohongshu.com/explore' };
        }
      }
    } catch {
      // fallback failed
    }

    return { title: 'XiaoHongShu', content: `Failed to fetch XiaoHongShu content for: ${query}`, url };
  },
};
