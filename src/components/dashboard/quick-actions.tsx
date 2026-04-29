'use client';

import { useAppStore } from '@/store/app-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Calendar, Rss, Zap } from 'lucide-react';

export function QuickActions() {
  const { setView } = useAppStore();

  const actions = [
    {
      icon: Globe,
      label: 'Browse a URL',
      description: 'Fetch and summarize any web page',
      onClick: () => setView('tasks-browse'),
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    },
    {
      icon: Calendar,
      label: 'Create Scheduled Task',
      description: 'Set up recurring content collection',
      onClick: () => setView('tasks-scheduled'),
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10 hover:bg-violet-500/20',
    },
    {
      icon: Rss,
      label: 'Check All Channels',
      description: 'Run health checks on all platforms',
      onClick: () => setView('channels'),
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
    },
    {
      icon: Zap,
      label: 'View Reports',
      description: 'Browse generated summaries',
      onClick: () => setView('reports'),
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10 hover:bg-rose-500/20',
    },
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-base font-semibold mb-4">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className={`h-auto p-4 flex items-start gap-3 text-left transition-colors ${action.bgColor}`}
              onClick={action.onClick}
            >
              <action.icon className={`size-5 mt-0.5 ${action.color}`} />
              <div>
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
