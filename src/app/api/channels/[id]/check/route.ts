import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDefaultUser } from '@/lib/api-utils';
import { getChannel } from '@/lib/channels/registry';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await ensureDefaultUser();

    const channel = getChannel(id);
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const startTime = Date.now();
    const result = await channel.check();
    const duration = Date.now() - startTime;

    // Update health status in DB
    await db.channelConfig.upsert({
      where: {
        id_userId_channel: { userId, channel: id },
      },
      create: {
        userId,
        channel: id,
        platform: id,
        tier: 0,
        healthStatus: result.status,
        lastCheck: new Date(),
      },
      update: {
        healthStatus: result.status,
        lastCheck: new Date(),
      },
    });

    // Log the check
    await db.channelLog.create({
      data: {
        userId,
        channel: id,
        action: 'check',
        status: result.status === 'ok' ? 'success' : result.status === 'warn' ? 'warn' : 'error',
        message: result.message,
        duration,
      },
    });

    return NextResponse.json({
      channelId: id,
      ...result,
      duration,
    });
  } catch (error) {
    console.error('Channel check error:', error);
    return NextResponse.json(
      { error: `Health check failed: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
