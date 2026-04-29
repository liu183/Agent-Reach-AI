import type { Channel, ChannelHealth } from './base';

export const githubChannel: Channel = {
  id: 'github',

  canHandle(url: string): boolean {
    return /github\.com/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      const resp = await fetch('https://api.github.com', {
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        return { status: 'ok', message: 'GitHub API is reachable' };
      }
      return { status: 'warn', message: `GitHub API returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `GitHub unavailable: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    try {
      const resp = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=5&sort=stars`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
      const data = await resp.json();
      const repos = (data?.items ?? []).slice(0, 5).map((r: { full_name: string; description: string; stargazers_count: number; html_url: string; language: string }) => ({
        name: r.full_name,
        desc: r.description || 'No description',
        stars: r.stargazers_count,
        lang: r.language || 'Unknown',
        url: r.html_url,
      }));
      const content = repos.map((r: { name: string; desc: string; stars: number; lang: string; url: string }, i: number) => `${i + 1}. **${r.name}** ⭐ ${r.stars.toLocaleString()}\n   ${r.desc}\n   Language: ${r.lang}\n   ${r.url}`).join('\n\n');
      return { title: `GitHub Search: ${query}`, content, url: `https://github.com/search?q=${encodeURIComponent(query)}` };
    } catch (err) {
      return { title: 'GitHub', content: `Error: ${err instanceof Error ? err.message : 'Unknown'}`, url: 'https://github.com' };
    }
  },
};
