import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDefaultUser } from '@/lib/api-utils';
import { runAgent } from '@/lib/agent/engine';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await ensureDefaultUser();

  const task = await db.browseTask.findFirst({ where: { id, userId } });
  if (!task) {
    return new Response('Task not found', { status: 404 });
  }

  // SSE stream for task progress
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      if (task.status === 'completed' || task.status === 'error') {
        sendEvent('done', {
          status: task.status,
          progress: task.progress,
          result: task.resultSummary,
          error: task.error,
        });
        controller.close();
        return;
      }

      // Mark as running
      await db.browseTask.update({ where: { id }, data: { status: 'running', progress: 5 } });
      sendEvent('progress', { status: 'running', progress: 5, phase: 'observe', message: 'Starting agent...' });

      try {
        const { title, summary } = await runAgent(task.url, task.prompt, task.maxTurns, userId, async (step) => {
          await db.browseTask.update({
            where: { id },
            data: { progress: step.progress, status: step.type === 'error' ? 'error' : 'running' },
          });
          sendEvent('progress', {
            status: step.phase,
            progress: step.progress,
            phase: step.phase,
            turn: step.turn,
            message: step.message,
            url: step.url,
            action: step.action,
          });
        });

        // Save the actual summary
        const summaryPreview = summary.length > 500 ? summary.substring(0, 500) + '...' : summary;
        await db.browseTask.update({
          where: { id },
          data: { status: 'completed', progress: 100, resultSummary: summaryPreview },
        });
        sendEvent('done', { status: 'completed', progress: 100, title, summary });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        await db.browseTask.update({
          where: { id },
          data: { status: 'error', error: errorMsg },
        });
        sendEvent('error', { status: 'error', message: errorMsg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// POST to trigger execution (called internally)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await ensureDefaultUser();

  const task = await db.browseTask.findFirst({ where: { id, userId } });
  if (!task || task.status !== 'pending') {
    return NextResponse.json({ success: true });
  }

  // Run agent and wait (Vercel serverless kills fire-and-forget promises)
  try {
    const { summary } = await runAgent(task.url, task.prompt, task.maxTurns, userId, async (step) => {
      await db.browseTask.update({
        where: { id },
        data: {
          progress: step.progress,
          status: step.type === 'error' ? 'error' : 'running',
        },
      });
    });
    const summaryPreview = summary.length > 500 ? summary.substring(0, 500) + '...' : summary;
    await db.browseTask.update({
      where: { id },
      data: { status: 'completed', progress: 100, resultSummary: summaryPreview },
    });
  } catch (err) {
    await db.browseTask.update({
      where: { id },
      data: { status: 'error', error: err instanceof Error ? err.message : 'Unknown' },
    });
  }

  return NextResponse.json({ success: true });
}
