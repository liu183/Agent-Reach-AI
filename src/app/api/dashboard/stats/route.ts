import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDefaultUser, seedIfEmpty } from '@/lib/api-utils';

export async function GET() {
  try {
    const userId = await ensureDefaultUser();
    await seedIfEmpty(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Channels: count enabled channels (not based on health check which may never have run)
    const channelConfigs = await db.channelConfig.findMany({ where: { userId } });
    const channelsEnabled = channelConfigs.filter((c) => c.enabled).length;
    const channelsWithHealth = channelConfigs.filter((c) => c.healthStatus !== 'unknown' && c.healthStatus !== null);
    const channelsOnline = channelsWithHealth.filter((c) => c.healthStatus === 'ok' && c.enabled).length;
    // If health check has never run, show enabled count as "online"
    const displayChannelsOnline = channelsWithHealth.length > 0 ? channelsOnline : channelsEnabled;
    const channelsTotal = 16;

    // Today's counts
    const browseTasksToday = await db.browseTask.count({
      where: { userId, createdAt: { gte: today } },
    });
    const scheduledTasksToday = await db.scheduledTask.count({
      where: { userId, lastRunAt: { gte: today } },
    });
    const tasksToday = browseTasksToday + scheduledTasksToday;

    const reportsTotal = await db.report.count({ where: { userId } });
    const reportsToday = await db.report.count({ where: { userId, createdAt: { gte: today } } });

    // Agent sessions count
    const agentSessions = await db.agentSession.count({ where: { userId } });

    // Daily activity for last 7 days
    const dailyActivity = [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [reports, tasks] = await Promise.all([
        db.report.count({ where: { userId, createdAt: { gte: dayStart, lt: dayEnd } } }),
        db.browseTask.count({ where: { userId, createdAt: { gte: dayStart, lt: dayEnd } } }),
      ]);

      dailyActivity.push({
        date: dayStart.toISOString().split('T')[0],
        label: i === 0 ? 'Today' : dayLabels[dayStart.getDay()],
        reports,
        tasks,
      });
    }

    // Recent reports
    const recentReports = await db.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Recent tasks (browse + scheduled combined)
    const recentBrowse = await db.browseTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const recentScheduled = await db.scheduledTask.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    const recentTasks = [
      ...recentBrowse.map((t) => ({
        id: t.id,
        type: 'browse',
        name: t.url.substring(0, 60),
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      ...recentScheduled.map((t) => ({
        id: t.id,
        type: 'scheduled',
        name: t.name,
        status: t.lastStatus,
        createdAt: t.updatedAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return NextResponse.json({
      channelsOnline: displayChannelsOnline,
      channelsTotal,
      tasksToday,
      reportsTotal,
      reportsToday,
      agentSessions,
      dailyActivity,
      recentReports: recentReports.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        summary: r.summary,
        source: r.source,
        channel: r.channel,
        status: r.status,
        wordCount: r.wordCount,
        createdAt: r.createdAt.toISOString(),
      })),
      recentTasks,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard stats' }, { status: 500 });
  }
}
