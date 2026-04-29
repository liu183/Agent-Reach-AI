import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDefaultUser } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await ensureDefaultUser();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const channel = searchParams.get('channel') || '';

    const where: Record<string, unknown> = { userId };
    if (search) {
      where.title = { contains: search };
    }
    if (channel) {
      where.channel = channel;
    }

    const [reports, total] = await Promise.all([
      db.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.report.count({ where }),
    ]);

    return NextResponse.json({
      reports: reports.map((r) => ({
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
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Reports list error:', error);
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 });
  }
}
