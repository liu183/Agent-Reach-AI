# Browse Tasks UI Redesign — Worklog

## Date: 2025-01-XX

## Summary
Redesigned 5 frontend components for the Browse Tasks feature to create a beautiful, interactive, and polished user experience with a dark-first SaaS aesthetic.

## Files Modified

### 1. `src/components/browse/browse-task-list.tsx`
- **Polished card design**: Gradient backgrounds (`from-card via-card to-card/80`), subtle borders, backdrop blur
- **Animated status indicators**: Pulsing dot for running tasks, color-coded badges with backgrounds
- **Shimmer effect**: Running tasks have an animated shimmer overlay for visual attention
- **Enhanced hover states**: `hover:-translate-y-0.5`, `hover:shadow-lg`, `hover:border-border/80`, external link icon fade-in
- **Framer Motion**: AnimatePresence with popLayout for smooth add/remove, entrance animations with staggered delays
- **Delete button**: Opacity transition from hidden to visible on hover
- **Progress bar**: Custom gradient bar with glow effect for running tasks, percentage label
- **Tooltip**: Full URL revealed on hover for truncated URLs
- **ScrollArea**: Replaced manual overflow with shadcn ScrollArea
- **Empty state**: Gradient icon container with descriptive text

### 2. `src/components/browse/live-browse-panel.tsx`
- **Terminal-style header**: macOS-style traffic light dots, session ID display, font-mono styling
- **Phase-colored message bubbles**: Each message rendered in a card with phase-specific background, border, and icon
- **Active step pulse**: Ping animation on the latest step while agent is running
- **Collapsible reasoning sections**: Purple-themed collapsible for agent reasoning with Brain icon
- **URL breadcrumb trail**: Navigation path showing visited domains with current URL highlighted
- **Enhanced progress bar**: Gradient fills (amber for running, emerald for complete, red for error) with glow shadow and shimmer animation
- **Turn markers**: Phase-aware action labels (Navigating, Clicking, Filling Form, etc.)
- **Rich final report**: Markdown rendered with ReactMarkdown + remarkGfm in a dark code-block style container
- **Copy button**: On the final report with toast confirmation
- **Initialization animation**: Bouncing dots and glowing icon when agent starts
- **Motion animations**: AnimatePresence for message list, smooth entrance transitions

### 3. `src/components/views/tasks-browse-view.tsx`
- **Hero section**: Status gradient accent bar at top of card, large status icon with phase colors
- **Stat cards grid**: 4-column grid showing Source, Turns, Progress, Created with colored icons
- **Tabbed layout**: Three tabs — "Report" | "Agent Steps" | "Raw" with shadcn Tabs
- **Report tab**: Beautiful prose styling for Markdown with extensive prose customization
- **Agent Steps tab**: Timeline visualization with 4 phases (Observe → Think → Act → Complete), connected by a vertical line, phase-colored dots
- **Raw tab**: Monospace pre-formatted output with copy button
- **Copy report button**: In report tab header
- **Animated transitions**: AnimatePresence between task list and detail view, tab content animations
- **Error/pending states**: Styled error card and pending state with pulsing brain icon

### 4. `src/components/views/browse-live-view.tsx`
- **Better header**: Icon in gradient container, enhanced description text with alignment

### 5. `src/components/tasks/browse-task-form.tsx`
- **Enhanced dialog header**: Gradient icon, clearer title and description
- **Feature hint badges**: "Navigate pages", "Extract data", "Follow links", "Summarize" tags
- **Better input styling**: Globe icon prefix in URL input, focus states with emerald theme
- **Help text**: Descriptive placeholder examples and helper text below each field
- **Loading state**: Animated sparkle icon while dispatching
- **Submit button**: Arrow icon, shadow effects, disabled state

