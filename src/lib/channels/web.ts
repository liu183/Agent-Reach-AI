import type { Channel, ChannelHealth } from './base';
import { JINA_READER_URL } from '@/lib/constants';

export const webChannel: Channel = {
  id: 'web',

  canHandle(url: string): boolean {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch(`${JINA_READER_URL}https://example.com`, {
        headers: { Accept: 'text/plain' },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        return { status: 'ok', message: 'Jina Reader API is reachable' };
      }
      return { status: 'warn', message: `Jina Reader returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `Jina Reader unavailable: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    const resp = await fetch(`${JINA_READER_URL}${query}`, {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) throw new Error(`Failed to fetch ${query}: HTTP ${resp.status}`);
    const content = await resp.text();
    return { title: `Web: ${query}`, content, url: query };
  },
};
