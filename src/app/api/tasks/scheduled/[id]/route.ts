import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDefaultUser } from '@/lib/api-utils';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await ensureDefaultUser();
    const body = await request.json();

    const task = await db.scheduledTask.update({
      where: { id, userId },
      data: {
        name: body.name,
        description: body.description,
        cronExpr: body.cronExpr,
        repeatType: body.repeatType,
        prompt: body.prompt,
        channels: JSON.stringify(body.channels),
        enabled: body.enabled,
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
    console.error('Scheduled task update error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await ensureDefaultUser();

    await db.scheduledTask.delete({ where: { id, userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Scheduled task delete error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}

// Manually trigger a scheduled task to run now
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await ensureDefaultUser();

    const task = await db.scheduledTask.findFirst({ where: { id, userId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Mark as running
    await db.scheduledTask.update({
      where: { id },
      data: { lastStatus: 'running' },
    });

    // Log agent session
    const session = await db.agentSession.create({
      data: {
        userId,
        taskType: 'scheduled',
        taskId: id,
        status: 'running',
        prompt: task.prompt,
      },
    });

    // Execute agent in background using the runAgent endpoint
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Fire-and-forget: create a browse task to run the agent
    const channels = JSON.parse(task.channels || '[]');
    const targetChannel = channels[0] || 'web';

    // Use the agent run endpoint
    fetch(`${baseUrl}/api/agent/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: targetChannel === 'web' ? 'https://news.ycombinator.com' : `https://${targetChannel}.com`,
        prompt: task.prompt,
        maxTurns: 15,
        userId,
      }),
    })
      .then(async (res) => {
        const result = await res.json().catch(() => null);
        await db.scheduledTask.update({
          where: { id },
          data: {
            lastStatus: result?.error ? 'error' : 'success',
            lastRunAt: new Date(),
          },
        });
        await db.agentSession.update({
          where: { id: session.id },
          data: {
            status: result?.error ? 'error' : 'completed',
            result: result?.summary || null,
            turns: result?.turns || 0,
          },
        });
      })
      .catch(async (err) => {
        await db.scheduledTask.update({
          where: { id },
          data: { lastStatus: 'error', lastRunAt: new Date() },
        });
        await db.agentSession.update({
          where: { id: session.id },
          data: { status: 'error', result: err instanceof Error ? err.message : 'Unknown error' },
        });
      });

    return NextResponse.json({
      success: true,
      message: 'Task execution started',
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Scheduled task run error:', error);
    return NextResponse.json({ error: 'Failed to run task' }, { status: 500 });
  }
}
