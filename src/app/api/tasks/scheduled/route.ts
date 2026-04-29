import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDefaultUser } from '@/lib/api-utils';

export async function GET() {
  try {
    const userId = await ensureDefaultUser();
    const tasks = await db.scheduledTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      tasks.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        cronExpr: t.cronExpr,
        repeatType: t.repeatType,
        prompt: t.prompt,
        channels: JSON.parse(t.channels),
        enabled: t.enabled,
        lastRunAt: t.lastRunAt?.toISOString(),
        nextRunAt: t.nextRunAt?.toISOString(),
        lastStatus: t.lastStatus,
      }))
    );
  } catch (error) {
    console.error('Scheduled tasks list error:', error);
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await ensureDefaultUser();
    const body = await request.json();

    const task = await db.scheduledTask.create({
      data: {
        userId,
        name: body.name,
        description: body.description || null,
        cronExpr: body.cronExpr || '0 9 * * *',
        repeatType: body.repeatType || 'daily',
        prompt: body.prompt,
        channels: JSON.stringify(body.channels || []),
        enabled: body.enabled ?? true,
        nextRunAt: body.nextRunAt ? new Date(body.nextRunAt) : null,
      },
    });

    return NextResponse.json({
      id: task.id,
      name: task.name,
      description: task.description,
      cronExpr: task.cronExpr,
      repeatType: task.repeatType,
      prompt: task.prompt,
      channels: JSON.parse(task.channels),
      enabled: task.enabled,
      lastRunAt: task.lastRunAt?.toISOString(),
      nextRunAt: task.nextRunAt?.toISOString(),
      lastStatus: task.lastStatus,
    });
  } catch (error) {
    console.error('Scheduled task create error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
