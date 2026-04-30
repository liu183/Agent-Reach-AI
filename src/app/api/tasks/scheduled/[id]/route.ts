import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDefaultUser } from '@/lib/api-utils';
import { runAgent } from '@/lib/agent/engine';

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

    // Execute agent directly (synchronous — avoids fire-and-forget being killed by serverless)
    const channels = JSON.parse(task.channels || '[]');
    const targetChannel = channels[0] || 'web';
    const url = targetChannel === 'web' ? 'https://news.ycombinator.com' : `https://${targetChannel}.com`;

    try {
      const result = await runAgent(url, task.prompt, 10, userId, () => {
        // Silent step execution for scheduled tasks
      });

      await db.scheduledTask.update({
        where: { id },
        data: {
          lastStatus: 'success',
          lastRunAt: new Date(),
        },
      });
      await db.agentSession.update({
        where: { id: session.id },
        data: {
          status: 'completed',
          result: result.summary || null,
          turns: result.turnsUsed || 0,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Task completed successfully',
        sessionId: session.id,
        status: 'completed',
        summary: result.summary,
      });
    } catch (agentErr) {
      const errMsg = agentErr instanceof Error ? agentErr.message : 'Unknown error';
      await db.scheduledTask.update({
        where: { id },
        data: { lastStatus: 'error', lastRunAt: new Date() },
      });
      await db.agentSession.update({
        where: { id: session.id },
        data: { status: 'error', result: errMsg },
      });

      return NextResponse.json({
        success: false,
        error: `Agent failed: ${errMsg}`,
        sessionId: session.id,
        status: 'error',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Scheduled task run error:', error);
    return NextResponse.json({ error: 'Failed to run task' }, { status: 500 });
  }
}
