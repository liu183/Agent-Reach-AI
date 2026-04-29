import type { Channel, ChannelHealth } from './base';

export const youtubeChannel: Channel = {
  id: 'youtube',

  canHandle(url: string): boolean {
    return /youtube\.com|youtu\.be/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://www.youtube.com', {
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
    // Extract video ID if it's a URL
    const videoIdMatch = query.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      return { title: `YouTube Video: ${videoId}`, content: `Video URL: ${url}\nNote: Full transcript extraction requires yt-dlp. Basic metadata available.`, url };
    }
    return { title: 'YouTube Search', content: `Search query: ${query}\nNote: YouTube search requires yt-dlp for transcript extraction.`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}` };
  },
};
