'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TIER_LABELS } from '@/lib/constants';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import type { ChannelDef } from '@/lib/types';

interface ChannelConfigDialogProps {
  channel: ChannelDef;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChannelConfigDialog({ channel, open, onOpenChange }: ChannelConfigDialogProps) {
  const [checking, setChecking] = useState(false);
  const tier = TIER_LABELS[channel.tier];

  const handleHealthCheck = async () => {
    setChecking(true);
    try {
      const result = await apiFetch<{status: string; message: string}>(`/api/channels/${channel.id}/check`, { method: 'POST' });
      if (result.status === 'ok') {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
    } catch {
      toast.error('Health check failed');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {channel.name}
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${tier.color}`}>
              {tier.label}
            </Badge>
          </DialogTitle>
          <DialogDescription>{channel.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Channel Details</h4>
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chinese Name</span>
                <span>{channel.nameZh}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tier</span>
                <span>{tier.label} ({tier.labelZh})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Authentication</span>
                <span className="capitalize">{channel.authType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Backends</span>
                <span>{channel.backends.join(', ')}</span>
              </div>
            </div>
          </div>

          {channel.needsAuth && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Configuration</h4>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                <p className="text-amber-600 dark:text-amber-400">
                  This channel requires authentication. Please configure your{' '}
                  {channel.authType === 'cookie' ? 'cookies' : channel.authType === 'apikey' ? 'API key' : 'browser session'}{' '}
                  in Settings.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={handleHealthCheck}
              disabled={checking}
            >
              {checking ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Run Health Check
            </Button>
            {channel.id === 'web' && (
              <Button variant="outline" size="sm" asChild>
                <a href="https://r.jina.ai" target="_blank" rel="noopener noreferrer" className="gap-2">
                  <ExternalLink className="size-3.5" />
                  Jina Reader
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
