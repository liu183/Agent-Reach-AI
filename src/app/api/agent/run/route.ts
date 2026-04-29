import { NextRequest, NextResponse } from 'next/server';
import { ensureDefaultUser } from '@/lib/api-utils';
import { runAgent } from '@/lib/agent/engine';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const userId = await ensureDefaultUser();
    const body = await request.json();
    const { url, prompt, maxTurns = 15 } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const taskPrompt = prompt || 'Summarize this web page comprehensively in Markdown format.';

    const result = await runAgent(url, taskPrompt, maxTurns, userId, () => {
      // Silent execution for direct agent run
    });

    return NextResponse.json({
      title: result.title,
      summary: result.summary,
      status: 'completed',
    });
  } catch (error) {
    console.error('Agent run error:', error);
    return NextResponse.json(
      { error: `Agent run failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
