'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Globe, CheckCircle2, XCircle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { apiFetch, apiEventSource } from '@/lib/api-client';
import type { BrowseTask } from '@/lib/types';

interface StreamMessage {
  type: string;
  status: string;
  progress: number;
  message: string;
}

export function LiveBrowsePanel() {
  const [tasks, setTasks] = useState<BrowseTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamDone, setStreamDone] = useState(false);
  const [initialMessages, setInitialMessages] = useState<StreamMessage[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { setView, pendingBrowseTaskId, setPendingBrowseTaskId } = useAppStore();

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  // Compute derived state for completed/error tasks
  useEffect(() => {
    if (!selectedTask) return;
    if (selectedTask.status === 'completed' || selectedTask.status === 'error') {
      const msgs = [
        {
          type: selectedTask.status,
          status: selectedTask.status,
          progress: selectedTask.progress,
          message: selectedTask.status === 'completed' ? 'Task completed' : selectedTask.error || 'Task failed',
        },
      ];
      setInitialMessages(msgs);
      setStreamDone(true);
    } else {
      setInitialMessages([]);
      setStreamDone(false);
    }
  }, [selectedTask?.id, selectedTask?.status, selectedTask?.error, selectedTask?.progress]);

  // Fetch tasks on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apiFetch<BrowseTask[]>('/api/tasks/browse');
        if (!cancelled) {
          setTasks(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Auto-select pending or running task when tasks load, or when a new task is passed from form
  useEffect(() => {
    if (tasks.length === 0) return;
    if (selectedTaskId) return;

    // Priority 1: Use the task ID passed from the creation form
    if (pendingBrowseTaskId) {
      const pendingTask = tasks.find((t) => t.id === pendingBrowseTaskId);
      if (pendingTask) {
        setSelectedTaskId(pendingTask.id);
        setPendingBrowseTaskId(null);
        return;
      }
    }

    // Priority 2: Auto-select the first pending or running task
    const activeTask = tasks.find((t) => t.status === 'pending' || t.status === 'running');
    if (activeTask) {
      setSelectedTaskId(activeTask.id);
    }
  }, [tasks, selectedTaskId, pendingBrowseTaskId, setPendingBrowseTaskId]);

  // Connect to SSE stream for active tasks (GET handler runs the agent)
  useEffect(() => {
    if (!selectedTask) return;
    if (selectedTask.status === 'completed' || selectedTask.status === 'error') return;

    setMessages([]);
    setStreamDone(false);

    const es = apiEventSource(`/api/tasks/browse/${selectedTask.id}/stream`);
    eventSourceRef.current = es;

    es.addEventListener('progress', (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    });

    es.addEventListener('done', () => {
      setStreamDone(true);
      es.close();
      // Refresh task list to get final status and resultSummary
      apiFetch<BrowseTask[]>('/api/tasks/browse').then((data) => setTasks(data)).catch(() => {});
    });

    es.addEventListener('error', () => {
      setMessages((prev) => [...prev, { type: 'error', status: 'error', progress: 0, message: 'Connection lost' }]);
      setStreamDone(true);
      es.close();
      // Refresh on error too
      apiFetch<BrowseTask[]>('/api/tasks/browse').then((data) => setTasks(data)).catch(() => {});
    });

    return () => {
      es.close();
    };
  }, [selectedTask?.id]);

  const displayMessages = initialMessages.length > 0 ? initialMessages : messages;

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<BrowseTask[]>('/api/tasks/browse');
      setTasks(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setView('tasks-browse')}>
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="text-lg font-semibold">Live Browse</h2>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTasks} className="gap-2">
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </div>

      {/* Task selector */}
      <div className="flex gap-2 flex-wrap">
        {tasks.filter((t) => t.status !== 'completed' && t.status !== 'error').length > 0 ? (
          tasks
            .filter((t) => t.status !== 'completed' && t.status !== 'error')
            .map((task) => (
              <Button
                key={task.id}
                variant={selectedTaskId === task.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTaskId(task.id)}
                className="gap-2 text-xs"
              >
                {task.status === 'running' ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Globe className="size-3" />
                )}
                {task.url.substring(0, 40)}...
              </Button>
            ))
        ) : (
          <div className="text-sm text-muted-foreground py-4 text-center w-full">
            No active browse tasks. Create one from the Browse Tasks page.
            <Button variant="link" className="text-emerald-500 p-0 h-auto ml-1" onClick={() => setView('tasks-browse')}>
              Go to Browse Tasks
            </Button>
          </div>
        )}
      </div>

      {/* Live feed */}
      {selectedTask && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="size-4 text-emerald-500" />
              {selectedTask.url}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress
              value={displayMessages.length > 0 ? displayMessages[displayMessages.length - 1].progress : selectedTask.progress}
              className="h-2"
            />

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {displayMessages.map((msg, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {msg.type === 'error' ? (
                    <XCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
                  ) : msg.type === 'done' ? (
                    <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                  ) : (
                    <Loader2 className={`size-4 text-emerald-500 mt-0.5 shrink-0 ${streamDone ? 'hidden' : 'animate-spin'}`} />
                  )}
                  <span className={msg.type === 'error' ? 'text-red-400' : ''}>{msg.message}</span>
                </div>
              ))}

              {displayMessages.length === 0 && !streamDone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Waiting for agent to start...
                </div>
              )}
            </div>

            {/* Show result summary for completed tasks */}
            {selectedTask.status === 'completed' && selectedTask.resultSummary && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-sm font-medium text-emerald-500 mb-1">Result</p>
                <p className="text-sm text-muted-foreground">{selectedTask.resultSummary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
