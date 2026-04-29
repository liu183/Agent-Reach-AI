'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, CheckCircle2, XCircle, Clock, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import type { BrowseTask } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BrowseTaskListProps {
  onTaskClick?: (task: BrowseTask) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pending', color: 'bg-zinc-500/20 text-zinc-400', icon: Clock },
  running: { label: 'Running', color: 'bg-amber-500/20 text-amber-400', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
  error: { label: 'Error', color: 'bg-red-500/20 text-red-400', icon: XCircle },
};

export function BrowseTaskList({ onTaskClick }: BrowseTaskListProps) {
  const [tasks, setTasks] = useState<BrowseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchTasks = async () => {
      try {
        const data = await apiFetch<BrowseTask[]>('/api/tasks/browse');
        if (!cancelled) {
          setTasks(data);
          setLoading(false);

          // Auto-poll if any task is running
          const hasRunning = data.some((t: BrowseTask) => t.status === 'running' || t.status === 'pending');
          if (hasRunning && !cancelled) {
            pollingRef.current = setTimeout(fetchTasks, 3000);
          } else if (pollingRef.current) {
            clearTimeout(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTasks();
    return () => {
      cancelled = true;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  const handleDelete = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/tasks/browse/${taskId}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Globe className="size-10 text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">No Browse Tasks</h3>
          <p className="text-sm text-muted-foreground text-center">Create a new browse task to fetch and summarize web content.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
      {tasks.map((task) => {
        const status = statusConfig[task.status] || statusConfig.pending;
        const StatusIcon = status.icon;
        return (
          <Card
            key={task.id}
            className="cursor-pointer transition-all hover:border-emerald-500/30 hover:shadow-sm"
            onClick={() => onTaskClick?.(task)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-[10px] ${status.color}`}>
                      <StatusIcon className={`size-3 mr-1 ${task.status === 'running' ? 'animate-spin' : ''}`} />
                      {status.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm truncate mb-1">{task.url}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{task.prompt}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-red-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Task?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Delete this browse task and its generated report? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={(e) => handleDelete(task.id, e)} className="bg-red-600 hover:bg-red-700">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {(task.status === 'running' || task.status === 'pending') && (
                <Progress value={task.progress} className="mt-3 h-1.5" />
              )}
              {task.status === 'completed' && task.resultSummary && (
                <p className="text-xs text-emerald-500 mt-2 line-clamp-2">{task.resultSummary}</p>
              )}
              {task.status === 'error' && task.error && (
                <p className="text-xs text-red-400 mt-2 line-clamp-2">{task.error}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
