'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Globe, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface TimelineEvent {
  id: string;
  type: string;
  name: string;
  status: string;
  createdAt: string;
}

export function ActivityTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{recentTasks?: TimelineEvent[]}>('/api/dashboard/stats')
      .then((data) => {
        setEvents(data.recentTasks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircle2 className="size-4 text-emerald-500" />;
      case 'error':
        return <XCircle className="size-4 text-red-500" />;
      case 'running':
        return <Clock className="size-4 text-amber-500 animate-pulse" />;
      default:
        return <Clock className="size-4 text-muted-foreground" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'browse':
        return <Globe className="size-3.5 text-emerald-500" />;
      case 'scheduled':
        return <Calendar className="size-3.5 text-violet-500" />;
      default:
        return <Clock className="size-3.5 text-muted-foreground" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-4 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground">Create a browse task or schedule one to get started</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors"
              >
                {getStatusIcon(event.status)}
                {getTypeIcon(event.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{event.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{event.type} · {event.status}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
