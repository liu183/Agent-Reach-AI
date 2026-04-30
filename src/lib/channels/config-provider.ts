import { db } from '@/lib/db';
import { ensureDefaultUser } from '@/lib/api-utils';

/**
 * Get the auth configuration for a channel from the database.
 *
 * Looks up the ChannelConfig row for the given channelId belonging to
 * the default user and returns the parsed `authConfig` JSON.
 * Returns an empty object when no config is stored or parsing fails.
 */
export async function getChannelAuthConfig(
  channelId: string,
): Promise<Record<string, unknown>> {
  try {
    const userId = await ensureDefaultUser();
    const config = await db.channelConfig.findFirst({
      where: { userId, channel: channelId },
      select: { authConfig: true },
    });

    if (!config?.authConfig) return {};

    const parsed: Record<string, unknown> = JSON.parse(config.authConfig);
    return parsed;
  } catch (error) {
    console.error(
      `[config-provider] Failed to load auth config for "${channelId}":`,
      error,
    );
    return {};
  }
}
