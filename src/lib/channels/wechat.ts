import type { Channel, ChannelHealth } from './base';
import { JINA_READER_URL } from '@/lib/constants';

export const wechatChannel: Channel = {
  id: 'wechat',

  canHandle(url: string): boolean {
    return /mp\.weixin\.qq\.com|weixin\.qq\.com/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://mp.weixin.qq.com', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)' },
        signal: AbortSignal.timeout(10000),
      });
      return resp.ok
        ? { status: 'ok', message: 'WeChat articles platform is reachable' }
        : { status: 'warn', message: `WeChat returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `WeChat error: ${err instanceof Error ? err.message : 'Unknown'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    // WeChat articles can be fetched via Jina Reader
    const url = query.startsWith('http')
      ? query
      : `https://mp.weixin.qq.com/s/${query}`;

    try {
      const resp = await fetch(`${JINA_READER_URL}${url}`, {
        headers: { Accept: 'text/plain', 'X-Return-Format': 'html' },
        signal: AbortSignal.timeout(30000),
      });
      if (resp.ok) {
        const content = await resp.text();
        if (content.length > 50) {
          return { title: `WeChat Article: ${query}`, content, url };
        }
      }
    } catch {
      // Jina failed
    }

    return { title: 'WeChat Article', content: `Failed to fetch WeChat article: ${url}`, url };
  },
};