## Design Principles Applied
- **Dark theme first**: All colors tuned for dark backgrounds
- **Color coding**: Emerald (success/complete), Amber (running/active), Purple (think/brain), Blue (observe), Red (error)
- **Consistent spacing**: 2.5px-5px increments, generous padding
- **Micro-interactions**: Hover lifts, fade transitions, pulse animations
- **Visual hierarchy**: Clear typography scale (10px labels → 13px body → 14px headings → 18px titles)
- **Border consistency**: `border-border/30` to `border-border/50` for subtle, cohesive borders
- **No external dependencies added**: All changes use existing shadcn/ui + Framer Motion + Lucide

## Lint Status
All modified files pass ESLint with zero errors.

---

# Unify browser-toolkit to use Cheerio-based html-parser — Worklog

## Date: 2025-01-XX

## Summary
Refactored `browser-toolkit.ts` to replace its fragile regex-based HTML parsing with the existing Cheerio-based `html-parser.ts` module. This eliminates duplicate parsing logic and improves content extraction quality (strips nav/footer/ads, finds main content).

## Files Modified

### 1. `src/lib/agent/browser-toolkit.ts`

**Removed (regex-based internals):**
- `extractTitle()` — regex-based title extraction using `<title>`, `<meta property="og:title">` patterns
- `extractPageStructure()` — regex-based extraction for links (`/<a[^>]*href=.../>`), forms (`/<form[^>]*action=.../>`), and text content
- `getAttr()` — regex attribute extraction helper
- `cleanText()` — regex-based HTML stripping and entity decoding
- `decodeEntities()` — regex-based HTML entity decoder
- Second form regex pattern (`formRegex2`) that handled `method` before `action` attribute ordering

