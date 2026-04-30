import type { Channel, ChannelHealth } from './base';
import { JINA_READER_URL } from '@/lib/constants';
import { getChannelAuthConfig } from './config-provider';

export const twitterChannel: Channel = {
  id: 'twitter',

  canHandle(url: string): boolean {
    return /twitter\.com|x\.com/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://x.com', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)' },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok || resp.status === 200) {
        return { status: 'ok', message: 'X/Twitter is reachable' };
      }
      return { status: 'warn', message: `X/Twitter returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `X/Twitter unavailable: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    const isUrl = query.startsWith('http') || /x\.com|twitter\.com/i.test(query);
    const url = isUrl
      ? (query.startsWith('http') ? query : `https://${query}`)
      : `https://x.com/search?q=${encodeURIComponent(query)}`;

    // --- Attempt 1: Direct API call with cookie from DB config ---
    const authConfig = await getChannelAuthConfig('twitter');
    const cookie = authConfig?.cookie as string | undefined;

    if (cookie) {
      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)',
            'Cookie': cookie,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(30000),
        });
        if (resp.ok) {
          const html = await resp.text();
          // Extract useful content from the HTML (strip tags roughly)
          const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (text.length > 100) {
            return { title: `Twitter/X: ${isUrl ? query : query}`, content: text.substring(0, 30000), url };
          }
        }
      } catch {
        // Direct API call failed, fall through to Jina Reader
      }
    }

    // --- Attempt 2: Jina Reader fallback ---
    try {
      const resp = await fetch(`${JINA_READER_URL}${url}`, {
        headers: { Accept: 'text/plain', 'X-Return-Format': 'html' },
        signal: AbortSignal.timeout(30000),
      });
      if (resp.ok) {
        const content = await resp.text();
        if (content.length > 50) {
          return { title: `Twitter/X: ${isUrl ? query : query}`, content, url };
        }
      }
    } catch {
      // Jina Reader failed
    }

    return { title: 'Twitter/X', content: `Failed to fetch X/Twitter content for: ${query}`, url };
  },
};
