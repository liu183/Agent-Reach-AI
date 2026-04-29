'use client';

import {
  Globe, Youtube, Rss, MessageSquare, Search, Github, MessageCircle,
  Twitter, Tv, AtSign, BookOpen, TrendingUp, Headphones, Music, Linkedin, Circle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { ChannelDef, ChannelHealth } from '@/lib/types';
import { TIER_LABELS } from '@/lib/constants';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe, Youtube, Rss, MessageSquare, Search, Github, MessageCircle,
  Twitter, Tv, AtSign, BookOpen, TrendingUp, Headphones, Music, Linkedin,
};

interface ChannelCardProps {
  channel: ChannelDef & {
    enabled?: boolean;
    healthStatus?: ChannelHealth;
    configId?: string | null;
  };
  onToggle?: (channelId: string, enabled: boolean) => void;
  onCheck?: (channelId: string) => void;
  onOpenConfig?: (channel: ChannelDef) => void;
  isChecking?: boolean;
}

const healthDotColors: Record<string, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  off: 'bg-zinc-500',
  error: 'bg-red-500',
  unknown: 'bg-zinc-600',
};

export function ChannelCard({
  channel,
  onToggle,
  onCheck,
  onOpenConfig,
  isChecking,
}: ChannelCardProps) {
  const Icon = iconMap[channel.icon] || Circle;
  const tier = TIER_LABELS[channel.tier];
  const healthColor = healthDotColors[channel.healthStatus || 'unknown'];

  return (
    <div
      className="group relative rounded-lg border bg-card p-4 transition-all hover:shadow-md hover:border-emerald-500/30 cursor-pointer"
      onClick={() => onOpenConfig?.(channel)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">{channel.name}</h3>
              <span className={`inline-flex size-2 rounded-full ${healthColor}`} title={channel.healthStatus || 'unknown'} />
            </div>
            <p className="text-xs text-muted-foreground">{channel.nameZh}</p>
          </div>
        </div>
        <Switch
          checked={channel.enabled ?? true}
          onCheckedChange={(checked) => {
            onToggle?.(channel.id, checked);
          }}
          onClick={(e) => e.stopPropagation()}
          className="scale-90"
        />
      </div>

      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{channel.description}</p>

      <div className="flex items-center justify-between">
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${tier.color}`}>
          {tier.label}
        </Badge>
        {channel.needsAuth && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Auth: {channel.authType}
          </Badge>
        )}
      </div>

      {isChecking && (
        <div className="absolute inset-0 rounded-lg bg-card/80 flex items-center justify-center">
          <div className="size-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
