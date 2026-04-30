import type { Channel, ChannelHealth } from './base';
import { JINA_READER_URL } from '@/lib/constants';

export const youtubeChannel: Channel = {
  id: 'youtube',

  canHandle(url: string): boolean {
    return /youtube\.com|youtu\.be/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://www.youtube.com', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)' },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        return { status: 'ok', message: 'YouTube is reachable' };
      }
      return { status: 'warn', message: `YouTube returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `YouTube unavailable: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    // If it's a YouTube URL, use Jina Reader to extract transcript/metadata
    const isUrl = query.startsWith('http') || /youtu\.?be/i.test(query);
    if (isUrl) {
      const url = query.match(/^https?:\/\//) ? query : `https://${query}`;
      try {
        const resp = await fetch(`${JINA_READER_URL}${url}`, {
          headers: { Accept: 'text/plain', 'X-Return-Format': 'html' },
          signal: AbortSignal.timeout(30000),
        });
        if (resp.ok) {
          const content = await resp.text();
          if (content.length > 100) {
            return { title: `YouTube: ${query}`, content, url };
          }
        }
      } catch {
        // Jina failed, try direct
      }
    }

    // For search queries, use Jina Reader on YouTube search results
    const searchUrl = isUrl ? query : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    try {
      const resp = await fetch(`${JINA_READER_URL}${searchUrl}`, {
        headers: { Accept: 'text/plain', 'X-Return-Format': 'html' },
        signal: AbortSignal.timeout(30000),
      });
      if (resp.ok) {
        const content = await resp.text();
        if (content.length > 50) {
          return { title: `YouTube Search: ${query}`, content, url: searchUrl };
        }
      }
    } catch {
      // fallback
    }

    return { title: 'YouTube', content: `Failed to fetch YouTube content for: ${query}`, url: searchUrl };
  },
};
