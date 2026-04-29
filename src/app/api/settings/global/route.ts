import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDefaultUser } from '@/lib/api-utils';

const DEFAULT_GLOBAL_SETTINGS = {
  maxTurns: 15,
  contentMaxLength: 30000,
  autoSaveReports: true,
};

export async function GET() {
  try {
    const userId = await ensureDefaultUser();
    const user = await db.user.findFirst({ where: { id: userId } });
    const settings = user?.settings ? JSON.parse(user.settings) : {};
    const globalSettings = settings.globalSettings || DEFAULT_GLOBAL_SETTINGS;

    return NextResponse.json(globalSettings);
  } catch (error) {
    console.error('Global settings error:', error);
    return NextResponse.json({ error: 'Failed to load global settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await ensureDefaultUser();
    const body = await request.json();

    const newSettings = {
      maxTurns: body.maxTurns ?? DEFAULT_GLOBAL_SETTINGS.maxTurns,
      contentMaxLength: body.contentMaxLength ?? DEFAULT_GLOBAL_SETTINGS.contentMaxLength,
      autoSaveReports: body.autoSaveReports ?? DEFAULT_GLOBAL_SETTINGS.autoSaveReports,
    };

    // Merge into existing user settings
    const user = await db.user.findFirst({ where: { id: userId } });
    const existingSettings = user?.settings ? JSON.parse(user.settings) : {};
    existingSettings.globalSettings = newSettings;

    await db.user.update({
      where: { id: userId },
      data: { settings: JSON.stringify(existingSettings) },
    });

    return NextResponse.json({ success: true, settings: newSettings });
  } catch (error) {
    console.error('Global settings save error:', error);
    return NextResponse.json({ error: 'Failed to save global settings' }, { status: 500 });
  }
}
