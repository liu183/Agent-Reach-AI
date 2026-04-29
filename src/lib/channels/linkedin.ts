import type { Channel, ChannelHealth } from './base';

export const linkedinChannel: Channel = {
  id: 'linkedin',
  canHandle(url: string): boolean { return /linkedin\.com/i.test(url); },
  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://www.linkedin.com', { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
      return resp.ok ? { status: 'ok', message: 'LinkedIn is reachable (browser auth required)' } : { status: 'warn', message: `LinkedIn returned ${resp.status}` };
    } catch (err) { return { status: 'error', message: `LinkedIn error: ${err instanceof Error ? err.message : 'Unknown'}` }; }
  },
  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    return { title: 'LinkedIn', content: `Query: ${query}\nNote: LinkedIn requires browser-based authentication. Configure in Settings.`, url: 'https://www.linkedin.com' };
  },
};
