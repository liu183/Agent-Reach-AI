import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDefaultUser, seedIfEmpty } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await ensureDefaultUser();
    await seedIfEmpty(userId);

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');

    const where: Record<string, unknown> = { userId };
    if (level !== null && level !== '') {
      const parsed = parseInt(level, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 4) {
        where.level = parsed;
      }
    }

    const entries = await db.memoryEntry.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(
      entries.map((e) => ({
        id: e.id,
        category: e.category,
        level: e.level,
        title: e.title,
        content: e.content,
        tags: JSON.parse(e.tags),
        pinned: e.pinned,
        createdAt: e.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('Memory list error:', error);
    return NextResponse.json({ error: 'Failed to load memory' }, { status: 500 });
  }
}