**Added (Cheerio-based via html-parser):**
- Import `extractTitle` and `simplifyHtml` from `./html-parser`
- Import `cheerio` for link/form structural extraction (html-parser doesn't handle those)
- New `extractPageStructure()` using Cheerio selectors:
  - **Links**: `$('a[href]')` with `.text()` for link text, same filtering (#, javascript:, length > 500)
  - **Forms**: `$('form')` naturally handles both `action/method` and `method/action` attribute orderings
  - **Inputs**: `$(el).find('input, textarea, select')` with `prop('tagName')` and `attr('type')` for field detection
  - **Select options**: `$(inputEl).find('option[value]')` Cheerio selector
  - **Submit buttons**: `$(el).find('button[type="submit"]')` and `$(el).find('input[type="submit"]')` Cheerio selectors
  - **Text content**: Delegates to `simplifyHtml(html)` from html-parser for high-quality main content extraction

**Preserved (unchanged):**
- `fetchPage()` — same public API, Jina Reader fallback, now calls html-parser for extraction
- `navigateToLink()` — unchanged, delegates to `fetchPage()`
- `submitForm()` — unchanged, delegates to `fetchPage()` for GET, calls `extractTitle` + `extractPageStructure` for POST
- `formatPageForLLM()` — unchanged, formats PageSnapshot for LLM consumption
- All exports: `fetchPage`, `navigateToLink`, `submitForm`, `formatPageForLLM`
- `PageSnapshot` return type with `{ url, title, content, links, forms, contentLength }`
- Link limits (50 max), form limits (10 max), select option limits (20 max)

**Not modified (per requirements):**
- `src/lib/agent/html-parser.ts` — untouched
- `src/lib/agent/agent-types.ts` — untouched

## Key Improvements
1. **Better content extraction**: `simplifyHtml()` strips nav/footer/ads/sidebar/cookie-banners and finds `<main>` content — much cleaner than the old regex `cleanText()` which just stripped tags
2. **Better title extraction**: html-parser checks `og:title` → `twitter:title` → `<title>` → `<h1>` — more robust than the old two-pattern regex
3. **No more attribute ordering bugs**: Old code needed two separate regex patterns for `<form action="" method="">` vs `<form method="" action="">`. Cheerio handles both naturally.
4. **Eliminated ~80 lines of fragile regex code** replaced with declarative Cheerio selectors
5. **Single parsing implementation**: Project now uses one HTML parsing approach (Cheerio) instead of two competing ones (regex + Cheerio)

## Lint Status
No new lint errors introduced. All pre-existing lint errors are in unrelated files.

---

# Wire Channel Auth from DB Config — Worklog

## Date: 2025-06-17

## Summary
Created a channel config provider that reads `authConfig` from the `ChannelConfig` DB table and wired it into the four channels that need authentication (`twitter`, `reddit`, `bilibili`, `xiaohongshu`). Also fixed the Prisma compound-unique-key name bug (`id_userId_channel` → `userId_channel`) in two files.

## Files Created

### 1. `src/lib/channels/config-provider.ts`
- New module exporting `getChannelAuthConfig(channelId: string)`
- Reads `authConfig` JSON from `db.channelConfig.findFirst` for the default user
- Returns parsed `Record<string, unknown>` or `{}` on missing/error
- Graceful error handling — logs and returns empty object instead of throwing

## Files Modified

### 2. `src/lib/channels/twitter.ts`
- Added `getChannelAuthConfig` import
- `collect()` now calls `getChannelAuthConfig('twitter')` at the top
- **Attempt 1 (with cookie)**: If `authConfig.cookie` exists, makes a direct `fetch()` to X/Twitter with the cookie + standard browser-like headers. Strips scripts/styles/tags from the HTML and returns the text content if it's long enough (>100 chars).
- **Attempt 2 (Jina fallback)**: If no cookie configured or direct fetch fails, falls back to Jina Reader (existing behavior preserved exactly)
- **No change** to `canHandle()` or `check()`

### 3. `src/lib/channels/reddit.ts`
- Added `getChannelAuthConfig` import
- `collect()` now calls `getChannelAuthConfig('reddit')`
- If `authConfig.cookie` exists, attaches it as a `Cookie` header to the Reddit JSON API call (enables access to age-gated or auth-required subreddits)
- If no cookie, request proceeds without it (existing behavior unchanged — Reddit public API works without cookies)
- **No change** to `canHandle()` or `check()`

### 4. `src/lib/channels/bilibili.ts`
- Added `getChannelAuthConfig` import
- `collect()` now calls `getChannelAuthConfig('bilibili')`
- If `authConfig.cookie` exists, attaches it to the Bilibili search API call (SESSDATA cookie enables higher search rate limits and mature content)
- If no cookie, request proceeds without it (existing behavior unchanged)
- **No change** to `canHandle()` or `check()`

### 5. `src/lib/channels/xiaohongshu.ts`
- Added `getChannelAuthConfig` import
- `collect()` now calls `getChannelAuthConfig('xiaohongshu')`
- **Attempt 1 (with cookie)**: If `authConfig.cookie` exists, makes a direct `fetch()` to XHS with cookie + browser-like headers. Strips scripts/styles/tags and returns text if >100 chars.
- **Attempt 2 (Jina fallback)**: Falls back to Jina Reader (existing primary behavior)
- **Attempt 3 (explore fallback)**: Falls back to Jina Reader on the XHS explore page (existing secondary fallback)
- **No change** to `canHandle()` or `check()`

### 6. `src/app/api/channels/[id]/check/route.ts` (bug fix)
- **Fixed**: Changed `id_userId_channel` to `userId_channel` in the `db.channelConfig.upsert` `where` clause
- The Prisma schema defines `@@unique([userId, channel])`, so the generated compound unique key is `userId_channel`, not `id_userId_channel`
- This was causing runtime errors on health checks

### 7. `src/lib/api-utils.ts` (bug fix)
- **Fixed**: Changed `id_userId_channel` to `userId_channel` in the `seedIfEmpty` function's `db.channelConfig.upsert` `where` clause
- Same root cause as above — wrong compound key name

## What Was NOT Changed
- Channel `base.ts` interface — no changes to the `Channel` type
- `registry.ts` — no changes to channel registration
- `constants.ts` — no changes to channel definitions
- Channels without auth (`web`, `youtube`, `github`, `rss`, `v2ex`, `weibo`, `douyin`, `linkedin`, `xueqiu`, `wechat`, `xiaoyuzhou`, `exa-search`) — untouched
- All existing Jina Reader fallback behavior is preserved — auth config is purely additive

## Lint Status
No new lint errors introduced. All pre-existing lint errors are in unrelated files.
