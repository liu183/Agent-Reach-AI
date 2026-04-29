import type { Channel, ChannelHealth } from './base';

export const redditChannel: Channel = {
  id: 'reddit',

  canHandle(url: string): boolean {
    return /reddit\.com/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://www.reddit.com/r/popular.json?limit=1', {
        headers: { 'User-Agent': 'AgentReach/2.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        const data = await resp.json();
        return { status: 'ok', message: `Reddit API reachable (${data?.data?.children?.length ?? 0} posts loaded)` };
      }
      return { status: 'warn', message: `Reddit returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `Reddit unavailable: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    try {
      const subreddit = query.includes('r/') ? query : `r/${query.replace(/^\/?r\//, '')}`;
      const resp = await fetch(`https://www.reddit.com/${subreddit}/hot.json?limit=10`, {
        headers: { 'User-Agent': 'AgentReach/2.0' },
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) throw new Error(`Reddit API error: ${resp.status}`);
      const data = await resp.json();
      const posts = (data?.data?.children ?? []).slice(0, 10).map((p: { data: { title: string; selftext: string; score: number; url: string } }) => ({
        title: p.data.title,
        score: p.data.score,
        url: p.data.url,
        snippet: p.data.selftext?.substring(0, 200) || '',
      }));
      const content = posts.map((p: { title: string; score: number; url: string; snippet: string }, i: number) => `${i + 1}. **${p.title}** (Score: ${p.score})\n   ${p.snippet}\n   ${p.url}`).join('\n\n');
      return { title: `Reddit: ${subreddit}`, content: content || 'No posts found', url: `https://www.reddit.com/${subreddit}` };
    } catch (err) {
      return { title: 'Reddit', content: `Error fetching subreddit: ${err instanceof Error ? err.message : 'Unknown'}`, url: 'https://www.reddit.com' };
    }
  },
};
