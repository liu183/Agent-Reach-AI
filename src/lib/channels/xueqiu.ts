import type { Channel, ChannelHealth } from './base';

export const xueqiuChannel: Channel = {
  id: 'xueqiu',

  canHandle(url: string): boolean {
    return /xueqiu\.com/i.test(url);
  },

  async check(): Promise<{ status: ChannelHealth; message: string }> {
    try {
      // Xueqiu requires a token from their page first
      const initResp = await fetch('https://xueqiu.com/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!initResp.ok) {
        return { status: 'warn', message: `Xueqiu returned ${initResp.status}` };
      }

      // Try the status page which doesn't need auth
      const resp = await fetch('https://xueqiu.com/statuses/hot/listV2.json?since_id=-1&max_id=-1&size=5', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)',
          'Cookie': initResp.headers.get('set-cookie') || '',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        return { status: 'ok', message: 'Xueqiu API reachable' };
      }
      return { status: 'warn', message: `Xueqiu API returned ${resp.status}` };
    } catch (err) {
      return { status: 'error', message: `Xueqiu error: ${err instanceof Error ? err.message : 'Unknown'}` };
    }
  },

  async collect(query: string): Promise<{ title: string; content: string; url: string }> {
    try {
      // Step 1: Get session token from xueqiu main page
      const initResp = await fetch('https://xueqiu.com/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)' },
        signal: AbortSignal.timeout(10000),
      });

      // Extract cookies from response
      const cookies = initResp.headers.get('set-cookie') || '';

      // Step 2: Fetch hot stock discussions
      const searchUrl = query && query.trim() && !query.includes('xueqiu')
        ? `https://xueqiu.com/query/v1/symbol/search/status.json?keyword=${encodeURIComponent(query)}&count=10&comment=0&symbol=&source=all&sort=time&page=1`
        : 'https://xueqiu.com/statuses/hot/listV2.json?since_id=-1&max_id=-1&size=15';

      const resp = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/2.0)',
          'Cookie': cookies,
          'Origin': 'https://xueqiu.com',
          'Referer': 'https://xueqiu.com/',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      // Parse hot topics
      const items = data?.items || data?.list || [];
      const content = items.slice(0, 10).map((item: { title: string; text: string; description: string; user?: { screen_name: string }; created_at?: string }, i: number) => {
        const title = item.title || item.text?.substring(0, 100) || item.description?.substring(0, 100) || 'Untitled';
        const author = item.user?.screen_name || '';
        return `${i + 1}. **${title}**${author ? ` - ${author}` : ''}`;
      }).join('\n\n');

      return {
        title: `Xueqiu: ${query || 'Hot Topics'}`,
        content: content || 'No content found from Xueqiu',
        url: 'https://xueqiu.com',
      };
    } catch (err) {
      return { title: 'Xueqiu', content: `Error fetching Xueqiu: ${err instanceof Error ? err.message : 'Unknown'}`, url: 'https://xueqiu.com' };
    }
  },
};
