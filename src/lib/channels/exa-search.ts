import type { Channel, ChannelHealth } from './base';

export const exaSearchChannel: Channel = {
  id: 'exa-search',
  canHandle(): boolean { return false; },
  async check(): Promise<{ status: ChannelHealth; message: string }> {
    return { status: 'unknown', message: 'Exa Search requires API key for AI-powered search' };
  },
  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    return { title: 'Exa Search', content: `Query: ${query}\nNote: Exa Search requires API key. Configure in Settings.`, url: 'https://exa.ai' };
  },
};
