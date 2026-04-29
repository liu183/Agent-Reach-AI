import { NextResponse } from 'next/server';
import { db, ensureDefaultUser } from '@/lib/api-utils';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await ensureDefaultUser();

    const report = await db.report.findFirst({ where: { id, userId } });
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: report.id,
      title: report.title,
      content: report.content,
      summary: report.summary,
      source: report.source,
      channel: report.channel,
      status: report.status,
      wordCount: report.wordCount,
      createdAt: report.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Report detail error:', error);
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 });
  }
}
