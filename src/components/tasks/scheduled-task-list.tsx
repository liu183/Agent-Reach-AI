'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Calendar, Clock, CheckCircle2, XCircle, Loader2, Trash2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { ScheduledTaskForm } from './scheduled-task-form';
import { apiFetch } from '@/lib/api-client';
import type { TaskSchedule } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  never: { label: 'Never Run', color: 'bg-zinc-500/20 text-zinc-400', icon: Clock },
  success: { label: 'Success', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
  error: { label: 'Error', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  running: { label: 'Running', color: 'bg-amber-500/20 text-amber-400', icon: Loader2 },
};

export function ScheduledTaskList() {
  const [tasks, setTasks] = useState<TaskSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await apiFetch<TaskSchedule[]>('/api/tasks/scheduled');
      setTasks(data);
    } catch {
      toast.error('Failed to load scheduled tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggle = async (taskId: string, enabled: boolean) => {
    try {
      await apiFetch(`/api/tasks/scheduled/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...tasks.find((t) => t.id === taskId), enabled }),
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, enabled } : t)));
      toast.success(`Task ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await apiFetch(`/api/tasks/scheduled/${taskId}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleRunNow = async (taskId: string) => {
    try {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, lastStatus: 'running' } : t)));
      await apiFetch(`/api/tasks/scheduled/${taskId}`, { method: 'POST' });
      toast.success('Task execution started');
      setTimeout(fetchTasks, 5000);
    } catch {
      toast.error('Failed to run task');
      fetchTasks();
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="space-y-4">
        <ScheduledTaskForm onCreated={fetchTasks} />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="size-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No Scheduled Tasks</h3>
            <p className="text-sm text-muted-foreground text-center">Create a scheduled task to automate content collection.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScheduledTaskForm onCreated={fetchTasks} />

      <div className="space-y-3">
        {tasks.map((task) => {
          const status = statusConfig[task.lastStatus] || statusConfig.never;
          const StatusIcon = status.icon;
          return (
            <Card key={task.id} className={!task.enabled ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm">{task.name}</h3>
                      <Badge variant="outline" className={`text-[10px] ${status.color}`}>
                        <StatusIcon className={`size-3 mr-1 ${task.lastStatus === 'running' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mb-1">{task.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{task.prompt}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.channels.map((ch) => (
                        <Badge key={ch} variant="secondary" className="text-[10px] capitalize">
                          {ch}
                        </Badge>
                      ))}
                      <span className="text-[10px] text-muted-foreground">
                        {task.repeatType} · {task.cronExpr}
                      </span>
                      {task.lastRunAt && (
                        <span className="text-[10px] text-muted-foreground">
                          Last: {formatDistanceToNow(new Date(task.lastRunAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-emerald-500 hover:text-emerald-600"
                      onClick={(e) => { e.stopPropagation(); handleRunNow(task.id); }}
                      disabled={task.lastStatus === 'running' || !task.enabled}
                      title="Run now"
                    >
                      <Play className="size-3.5" />
                    </Button>
                    <Switch
                      checked={task.enabled}
                      onCheckedChange={(checked) => handleToggle(task.id, checked)}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-red-500">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Task?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete &ldquo;{task.name}&rdquo;. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(task.id)} className="bg-red-600 hover:bg-red-700">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
