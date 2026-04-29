import { SettingsPanel } from '@/components/settings/settings-panel';

export function SettingsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Configure API keys, cookies, and global preferences.</p>
      </div>
      <SettingsPanel />
    </div>
  );
}
