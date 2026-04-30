import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDefaultUser } from '@/lib/api-utils';
import { getChannel } from '@/lib/channels/registry';
import { summarizeWebContent } from '@/lib/agent/llm';

/**
 * Vercel Cron endpoint — called every 5 minutes to check and run due scheduled tasks.
 * Configure in vercel.json:
 *   See vercel.json for cron schedule configuration
 */
export async function GET(request: NextRequest) {
  // Verify this is a genuine Vercel Cron call
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === 'production') {
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel') ||
      request.headers.get('x-vercel-cron') === 'true';
    if (!isVercelCron && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const userId = await ensureDefaultUser();
    const now = new Date();

    // Find all enabled tasks that are due (nextRunAt <= now)
    const dueTasks = await db.scheduledTask.findMany({
      where: {
        userId,
        enabled: true,
        nextRunAt: { lte: now },
      },
    });

    if (dueTasks.length === 0) {
      return NextResponse.json({ message: 'No tasks due', checkedAt: now.toISOString() });
    }

    const results: Array<{ taskId: string; name: string; status: string; error?: string }> = [];

    for (const task of dueTasks) {
      try {
        await db.scheduledTask.update({
          where: { id: task.id },
          data: { lastStatus: 'running' },
        });

        const session = await db.agentSession.create({
          data: {
            userId,
            taskType: 'scheduled',
            taskId: task.id,
            status: 'running',
            prompt: task.prompt,
          },
        });

        const channels: string[] = JSON.parse(task.channels || '[]');
        let allContent = '';
        let reportChannel = channels[0] || 'web';

        if (channels.length > 0) {
          for (const channelId of channels) {
            try {
              const channel = getChannel(channelId);
              if (channel) {
                const collected = await channel.collect(task.prompt);
                allContent += `\n\n### ${channelId.toUpperCase()} Results\n${collected.content}`;
              }
            } catch (channelErr) {
              allContent += `\n\n### ${channelId.toUpperCase()} Error\n${channelErr instanceof Error ? channelErr.message : 'Failed'}`;
            }
          }
        } else {
          // Fallback: collect from web channel
          const webChannel = getChannel('web');
          if (webChannel) {
            const collected = await webChannel.collect('https://news.ycombinator.com');
            allContent = collected.content;
            reportChannel = 'web';
          }
        }

        // Summarize with LLM and save report
        if (allContent.trim()) {
          const summary = await summarizeWebContent(allContent, task.prompt);
          const wordCount = summary.split(/\s+/).length;

          await db.report.create({
            data: {
              userId,
              title: `[Scheduled] ${task.name} - ${now.toLocaleDateString('zh-CN')}`,
              content: summary,
              summary: summary.substring(0, 200) + (summary.length > 200 ? '...' : ''),
              source: JSON.stringify(channels.length > 0 ? channels : ['web']),
              channel: reportChannel,
              scheduledTaskId: task.id,
              status: 'completed',
              wordCount,
            },
          });

          await db.agentSession.update({
            where: { id: session.id },
            data: { status: 'completed', turns: channels.length || 1, result: summary.substring(0, 500) },
          });
        }

        const nextRun = calculateNextRun(task.cronExpr, task.repeatType);
        await db.scheduledTask.update({
          where: { id: task.id },
          data: { lastStatus: 'success', lastRunAt: now, nextRunAt: nextRun },
        });

        results.push({ taskId: task.id, name: task.name, status: 'success' });
      } catch (taskErr) {
        const errorMsg = taskErr instanceof Error ? taskErr.message : 'Unknown error';
        await db.scheduledTask.update({
          where: { id: task.id },
          data: { lastStatus: 'error', lastRunAt: now },
        });
        results.push({ taskId: task.id, name: task.name, status: 'error', error: errorMsg });
      }
    }

    return NextResponse.json({
      message: `Executed ${dueTasks.length} task(s)`,
      results,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Cron execution error:', error);
    return NextResponse.json(
      { error: `Cron execution failed: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}

function calculateNextRun(cronExpr: string, repeatType: string): Date {
  const now = new Date();
  try {
    const intervalMinutes = parseInterval(repeatType);
    if (intervalMinutes > 0) {
      return new Date(now.getTime() + intervalMinutes * 60 * 1000);
    }

    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length >= 5) {
      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
      const h = parseInt(hour) || 0;
      const m = parseInt(minute) || 0;

      if (dayOfWeek !== '*') {
        // Weekly
        const targetDay = parseInt(dayOfWeek);
        const next = new Date(now);
        next.setHours(h, m, 0, 0);
        const currentDay = next.getDay();
        const daysUntil = ((targetDay - currentDay) + 7) % 7 || 7;
        next.setDate(next.getDate() + (next > now ? 0 : daysUntil));
        if (next <= now) next.setDate(next.getDate() + 7);
        return next;
      }

      if (dayOfMonth !== '*') {
        // Monthly
        const targetDate = Math.min(parseInt(dayOfMonth), 28);
        const next = new Date(now.getFullYear(), now.getMonth(), targetDate, h, m, 0, 0);
        if (next <= now) next.setMonth(next.getMonth() + 1);
        return next;
      }

      // Daily (possibly multiple times)
      const next = new Date(now);
      if (hour.includes(',')) {
        const hours = hour.split(',').map(Number).sort((a, b) => a - b);
        const currentHour = now.getHours();
        const nextHour = hours.find((hh) => hh > currentHour) || hours[0];
        next.setHours(nextHour, m, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
      } else {
        next.setHours(h, m, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
      }
      return next;
    }
  } catch {
    // ignore parse errors
  }

  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

function parseInterval(repeatType: string): number {
  const match = repeatType.match(/every_(\d+)(h|m)/);
  if (match) {
    const num = parseInt(match[1]);
    return match[2] === 'h' ? num * 60 : num;
  }
  return 0;
}

export async function POST(request: NextRequest) {
  return GET(request);
}
