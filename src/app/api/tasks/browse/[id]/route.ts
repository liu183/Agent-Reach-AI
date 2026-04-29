import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDefaultUser } from '@/lib/api-utils';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await ensureDefaultUser();

    const task = await db.browseTask.findFirst({ where: { id, userId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: task.id,
      url: task.url,
      prompt: task.prompt,
      status: task.status,
      progress: task.progress,
      turnsUsed: task.turnsUsed,
      maxTurns: task.maxTurns,
      resultSummary: task.resultSummary,
      error: task.error,
      createdAt: task.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Browse task get error:', error);
    return NextResponse.json({ error: 'Failed to load task' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await ensureDefaultUser();

    const task = await db.browseTask.findFirst({ where: { id, userId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Delete associated reports
    if (task.id) {
      await db.report.deleteMany({ where: { browseTaskId: id } });
    }

    await db.browseTask.delete({ where: { id, userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Browse task delete error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
