import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDefaultUser } from '@/lib/api-utils';

export async function GET() {
  try {
    const userId = await ensureDefaultUser();
    const tasks = await db.browseTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      tasks.map((t) => ({
        id: t.id,
        url: t.url,
        prompt: t.prompt,
        status: t.status,
        progress: t.progress,
        turnsUsed: t.turnsUsed,
        maxTurns: t.maxTurns,
        resultSummary: t.resultSummary,
        error: t.error,
        createdAt: t.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('Browse tasks list error:', error);
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await ensureDefaultUser();
    const body = await request.json();

    const task = await db.browseTask.create({
      data: {
        userId,
        url: body.url,
        prompt: body.prompt || 'Summarize this web page comprehensively.',
        maxTurns: body.maxTurns || 15,
        status: 'pending',
      },
    });

    // Start agent run in background (fire and forget)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/api/tasks/browse/${task.id}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }).catch(console.error);

    return NextResponse.json({
      id: task.id,
      url: task.url,
      prompt: task.prompt,
      status: task.status,
      progress: 0,
      turnsUsed: 0,
      maxTurns: task.maxTurns,
      createdAt: task.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Browse task create error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
