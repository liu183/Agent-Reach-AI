import { ChannelList } from '@/components/channels/channel-list';

export function ChannelsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Channels</h2>
        <p className="text-muted-foreground">Manage 16+ internet platform connections.</p>
      </div>
      <ChannelList />
    </div>
  );
}
