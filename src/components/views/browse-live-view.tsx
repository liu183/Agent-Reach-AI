import { LiveBrowsePanel } from '@/components/browse/live-browse-panel';

export function BrowseLiveView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Live Browse</h2>
        <p className="text-muted-foreground">Watch agent browsing in real-time.</p>
      </div>
      <LiveBrowsePanel />
    </div>
  );
}
