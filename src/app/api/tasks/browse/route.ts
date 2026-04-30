import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDefaultUser } from '@/lib/api-utils';
import { runAgent } from '@/lib/agent/engine';

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
        prompt: body.prompt || 'Browse this page and provide a comprehensive summary of its content.',
        maxTurns: body.maxTurns || 15,
        status: 'pending',
      },
    });

    // Run agent inline (Vercel serverless kills fire-and-forget promises before they resolve)
    // We return the response immediately and let the agent run in the same function lifetime
    // by using waitUntil pattern — but since Next.js App Router doesn't support it directly,
    // we start the agent in a non-blocking way and rely on the POST /stream endpoint
    // called by the frontend to actually execute it.

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
