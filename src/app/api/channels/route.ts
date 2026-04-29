import { NextResponse } from 'next/server';
import { db, ensureDefaultUser, seedIfEmpty } from '@/lib/api-utils';
import { CHANNELS } from '@/lib/constants';

export async function GET() {
  try {
    const userId = await ensureDefaultUser();
    await seedIfEmpty(userId);

    const configs = await db.channelConfig.findMany({ where: { userId } });
    const configMap = new Map(configs.map((c) => [c.channel, c]));

    // Merge channel definitions with DB configs
    const channels = CHANNELS.map((def) => {
      const config = configMap.get(def.id);
      return {
        ...def,
        enabled: config?.enabled ?? true,
        healthStatus: config?.healthStatus ?? 'unknown',
        lastCheck: config?.lastCheck?.toISOString() ?? null,
        configId: config?.id ?? null,
      };
    });

    return NextResponse.json(channels);
  } catch (error) {
    console.error('Channels list error:', error);
    return NextResponse.json({ error: 'Failed to load channels' }, { status: 500 });
  }
}
