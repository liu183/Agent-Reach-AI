import { LiveBrowsePanel } from '@/components/browse/live-browse-panel';
import { Cpu } from 'lucide-react';

export function BrowseLiveView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 flex items-center justify-center">
            <Cpu className="size-4 text-purple-400" />
          </div>
          Live Browse
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5 ml-[42px]">
          Watch the autonomous agent browse, analyze, and extract information in real-time.
        </p>
      </div>
      <LiveBrowsePanel />
    </div>
  );
}
