import { db } from '@/lib/db';
import { CHANNELS } from '@/lib/constants';

export { db };

// Default user ID for single-user mode
const DEFAULT_USER_ID = 'default-user';

export { DEFAULT_USER_ID };

export async function ensureDefaultUser(): Promise<string> {
  const user = await db.user.upsert({
    where: { email: 'agent@reach.local' },
    update: {},
    create: { email: 'agent@reach.local', name: 'Agent Reach User' },
  });
  return user.id;
}

// Seed sample data if database is empty
export async function seedIfEmpty(userId: string) {
  const reportCount = await db.report.count({ where: { userId } });
  if (reportCount > 0) return;

  // Seed all channel configs with enabled status
  for (const ch of CHANNELS) {
    await db.channelConfig.upsert({
      where: {
        id_userId_channel: { userId, channel: ch.id },
      },
      create: {
        userId,
        channel: ch.id,
        platform: ch.id,
        tier: ch.tier,
        enabled: true,
        healthStatus: 'unknown',
      },
      update: {},
    });
  }

  // Seed sample reports (demo data, clearly marked)
  await db.report.createMany({
    data: [
      {
        userId,
        title: '[Demo] GitHub Trending: Top 5 Repositories This Week',
        content: `# GitHub Trending Report\n\n## 1. langchain/langchain\nA framework for developing applications powered by language models.\n\n- Stars: 85,200\n- Language: Python\n- Key Features: Chain composition, memory, agents\n\n## 2. vercel/next.js\nThe React Framework for the Web.\n\n- Stars: 120,000\n- Language: TypeScript\n- New: Server Actions, Turbopack\n\n## 3. ollama/ollama\nGet up and running with Llama 3 and other LLMs locally.\n\n- Stars: 65,000\n- Language: Go\n- Supports: Llama 3, Mistral, Gemma\n\n## 4. anthropics/anthropic-cookbook\nExamples and guides for using Claude.\n\n- Stars: 12,300\n- Language: Python\n\n## 5. shadcn-ui/ui\nBeautifully designed components built with Radix and Tailwind CSS.\n\n- Stars: 72,000\n- Language: TypeScript`,
        summary: 'Top 5 trending GitHub repos: LangChain, Next.js, Ollama, Anthropic Cookbook, and shadcn/ui.',
        source: JSON.stringify(['https://github.com/trending']),
        channel: 'github',
        status: 'completed',
        wordCount: 320,
      },
      {
        userId,
        title: '[Demo] V2EX Hot Topics Daily Digest',
        content: `# V2EX Hot Topics\n\n## 1. How to survive as a developer in 2025\nDiscussion about career strategies and technology trends for software engineers.\n\n## 2. Share your home office setup\nCommunity members sharing their remote work environments and equipment recommendations.\n\n## 3. macOS Sequoia review after 3 months\nIn-depth review of macOS Sequoia features, bugs, and overall experience.\n\n## 4. Best practices for API design\nDiscussion about REST vs GraphQL and modern API design patterns.\n\n## 5. Useful Chrome Extensions\nCommunity recommendations for productivity-focused browser extensions.`,
        summary: 'Daily V2EX digest: developer career tips, home office setups, macOS review, API design, and Chrome extensions.',
        source: JSON.stringify(['https://www.v2ex.com']),
        channel: 'v2ex',
        status: 'completed',
        wordCount: 250,
      },
      {
        userId,
        title: '[Demo] Reddit r/programming: Weekly Highlights',
        content: `# r/programming Weekly Highlights\n\n## Hot Discussions\n\n### What are you working on? (April 2025)\nCommunity project showcase with over 500 responses covering AI tools, CLI utilities, and web frameworks.\n\n### Rust vs Go for backend services in 2025\nComparative analysis with benchmarks. Consensus: Rust for performance-critical, Go for rapid development.\n\n### The state of WebAssembly\nWASM adoption is growing beyond browsers: edge computing, plugins, and serverless functions.\n\n### PostgreSQL 17 new features\nSummary of PG17 improvements: logical replication enhancements, improved performance, and new SQL syntax.`,
        summary: 'Reddit programming highlights: community projects, Rust vs Go debate, WebAssembly growth, PostgreSQL 17.',
        source: JSON.stringify(['https://reddit.com/r/programming']),
        channel: 'reddit',
        status: 'completed',
        wordCount: 280,
      },
      {
        userId,
        title: '[Demo] Bilibili: AI Tutorial Series Collection',
        content: `# Bilibili AI Tutorial Series\n\n## Popular AI Learning Content\n\n### 1. AI Fundamentals - Complete Series\nA comprehensive 30-episode series covering machine learning fundamentals.\n- Views: 2.3M\n- Episodes: 30\n\n### 2. LLM Application Development\nPractical guide to building applications with large language models.\n- Views: 890K\n- Focus: LangChain, RAG, Fine-tuning\n\n### 3. AI Art Creation with Stable Diffusion\nTutorial on creating AI art with Stable Diffusion.\n- Views: 1.5M\n- Tools: ComfyUI, Automatic1111`,
        summary: 'Bilibili AI tutorials: ML fundamentals, LLM development, and AI art creation.',
        source: JSON.stringify(['https://www.bilibili.com']),
        channel: 'bilibili',
        status: 'completed',
        wordCount: 200,
      },
    ],
  });

  // Seed sample scheduled tasks — all marked as 'never' since they haven't actually run
  await db.scheduledTask.createMany({
    data: [
      {
        userId,
        name: 'Daily GitHub Trending Report',
        description: 'Collect trending repositories from GitHub every day',
        cronExpr: '0 9 * * *',
        repeatType: 'daily',
        prompt: 'Summarize the top 5 trending repositories on GitHub today, including their star counts, languages, and key features.',
        channels: JSON.stringify(['github']),
        enabled: true,
        nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastStatus: 'never',
      },
      {
        userId,
        name: 'V2EX Hot Topics Scan',
        description: 'Scan V2EX hot topics twice daily',
        cronExpr: '0 8,20 * * *',
        repeatType: 'daily',
        prompt: 'Summarize the top 10 hot topics from V2EX, including discussion highlights and community opinions.',
        channels: JSON.stringify(['v2ex']),
        enabled: true,
        nextRunAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        lastStatus: 'never',
      },
      {
        userId,
        name: 'Weekly Tech News Roundup',
        description: 'Collect tech news from multiple sources weekly',
        cronExpr: '0 10 * * 1',
        repeatType: 'weekly',
        prompt: 'Compile a weekly tech news roundup from V2EX, Reddit r/programming, and Hacker News. Focus on AI, web development, and programming tools.',
        channels: JSON.stringify(['v2ex', 'reddit', 'web']),
        enabled: true,
        nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastStatus: 'never',
      },
    ],
  });

  // Seed memory entries (useful reference data for the agent)
  await db.memoryEntry.createMany({
    data: [
      {
        userId,
        category: 'rule',
        level: 0,
        title: 'Core Operating Principles',
        content: '## Agent Reach Operating Principles\n\n1. **Always summarize, never copy**: Generate original summaries from collected content\n2. **Verify before reporting**: Cross-reference information from multiple sources\n3. **Respect rate limits**: Space out requests to avoid overloading APIs\n4. **Privacy first**: Never store raw personal data from collected content',
        tags: JSON.stringify(['meta', 'rules', 'core']),
        pinned: true,
      },
      {
        userId,
        category: 'insight',
        level: 1,
        title: 'Effective Web Content Summarization',
        content: '## Best Practices for Web Summarization\n\n- Focus on the main content area (article, main element)\n- Remove navigation, ads, and boilerplate\n- Preserve code blocks and technical details\n- Maintain the original structure (headings, lists)\n- Keep URLs as references',
        tags: JSON.stringify(['insight', 'summarization', 'best-practices']),
        pinned: false,
      },
      {
        userId,
        category: 'fact',
        level: 2,
        title: 'Platform API Rate Limits',
        content: '## API Rate Limits Reference\n\n| Platform | Limit | Window |\n|----------|-------|--------|\n| GitHub | 60 | 1 hour (unauthenticated) |\n| Reddit | 100 | 1 minute |\n| V2EX | ~120 | 1 hour |\n| Jina Reader | unlimited | Free tier |\n| Bilibili | 100 | 1 minute |',
        tags: JSON.stringify(['fact', 'api', 'rate-limits']),
        pinned: true,
      },
      {
        userId,
        category: 'sop',
        level: 3,
        title: 'Channel Health Check Procedure',
        content: '## Standard Health Check SOP\n\n1. Send a test request to the channel API\n2. Verify response status code (200/OK)\n3. Check response contains expected data structure\n4. Measure response time (< 10s threshold)\n5. Update health status in database\n6. Log result to ChannelLog table',
        tags: JSON.stringify(['sop', 'health-check', 'monitoring']),
        pinned: false,
      },
    ],
  });
}
