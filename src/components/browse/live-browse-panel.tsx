'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Globe, CheckCircle2, XCircle, Loader2, ArrowLeft, RefreshCw,
  Brain, Eye, MousePointer, Lightbulb, Search, Navigation,
  FileText, Send, ListChecks, ChevronDown, ChevronRight,
  Terminal, Copy, Check, ExternalLink, Zap, Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { apiFetch, apiEventSource } from '@/lib/api-client';
import type { BrowseTask } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

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

const PHASE_CONFIG: Record<string, { icon: typeof Brain; label: string; color: string; bg: string; border: string; dot: string }> = {
  observe: { icon: Eye, label: 'Observe', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-400' },
  think: { icon: Brain, label: 'Think', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', dot: 'bg-purple-400' },
  act: { icon: MousePointer, label: 'Act', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  reflect: { icon: Lightbulb, label: 'Reflect', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
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

const ACTION_LABELS: Record<string, string> = {
  navigate: 'Navigating',
  click_link: 'Clicking',
  fill_form: 'Filling Form',
  extract: 'Extracting',
  search: 'Searching',
  scroll: 'Scrolling',
  think: 'Reasoning',
  complete: 'Finished',
};

function getPhaseFromMessage(msg: StreamMessage): string {
  if (msg.phase) return msg.phase;
  if (msg.status === 'completed' || msg.status === 'done') return 'reflect';
  if (msg.status === 'error') return 'act';
  if (msg.action?.type === 'think' || msg.action?.type === 'navigate' || msg.action?.type === 'search') return 'think';
  if (msg.action?.type === 'click_link' || msg.action?.type === 'fill_form' || msg.action?.type === 'scroll') return 'act';
  if (msg.action?.type === 'extract' || msg.action?.type === 'complete') return 'reflect';
  return 'observe';
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
    </Button>
  );
}

export function LiveBrowsePanel() {
  const [tasks, setTasks] = useState<BrowseTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamDone, setStreamDone] = useState(false);
  const [initialMessages, setInitialMessages] = useState<StreamMessage[]>([]);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [finalSummary, setFinalSummary] = useState<string | null>(null);
  const [collapsedReasoning, setCollapsedReasoning] = useState<Record<number, boolean>>({});
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setView, pendingBrowseTaskId, setPendingBrowseTaskId } = useAppStore();

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showAllMessages]);

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

    if (pendingBrowseTaskId) {
      const pendingTask = tasks.find((t) => t.id === pendingBrowseTaskId);
      if (pendingTask) {
        setSelectedTaskId(pendingTask.id);
        setPendingBrowseTaskId(null);
        return;
      }
    }

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

  // Track unique URLs for breadcrumb
  const urlHistory = useMemo(() => {
    const urls: string[] = [];
    const seen = new Set<string>();
    for (const msg of displayMessages) {
      if (msg.url && !seen.has(msg.url)) {
        seen.add(msg.url);
        urls.push(msg.url);
      }
    }
    return urls;
  }, [displayMessages]);

  // Count turns
  const maxTurn = useMemo(() => {
    return Math.max(...displayMessages.map(m => m.turn || 0), 1);
  }, [displayMessages]);

  const currentUrl = displayMessages.length > 0
    ? (displayMessages[displayMessages.length - 1].url || selectedTask?.url || '')
    : (selectedTask?.url || '');

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
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView('tasks-browse')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 flex items-center justify-center">
              <Cpu className="size-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">Agent Execution</h2>
              <p className="text-[11px] text-muted-foreground/60">Real-time browsing intelligence</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedTask && (
            <div className="flex items-center gap-1.5 bg-muted/40 rounded-full px-3 py-1 border border-border/50">
              <div className={`size-1.5 rounded-full ${streamDone ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-[11px] font-medium text-muted-foreground">
                Turn {maxTurn} / {selectedTask.maxTurns}
              </span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={fetchTasks} className="gap-1.5 text-xs h-8 border-border/50">
            <RefreshCw className="size-3" />
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
              <motion.div key={task.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant={selectedTaskId === task.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`gap-2 text-xs h-8 ${
                    selectedTaskId === task.id
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-0 shadow-md shadow-emerald-500/20'
                      : 'border-border/50 bg-card/50 hover:bg-card hover:border-border/80'
                  }`}
                >
                  {task.status === 'running' ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Globe className="size-3" />
                  )}
                  <span className="max-w-[160px] truncate">{extractDomain(task.url)}</span>
                </Button>
              </motion.div>
            ))
        ) : (
          <div className="text-sm text-muted-foreground py-3 text-center w-full bg-card/30 rounded-lg border border-border/30">
            No active tasks running.
            <Button variant="link" className="text-emerald-500 p-0 h-auto ml-1 text-sm" onClick={() => setView('tasks-browse')}>
              Create one →
            </Button>
          </div>
        )}
      </div>

      {/* Task info bar */}
      {selectedTask && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 text-xs bg-gradient-to-r from-muted/40 to-muted/20 rounded-lg px-4 py-2.5 border border-border/30"
        >
          <Zap className="size-3.5 text-amber-400 shrink-0" />
          <span className="truncate flex-1 text-foreground/80 font-medium">{selectedTask.prompt}</span>
          {currentUrl && (
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-muted-foreground/60 hover:text-foreground/80 transition-colors shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="max-w-[200px] truncate">{extractDomain(currentUrl)}</span>
              <ExternalLink className="size-2.5" />
            </a>
          )}
        </motion.div>
      )}

      {/* Progress bar with turn markers */}
      {selectedTask && (
        <div className="space-y-2">
          <div className="relative h-1.5 bg-muted/40 rounded-full overflow-hidden">
            <motion.div
              className={`absolute inset-y-0 left-0 rounded-full ${
                streamDone && selectedTask.status === 'completed'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : streamDone && selectedTask.status === 'error'
                    ? 'bg-gradient-to-r from-red-500 to-red-400'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
              }`}
              initial={false}
              animate={{ width: `${Math.max(latestProgress, streamDone ? 100 : 2)}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
            {!streamDone && (
              <div
                className="absolute inset-y-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"
                style={{ width: `${Math.max(latestProgress, 2)}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground/50">
            <span>{Math.round(latestProgress)}% complete</span>
            <span>
              {streamDone
                ? (selectedTask.status === 'completed' ? 'Agent finished' : 'Execution stopped')
                : 'Processing...'
              }
            </span>
          </div>
        </div>
      )}

      {/* URL breadcrumb trail */}
      {selectedTask && urlHistory.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          <Navigation className="size-3 text-muted-foreground/40 shrink-0" />
          {urlHistory.map((url, i) => (
            <div key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="size-2.5 text-muted-foreground/30" />}
              <span className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                url === currentUrl
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-muted-foreground/50 hover:text-muted-foreground/80'
              }`}>
                {extractDomain(url)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Agent execution feed */}
      {selectedTask && (
        <Card className="border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden">
          {/* Terminal-style header */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20 border-b border-border/30">
            <div className="flex gap-1.5">
              <div className="size-2.5 rounded-full bg-red-500/60" />
              <div className="size-2.5 rounded-full bg-yellow-500/60" />
              <div className="size-2.5 rounded-full bg-green-500/60" />
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <Terminal className="size-3 text-muted-foreground/50" />
              <span className="text-[11px] text-muted-foreground/60 font-mono">
                agent-session-{selectedTask.id.substring(0, 8)}
              </span>
            </div>
            {currentUrl && (
              <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono truncate max-w-[200px]">
                {currentUrl}
              </span>
            )}
          </div>

          <CardContent className="p-0">
            {/* Message feed */}
            <div ref={scrollRef} className="max-h-[500px] overflow-y-auto p-3 space-y-1">
              <AnimatePresence initial={false}>
                {displayMessages.map((msg, i) => {
                  const phase = getPhaseFromMessage(msg);
                  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.observe;
                  const PhaseIcon = config.icon;
                  const ActionIcon = msg.action ? (ACTION_ICONS[msg.action.type] || MousePointer) : null;
                  const isLast = i === displayMessages.length - 1;
                  const isActive = isLast && !streamDone;
                  const actionLabel = msg.action ? (ACTION_LABELS[msg.action.type] || msg.action.type.replace('_', ' ')) : config.label;

                  // Collapse middle messages for long feeds
                  const shouldCollapse = !showAllMessages && displayMessages.length > 10 && i > 3 && i < displayMessages.length - 3;

                  if (shouldCollapse && i === 4) {
                    return (
                      <motion.button
                        key={`collapse-${i}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => setShowAllMessages(true)}
                        className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground/60 py-2 hover:text-muted-foreground transition-colors group"
                      >
                        <div className="flex-1 h-px bg-border/30" />
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/30 border border-border/30 group-hover:bg-muted/50 transition-colors">
                          <ChevronDown className="size-3" />
                          {displayMessages.length - 7} more steps
                        </span>
                        <div className="flex-1 h-px bg-border/30" />
                      </motion.button>
                    );
                  }
                  if (shouldCollapse) return null;

                  const hasReasoning = msg.action?.reasoning && msg.action.reasoning.length > 20;
                  const reasoningKey = i;

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className={`
                        group/msg relative rounded-lg p-3 transition-all duration-200
                        ${config.bg} ${isActive ? `ring-1 ${config.border}` : 'hover:bg-opacity-80'}
                      `}
                    >
                      {/* Active pulse indicator */}
                      {isActive && (
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-0.5">
                          <div className={`size-2 rounded-full ${config.dot}`}>
                            <div className={`absolute inset-0 rounded-full ${config.dot} animate-ping opacity-40`} />
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-2.5">
                        {/* Icon */}
                        <div className={`mt-0.5 shrink-0 size-7 rounded-md ${config.bg} border ${config.border} flex items-center justify-center`}>
                          {ActionIcon ? (
                            <ActionIcon className={`size-3.5 ${config.color}`} />
                          ) : (
                            <PhaseIcon className={`size-3.5 ${config.color} ${isActive ? 'animate-pulse' : ''}`} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Label row */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[11px] font-semibold uppercase tracking-wider ${config.color}`}>
                              {actionLabel}
                            </span>
                            {msg.turn !== undefined && msg.turn > 0 && (
                              <span className="text-[10px] font-mono text-muted-foreground/50 bg-muted/40 px-1.5 py-0.5 rounded">
                                T{msg.turn}
                              </span>
                            )}
                            {isActive && (
                              <span className="flex items-center gap-1 text-[10px] text-amber-400">
                                <Loader2 className="size-2.5 animate-spin" />
                                running
                              </span>
                            )}
                          </div>

                          {/* Message content */}
                          <p className={`text-[13px] leading-relaxed ${
                            msg.status === 'error' ? 'text-red-400' : 'text-foreground/85'
                          }`}>
                            {msg.message}
                          </p>

                          {/* Collapsible reasoning */}
                          {hasReasoning && (
                            <Collapsible
                              open={collapsedReasoning[reasoningKey] ?? (isActive || isLast)}
                              onOpenChange={(open) => setCollapsedReasoning(prev => ({ ...prev, [reasoningKey]: open }))}
                            >
                              <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-purple-400/70 hover:text-purple-400 mt-1.5 transition-colors">
                                <Brain className="size-3" />
                                <span>Reasoning</span>
                                <ChevronDown className="size-2.5 transition-transform" />
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-1.5 text-[12px] text-purple-300/60 italic leading-relaxed pl-4 border-l-2 border-purple-500/20">
                                  {msg.action!.reasoning!}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}

                          {/* Action data */}
                          {msg.action?.data && Object.keys(msg.action.data).length > 0 && (
                            <div className="mt-2 text-[11px] font-mono bg-black/20 rounded-md px-3 py-2 border border-border/20 overflow-x-auto">
                              {Object.entries(msg.action.data).map(([k, v]) => (
                                <div key={k} className="flex gap-2">
                                  <span className="text-muted-foreground/50">{k}:</span>
                                  <span className="text-foreground/70 truncate">{v}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {displayMessages.length === 0 && !streamDone && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-12"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-xl animate-pulse" />
                    <div className="relative size-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 flex items-center justify-center">
                      <Cpu className="size-6 text-purple-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground/70">Initializing Agent</p>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">Warming up the browser session...</p>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="size-1.5 rounded-full bg-purple-400/50"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Final Summary - Rich Markdown */}
            {finalSummary && streamDone && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.5 }}
              >
                <Separator className="bg-border/30" />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="size-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-400">Agent Report</p>
                        <p className="text-[10px] text-muted-foreground/50">Final analysis & summary</p>
                      </div>
                    </div>
                    <CopyButton text={finalSummary} />
                  </div>
                  <div className="rounded-lg bg-black/20 border border-border/20 p-4 max-h-72 overflow-y-auto">
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground/90 prose-p:text-foreground/75 prose-strong:text-foreground/90 prose-li:text-foreground/75 prose-code:text-emerald-300/80 prose-code:bg-muted/50 prose-code:px-1 prose-code:rounded prose-code:text-xs prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-emerald-500/30 prose-blockquote:text-foreground/60 prose-hr:border-border/30">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {finalSummary}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
