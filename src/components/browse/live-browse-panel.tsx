'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Globe, CheckCircle2, XCircle, Loader2, ArrowLeft, RefreshCw,
  Brain, Eye, MousePointer, Lightbulb, Search, Navigation,
  FileText, Send, ListChecks, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { apiFetch, apiEventSource } from '@/lib/api-client';
import type { BrowseTask } from '@/lib/types';

interface StreamMessage {
  phase?: string;
  status?: string;
  progress: number;
  message: string;
  turn?: number;
  url?: string;
  action?: {
    type: string;
    target?: string;
    data?: Record<string, string>;
    reasoning?: string;
  };
}

const PHASE_CONFIG: Record<string, { icon: typeof Brain; label: string; color: string }> = {
  observe: { icon: Eye, label: 'Observe', color: 'text-blue-400' },
  think: { icon: Brain, label: 'Think', color: 'text-purple-400' },
  act: { icon: MousePointer, label: 'Act', color: 'text-amber-400' },
  reflect: { icon: Lightbulb, label: 'Reflect', color: 'text-emerald-400' },
};

const ACTION_ICONS: Record<string, typeof Navigation> = {
  navigate: Navigation,
  click_link: MousePointer,
  fill_form: Send,
  extract: FileText,
  search: Search,
  scroll: ListChecks,
  think: Brain,
  complete: CheckCircle2,
};

