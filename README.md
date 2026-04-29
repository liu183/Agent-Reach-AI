# Agent Reach AI

<p align="center">
  <strong>AI-Powered Multi-Platform Intelligence Agent</strong><br/>
  16+ 平台数据采集 / 自主浏览 / 智能摘要 / 定时监控 / 分层记忆
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/shadcn%2Fui-latest-black" alt="shadcn/ui"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.x-38bdf8?logo=tailwindcss" alt="Tailwind CSS 4"/>
  <img src="https://img.shields.io/badge/Prisma-6.x-2d3748?logo=prisma" alt="Prisma"/>
  <img src="https://img.shields.io/badge/NVIDIA_NIM-76b900?logo=nvidia" alt="NVIDIA NIM"/>
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License"/>
</p>

---

## Overview | 项目简介

**Agent Reach AI** 是一个基于 Next.js 全栈框架构建的 AI 智能代理平台，融合了 [Agent-Reach](https://github.com/Panniantong/Agent-Reach) 的多平台数据采集能力与 [GenericAgent](https://github.com/lsdefine/GenericAgent) 的自主浏览与定时摘要能力，完全使用 TypeScript 重写。

它能够：
- **自动采集** 16+ 主流互联网平台的内容数据
- **自主浏览** 任意网页并利用大语言模型生成结构化摘要
- **定时监控** 通过 Cron 定时任务周期性执行浏览和采集
- **分层记忆** 采用 L0-L4 五级记忆体系，持续积累和提炼知识
- **多供应商** 支持 NVIDIA NIM、OpenAI 及任何 OpenAI 兼容 API

## Features | 核心功能

### Multi-Platform Data Collection | 多平台数据采集

支持 16 个主流互联网平台，零配置或简单 API Key 即可使用：

| 平台 | 类型 | 配置级别 |
|------|------|----------|
| Web (Jina Reader) | 通用网页 | 零配置 |
| YouTube | 视频平台 | 零配置 |
| Twitter / X | 社交媒体 | API Key |
| Reddit | 社区论坛 | 零配置 |
| GitHub | 开发社区 | 零配置 |
| RSS | 订阅源 | URL 输入 |
| V2EX | 技术社区 | 零配置 |
| Bilibili | 视频平台 | Cookie |
| Xiaohongshu | 生活社区 | Cookie |
| Weibo | 社交媒体 | Cookie |
| Douyin | 短视频 | Cookie |
| LinkedIn | 职业社交 | API Key |
| Xueqiu | 财经社区 | Cookie |
| WeChat Official | 微信公众号 | Cookie |
| Xiaoyuzhou | 播客平台 | Cookie |
| Exa Search | AI 搜索 | API Key |

### Autonomous Web Browsing | 自主网页浏览

- 基于 Jina Reader API 的智能网页内容提取
- Cheerio 驱动的 HTML 智能解析与简化
- 多级回退策略确保内容获取成功率
- 实时 SSE 推送浏览进度和状态更新

### AI-Powered Summarization | AI 智能摘要

- 利用大语言模型对网页内容进行深度分析
- 自动识别页面语言，支持中英文混合内容处理
- 输出 Markdown 格式的结构化摘要报告
- 支持自定义摘要指令，灵活适应不同场景

### Scheduled Task Engine | 定时任务引擎

- 支持 Cron 表达式和多种重复模式（每日/每周/每月等）
- 任务执行状态实时追踪（运行中/成功/失败）
- 最大延迟监控，确保任务按时执行
- 一次配置，持续自动化运行

### Hierarchical Memory System | 分层记忆系统

采用五级记忆架构，实现知识的持续积累与智能管理：

| 级别 | 名称 | 说明 |
|------|------|------|
| L0 | Meta | 元认知规则，Agent 行为准则 |
| L1 | Insight | 深度洞察，跨领域的核心发现 |
| L2 | Fact | 事实知识，可验证的精确信息 |
| L3 | SOP | 标准流程，可复用的操作步骤 |
| L4 | History | 历史记录，完整的交互日志 |

### Multi-Provider LLM Support | 多供应商大模型

默认使用 NVIDIA NIM 模型服务，同时支持 OpenAI 和任何 OpenAI 兼容 API：

- **NVIDIA NIM**: Llama 3.1 Nemotron 70B/253B, Nemotron-4 340B, Qwen2.5 72B, DeepSeek-R1, Mixtral 8x22B, Gemma 2, Phi-3, CodeLlama 等 18 款模型
- **OpenAI**: GPT-4o, GPT-4o Mini, o1, o3-mini 等
- **Custom**: 任何兼容 OpenAI Chat Completions API 的服务

## Tech Stack | 技术栈

| 层级 | 技术 |
|------|------|
| **框架** | Next.js 16 (App Router) |
| **语言** | TypeScript 5.x |
| **UI 库** | shadcn/ui + Radix UI |
| **样式** | Tailwind CSS 4 |
| **状态管理** | Zustand |
| **数据表格** | TanStack Table + React Query |
| **数据库** | PostgreSQL (Prisma ORM 6.x) |
| **动画** | Framer Motion |
| **图表** | Recharts |
| **Markdown** | react-markdown + remark-gfm |
| **HTML 解析** | Cheerio |
| **定时任务** | node-cron |
| **运行时** | Bun / Node.js |

## Project Structure | 项目结构

```
Agent-Reach-AI/
├── prisma/
│   └── schema.prisma          # 8 data models (PostgreSQL)
├── src/
│   ├── app/
│   │   ├── api/               # 14 REST API routes
│   │   │   ├── agent/run/         # Agent execution
│   │   │   ├── channels/          # Channel CRUD & health check
│   │   │   ├── dashboard/stats/   # Dashboard statistics
│   │   │   ├── memory/            # Memory CRUD
│   │   │   ├── reports/           # Reports CRUD
│   │   │   ├── settings/llm/      # LLM configuration
│   │   │   └── tasks/             # Browse & Scheduled tasks
│   │   ├── layout.tsx
│   │   ├── page.tsx              # SPA with view routing
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                  # 40+ shadcn/ui components
│   │   ├── layout/              # Sidebar, Header, Theme toggle
│   │   ├── views/               # 9 page views
│   │   ├── channels/            # Channel cards, config dialogs
│   │   ├── dashboard/           # Stats, charts, timeline
│   │   ├── reports/             # Report list & detail
│   │   ├── tasks/               # Task forms & lists
│   │   ├── browse/              # Live browse panel
│   │   ├── memory/              # Memory viewer
│   │   └── settings/            # Settings panel
│   ├── lib/
│   │   ├── agent/
│   │   │   ├── engine.ts        # Agent execution loop
│   │   │   ├── llm.ts           # Multi-provider LLM client
│   │   │   └── html-parser.ts   # Smart HTML simplification
│   │   ├── channels/
│   │   │   ├── base.ts          # Channel interface
│   │   │   ├── registry.ts      # Channel registry (16 channels)
│   │   │   ├── web.ts           # Web/Jina Reader
│   │   │   ├── youtube.ts       # YouTube
│   │   │   ├── twitter.ts       # Twitter/X
│   │   │   ├── reddit.ts        # Reddit
│   │   │   ├── github.ts        # GitHub
│   │   │   ├── rss.ts           # RSS Feeds
│   │   │   ├── v2ex.ts          # V2EX
│   │   │   ├── bilibili.ts      # Bilibili
│   │   │   ├── xiaohongshu.ts   # Xiaohongshu
│   │   │   ├── weibo.ts         # Weibo
│   │   │   ├── douyin.ts        # Douyin
│   │   │   ├── linkedin.ts      # LinkedIn
│   │   │   ├── xueqiu.ts        # Xueqiu
│   │   │   ├── wechat.ts        # WeChat Official
│   │   │   ├── xiaoyuzhou.ts    # Xiaoyuzhou
│   │   │   └── exa-search.ts    # Exa AI Search
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── types.ts             # TypeScript type definitions
│   │   └── utils.ts             # Utility functions
│   ├── hooks/                   # Custom React hooks
│   └── store/
│       └── app-store.ts         # Zustand global state
├── vercel.json                  # Vercel deployment config
├── next.config.ts               # Next.js configuration
├── tailwind.config.ts           # Tailwind CSS configuration
└── package.json
```

## Database Schema | 数据库模型

项目使用 Prisma ORM 定义了 8 个核心数据模型：

- **User** - 用户账户与配置
- **ChannelConfig** - 平台通道配置（API Key、Cookie 等）
- **ScheduledTask** - 定时浏览任务（Cron 表达式、频道选择）
- **BrowseTask** - 一次性浏览任务（URL、进度追踪）
- **Report** - AI 生成的摘要报告（Markdown 格式）
- **MemoryEntry** - Agent 分层记忆条目（L0-L4）
- **ChannelLog** - 平台采集日志
- **AgentSession** - Agent 会话执行日志

## Getting Started | 快速开始

### Prerequisites

- Node.js 18+ 或 Bun
- PostgreSQL 数据库
- NVIDIA NIM API Key（[免费申请](https://build.nvidia.com/)）或 OpenAI API Key

### Installation

```bash
# Clone the repository
git clone https://github.com/liu183/Agent-Reach-AI.git
cd Agent-Reach-AI

# Install dependencies
bun install

# Configure environment variables
cp .env.example .env
# Edit .env and fill in your DATABASE_URL and API keys

# Initialize database
bun run db:push
bun run db:generate

# Start development server
bun run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/agent_reach"

# LLM Provider (optional, defaults to NVIDIA NIM)
NVIDIA_API_KEY="nvapi-your-nvidia-api-key"
OPENAI_API_KEY="sk-your-openai-api-key"
```

### Development

```bash
# Run dev server on port 3000
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Database operations
bun run db:push        # Push schema to database
bun run db:generate    # Generate Prisma client
bun run db:migrate     # Run migrations
```

## Deployment | 部署

### Vercel (Recommended)

项目已配置 `vercel.json`，可直接部署到 Vercel：

1. 将仓库连接到 [Vercel](https://vercel.com)
2. 配置环境变量（`DATABASE_URL`, `NVIDIA_API_KEY` 等）
3. 部署（自动检测 Next.js 框架）

### Docker

```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY . .
RUN bun run db:generate
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "start"]
```

## API Endpoints | API 接口

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/channels` | 获取所有通道配置 |
| POST | `/api/channels` | 创建通道配置 |
| PUT | `/api/channels/[id]` | 更新通道配置 |
| DELETE | `/api/channels/[id]` | 删除通道配置 |
| POST | `/api/channels/[id]/check` | 检测通道健康状态 |
| GET | `/api/tasks/browse` | 获取浏览任务列表 |
| POST | `/api/tasks/browse` | 创建浏览任务 |
| GET | `/api/tasks/browse/[id]/stream` | SSE 实时浏览进度 |
| GET/PUT/DELETE | `/api/tasks/browse/[id]` | 浏览任务 CRUD |
| GET | `/api/tasks/scheduled` | 获取定时任务列表 |
| POST | `/api/tasks/scheduled` | 创建定时任务 |
| GET/PUT/DELETE | `/api/tasks/scheduled/[id]` | 定时任务 CRUD |
| GET | `/api/reports` | 获取报告列表 |
| GET | `/api/reports/[id]` | 获取报告详情 |
| GET | `/api/memory` | 获取记忆条目 |
| GET | `/api/dashboard/stats` | 获取仪表盘统计数据 |
| GET/PUT | `/api/settings/llm` | LLM 配置管理 |
| POST | `/api/agent/run` | 执行 Agent 任务 |

## Usage Scenarios | 使用场景

1. **竞品监控** - 定时采集竞品官网、社交媒体动态，AI 自动生成竞品分析报告
2. **技术追踪** - 订阅 GitHub Trending、Hacker News、V2EX，定期汇总技术趋势
3. **舆情监控** - 监控微博、小红书、Twitter 上的品牌讨论，AI 提炼关键舆情
4. **投资研究** - 追踪雪球、财经新闻，定时生成市场分析摘要
5. **学术研究** - 监控论文更新、arXiv、GitHub 项目，自动生成文献综述
6. **内容创作** - 采集多平台热点内容，AI 辅助生成原创内容素材
7. **个人助理** - 定时浏览感兴趣的主题网站，每日推送个性化简报

## Inspired By

- [Agent-Reach](https://github.com/Panniantong/Agent-Reach) - Multi-platform data collection framework
- [GenericAgent](https://github.com/lsdefine/GenericAgent) - Autonomous web browsing agent

## License

MIT License
