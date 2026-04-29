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

    const config = await db.channelConfig.update({
      where: { id, userId },
      data: {
        enabled: body.enabled !== undefined ? body.enabled : undefined,
        authConfig: body.authConfig !== undefined ? JSON.stringify(body.authConfig) : undefined,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Channel update error:', error);
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 });
  }
}
