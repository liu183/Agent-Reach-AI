import type { Channel, ChannelHealth } from './base';

export const xiaoyuzhouChannel: Channel = {
  id: 'xiaoyuzhou',
  canHandle(url: string): boolean { return /xiaoyuzhoufm\.com|xiaoyuzhou/i.test(url); },
  async check(): Promise<{ status: ChannelHealth; message: string }> {
    return { status: 'unknown', message: 'XiaoYuZhou requires Groq API key for podcast transcription' };
  },
  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    return { title: 'XiaoYuZhou', content: `Query: ${query}\nNote: Podcast transcription requires Groq Whisper API key. Configure in Settings.`, url: 'https://www.xiaoyuzhoufm.com' };
  },
};
