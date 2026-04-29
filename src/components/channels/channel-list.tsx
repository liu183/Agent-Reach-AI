'use client';

import { useEffect, useState } from 'react';
import { ChannelCard } from './channel-card';
import { ChannelConfigDialog } from './channel-config-dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { CHANNELS } from '@/lib/constants';
import { apiFetch } from '@/lib/api-client';
import type { ChannelDef, ChannelHealth } from '@/lib/types';

interface ChannelData extends ChannelDef {
  enabled: boolean;
  healthStatus: ChannelHealth;
  lastCheck: string | null;
  configId: string | null;
}

export function ChannelList() {
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChannelDef | null>(null);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());

  const fetchChannels = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ChannelData[]>('/api/channels');
      if (!Array.isArray(data)) {
        setError('Invalid response format from server');
        toast.error('Failed to load channels');
        return;
      }
      setChannels(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast.error('Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleToggle = async (channelId: string, enabled: boolean) => {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel?.configId) {
      toast.info('Channel config will be created on first check');
      return;
    }
    try {
      await apiFetch(`/api/channels/${channel.configId}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
      setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, enabled } : c)));
      toast.success(`${channel.name} ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update channel');
    }
  };

  const handleCheck = async (channelId: string) => {
    setCheckingIds((prev) => new Set(prev).add(channelId));
    try {
      const result = await apiFetch<{status: string; message: string}>(`/api/channels/${channelId}/check`, { method: 'POST' });
      if (result.status === 'ok') {
        toast.success(`${channels.find((c) => c.id === channelId)?.name}: ${result.message}`);
      } else {
        toast.warning(`${channels.find((c) => c.id === channelId)?.name}: ${result.message}`);
      }
      fetchChannels();
    } catch {
      toast.error('Health check failed');
    } finally {
      setCheckingIds((prev) => {
        const next = new Set(prev);
        next.delete(channelId);
        return next;
      });
    }
  };

  const handleCheckAll = async () => {
    const checks = CHANNELS.map((ch) => handleCheck(ch.id));
    await Promise.allSettled(checks);
    toast.success('All channel checks completed');
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="h-36 rounded-lg border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Failed to Load Channels</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchChannels} className="gap-2">
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{channels.length} platforms configured</p>
        <Button variant="outline" size="sm" onClick={handleCheckAll} className="gap-2">
          <RefreshCw className="size-3.5" />
          Check All
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {channels.map((channel) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            onToggle={handleToggle}
            onCheck={handleCheck}
            onOpenConfig={setSelectedChannel}
            isChecking={checkingIds.has(channel.id)}
          />
        ))}
      </div>

      {selectedChannel && (
        <ChannelConfigDialog
          channel={selectedChannel}
          open={!!selectedChannel}
          onOpenChange={(open) => !open && setSelectedChannel(null)}
        />
      )}
    </div>
  );
}