export function LiveBrowsePanel() {
  const [tasks, setTasks] = useState<BrowseTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamDone, setStreamDone] = useState(false);
  const [initialMessages, setInitialMessages] = useState<StreamMessage[]>([]);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [finalSummary, setFinalSummary] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setView, pendingBrowseTaskId, setPendingBrowseTaskId } = useAppStore();

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Compute derived state for completed/error tasks
  useEffect(() => {
    if (!selectedTask) return;
    if (selectedTask.status === 'completed' || selectedTask.status === 'error') {
      setInitialMessages([{
        phase: selectedTask.status === 'completed' ? 'reflect' : 'act',
        status: selectedTask.status,
        progress: selectedTask.progress,
        message: selectedTask.status === 'completed'
          ? (selectedTask.resultSummary || 'Task completed successfully')
          : (selectedTask.error || 'Task failed'),
      }]);
      setFinalSummary(selectedTask.resultSummary || null);
      setStreamDone(true);
    } else {
      setInitialMessages([]);
      setFinalSummary(null);
      setStreamDone(false);
    }
  }, [selectedTask?.id, selectedTask?.status]);

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

  // Auto-select pending or running task
  useEffect(() => {
    if (tasks.length === 0) return;
    if (selectedTaskId) return;

    // Priority 1: task ID from creation form
    if (pendingBrowseTaskId) {
      const pendingTask = tasks.find((t) => t.id === pendingBrowseTaskId);
      if (pendingTask) {
        setSelectedTaskId(pendingTask.id);
        setPendingBrowseTaskId(null);
        return;
      }
    }

    // Priority 2: first pending or running task
    const activeTask = tasks.find((t) => t.status === 'pending' || t.status === 'running');
    if (activeTask) {
      setSelectedTaskId(activeTask.id);
    }
  }, [tasks, selectedTaskId, pendingBrowseTaskId, setPendingBrowseTaskId]);

  // Connect to SSE stream
  useEffect(() => {
    if (!selectedTask) return;
    if (selectedTask.status === 'completed' || selectedTask.status === 'error') return;

    setMessages([]);
    setStreamDone(false);
    setFinalSummary(null);

    const es = apiEventSource(`/api/tasks/browse/${selectedTask.id}/stream`);
    eventSourceRef.current = es;

    es.addEventListener('progress', (event) => {
      const data = JSON.parse(event.data) as StreamMessage;
      setMessages((prev) => [...prev, data]);

      // Check if complete signal is in message
      if (data.status === 'completed' || data.status === 'done') {
        setStreamDone(true);
      }
    });

    es.addEventListener('done', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.summary) setFinalSummary(data.summary);
        if (data.result) setFinalSummary((prev) => prev || data.result);
      } catch {}
      setStreamDone(true);
      es.close();
      apiFetch<BrowseTask[]>('/api/tasks/browse').then((data) => setTasks(data)).catch(() => {});
    });

    es.addEventListener('error', () => {
      setMessages((prev) => [...prev, { phase: 'act', status: 'error', progress: 0, message: 'Connection lost. The agent may still be running. Refresh to check.' }]);
      setStreamDone(true);
      es.close();
      apiFetch<BrowseTask[]>('/api/tasks/browse').then((data) => setTasks(data)).catch(() => {});
    });

    return () => { es.close(); };
  }, [selectedTask?.id]);

  const displayMessages = initialMessages.length > 0 ? initialMessages : messages;
  const latestProgress = displayMessages.length > 0
    ? displayMessages[displayMessages.length - 1].progress
    : (selectedTask?.progress || 0);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<BrowseTask[]>('/api/tasks/browse');
      setTasks(data);
    } catch {} finally {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setView('tasks-browse')}>
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="size-5 text-purple-400" />
            Autonomous Agent
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {selectedTask && (
            <Badge variant="outline" className="text-xs">
              Turn {Math.max(...messages.map(m => m.turn || 0), 1)} / {selectedTask.maxTurns}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchTasks} className="gap-2">
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        </div>
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
          <div className="text-sm text-muted-foreground py-2 text-center w-full">
            No active tasks.
            <Button variant="link" className="text-emerald-500 p-0 h-auto ml-1" onClick={() => setView('tasks-browse')}>
              Create one
            </Button>
          </div>
        )}
      </div>

      {/* Task info bar */}
      {selectedTask && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <span className="truncate flex-1">Task: {selectedTask.prompt}</span>
          <span className="text-xs">URL: {selectedTask.url}</span>
        </div>
      )}

      {/* Progress bar */}
      {selectedTask && (
        <Progress value={latestProgress} className="h-2" />
      )}

      {/* Agent execution feed */}
      {selectedTask && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="size-4 text-emerald-500" />
              {messages.length > 0 ? (messages[messages.length - 1].url || selectedTask.url) : selectedTask.url}
              {streamDone && (selectedTask.status === 'completed' || selectedTask.status === 'error') && (
                <Badge variant={selectedTask.status === 'completed' ? 'default' : 'destructive'} className="text-xs ml-auto">
                  {selectedTask.status === 'completed' ? 'Completed' : 'Error'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Message feed */}
            <div ref={scrollRef} className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {displayMessages.map((msg, i) => {
                const phase = msg.phase || msg.status || 'observe';
                const config = PHASE_CONFIG[phase] || PHASE_CONFIG.observe;
                const PhaseIcon = config.icon;
                const ActionIcon = msg.action ? (ACTION_ICONS[msg.action.type] || MousePointer) : null;
                const isTurnStart = msg.phase === 'think' || (i === 0);

                // For completed tasks with long messages, collapse middle messages
                const shouldCollapse = !showAllMessages && displayMessages.length > 8 && i > 2 && i < displayMessages.length - 2;

                if (shouldCollapse && i === 3) {
                  return (
                    <button
                      key={`collapse-${i}`}
                      onClick={() => setShowAllMessages(true)}
                      className="w-full text-center text-xs text-muted-foreground py-1 hover:text-foreground transition-colors"
                    >
                      ... {displayMessages.length - 5} more steps ...
                    </button>
                  );
                }
                if (shouldCollapse) return null;

                return (
                  <div key={i} className={`flex items-start gap-2 text-sm ${isTurnStart ? 'mt-3 pt-2 border-t border-border/50' : ''}`}>
                    <div className={`mt-0.5 shrink-0 ${config.color}`}>
                      {ActionIcon ? (
                        <ActionIcon className="size-4" />
                      ) : (
                        <PhaseIcon className={`size-4 ${!streamDone && i === displayMessages.length - 1 ? 'animate-pulse' : ''}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-medium ${config.color}`}>
                          {msg.action ? msg.action.type.replace('_', ' ') : phase}
                        </span>
                        {msg.turn !== undefined && msg.turn > 0 && (
                          <span className="text-xs text-muted-foreground">#{msg.turn}</span>
                        )}
                      </div>
                      {msg.action?.reasoning && i < displayMessages.length - 1 && (
                        <p className="text-xs text-muted-foreground italic mb-1 line-clamp-2">
                          {msg.action.reasoning}
                        </p>
                      )}
                      <p className={`text-sm ${msg.status === 'error' ? 'text-red-400' : 'text-foreground'}`}>
                        {msg.message}
                      </p>
                      {msg.action?.data && Object.keys(msg.action.data).length > 0 && (
                        <div className="mt-1 text-xs bg-muted/50 rounded px-2 py-1 font-mono">
                          {Object.entries(msg.action.data).map(([k, v]) => (
                            <span key={k}>{k}={v} </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {displayMessages.length === 0 && !streamDone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="size-4 animate-spin" />
                  Initializing agent...
                </div>
              )}
            </div>

            {/* Final Summary */}
            {finalSummary && streamDone && (
              <div className="mt-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-sm font-medium text-emerald-500 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="size-4" />
                  Agent Report
                </p>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {finalSummary}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
