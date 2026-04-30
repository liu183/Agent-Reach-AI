'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, CheckCircle2, XCircle, Clock, Loader2, Trash2, ArrowUpRight, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import type { BrowseTask } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BrowseTaskListProps {
  onTaskClick?: (task: BrowseTask) => void;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Queued', color: 'text-zinc-400', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/20', icon: Clock },
  running: { label: 'Running', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', icon: Loader2 },
  completed: { label: 'Done', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', icon: CheckCircle2 },
  error: { label: 'Error', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', icon: XCircle },
};

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return url;
  }
}

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
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="h-28 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm"
          />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-border/30 bg-gradient-to-b from-card to-card/50 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl" />
              <div className="relative size-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                <Globe className="size-8 text-emerald-400/60" />
              </div>
            </div>
            <h3 className="font-semibold text-base mb-2 text-foreground/90">No Browse Tasks Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-[260px] leading-relaxed">
              Create your first browse task to let the AI agent fetch, analyze, and summarize web content for you.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <ScrollArea className="max-h-[600px]">
        <div className="space-y-2.5 pr-1">
          <AnimatePresence mode="popLayout">
            {tasks.map((task, idx) => {
              const status = statusConfig[task.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const domain = extractDomain(task.url);

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                  transition={{ delay: idx * 0.05, duration: 0.3, ease: 'easeOut' }}
                >
                  <Card
                    className={`
                      group cursor-pointer relative overflow-hidden transition-all duration-300
                      border-border/40 bg-gradient-to-br from-card via-card to-card/80 backdrop-blur-sm
                      hover:border-border/80 hover:shadow-lg hover:shadow-black/10
                      hover:-translate-y-0.5
                      ${task.status === 'running' ? 'ring-1 ring-amber-500/20 hover:ring-amber-500/30' : ''}
                      ${task.status === 'completed' ? 'hover:ring-1 hover:ring-emerald-500/20' : ''}
                    `}
                    onClick={() => onTaskClick?.(task)}
                  >
                    {/* Running shimmer effect */}
                    {task.status === 'running' && (
                      <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/[0.03] to-transparent animate-[shimmer_2s_infinite]" />
                      </div>
                    )}

                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Top row: status badge + time */}
                          <div className="flex items-center gap-2.5 mb-2.5">
                            <Badge
                              variant="outline"
                              className={`
                                text-[10px] font-medium gap-1 px-2 py-0.5 rounded-full border
                                ${status.bgColor} ${status.color} ${status.borderColor}
                                transition-all duration-300
                              `}
                            >
                              <StatusIcon className={`size-2.5 ${task.status === 'running' ? 'animate-spin' : ''}`} />
                              {status.label}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground/70">
                              {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                            </span>
                          </div>

                          {/* URL with domain icon */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Globe className="size-3 text-muted-foreground/50 shrink-0" />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-sm font-medium text-foreground/90 truncate group-hover:text-foreground transition-colors">
                                  {task.url}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[400px] break-all">
                                <p className="text-xs">{task.url}</p>
                              </TooltipContent>
                            </Tooltip>
                            <ArrowUpRight className="size-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all duration-300 shrink-0" />
                          </div>

                          {/* Prompt */}
                          <p className="text-xs text-muted-foreground/70 line-clamp-1 leading-relaxed">
                            {task.prompt}
                          </p>
                        </div>

                        {/* Delete button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0 text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="size-3" />
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

                      {/* Progress bar for running tasks */}
                      {(task.status === 'running' || task.status === 'pending') && (
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                            <span className="flex items-center gap-1">
                              {task.status === 'running' ? (
                                <Zap className="size-2.5 text-amber-400" />
                              ) : (
                                <Clock className="size-2.5" />
                              )}
                              {task.status === 'running' ? 'Agent working...' : 'Waiting in queue'}
                            </span>
                            <span>{Math.round(task.progress)}%</span>
                          </div>
                          <div className="relative h-1.5 bg-muted/50 rounded-full overflow-hidden">
                            <div
                              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                                task.status === 'running'
                                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                                  : 'bg-zinc-500/60'
                              }`}
                              style={{ width: `${Math.max(task.progress, 2)}%` }}
                            />
                            {task.status === 'running' && (
                              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" style={{ width: `${Math.max(task.progress, 2)}%` }} />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Completed summary */}
                      {task.status === 'completed' && task.resultSummary && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2.5 flex items-start gap-1.5"
                        >
                          <div className="size-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <p className="text-[11px] text-emerald-400/80 line-clamp-2 leading-relaxed">{task.resultSummary}</p>
                        </motion.div>
                      )}

                      {/* Error message */}
                      {task.status === 'error' && task.error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2.5 flex items-start gap-1.5"
                        >
                          <div className="size-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          <p className="text-[11px] text-red-400/80 line-clamp-2 leading-relaxed">{task.error}</p>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}
