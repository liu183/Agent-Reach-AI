'use client';

import { BrowseTaskForm } from '@/components/tasks/browse-task-form';
import { BrowseTaskList } from '@/components/browse/browse-task-list';
import type { BrowseTask } from '@/lib/types';
import { useAppStore } from '@/store/app-store';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, Globe, Clock, CheckCircle2, XCircle, Loader2,
  Copy, Check, Zap, RotateCcw, ExternalLink, FileText,
  Brain, Eye, MousePointer, Lightbulb, Terminal, BarChart3,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

const statusStyles: Record<string, { color: string; bg: string; border: string; icon: typeof CheckCircle2; animate?: string }> = {
  pending: { color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', icon: Clock },
  running: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Loader2, animate: 'animate-spin' },
  completed: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
  error: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle },
};

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground h-8"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Clock; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/20 border border-border/30">
      <div className={`size-7 rounded-md flex items-center justify-center ${color}`}>
        <Icon className="size-3.5" />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{label}</p>
        <p className="text-xs font-medium text-foreground/80">{value}</p>
      </div>
    </div>
  );
}

function TaskDetailView({ task, onBack }: { task: BrowseTask; onBack: () => void }) {
  const [rawTab] = useState(task.resultSummary || 'No summary available.');
  const status = statusStyles[task.status] || statusStyles.pending;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-5"
    >
      {/* Header with back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold truncate">{extractDomain(task.url)}</h2>
          <p className="text-[11px] text-muted-foreground/50 truncate">{task.url}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
          >
            <ExternalLink className="size-3" />
            Open
          </a>
        </div>
      </div>

      {/* Hero section with task metadata */}
      <Card className="border-border/30 bg-gradient-to-br from-card via-card to-card/80 backdrop-blur-sm overflow-hidden">
        {/* Status gradient accent bar */}
        <div className={`h-1 ${
          task.status === 'completed' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
          task.status === 'running' ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
          task.status === 'error' ? 'bg-gradient-to-r from-red-500 to-red-400' :
          'bg-gradient-to-r from-zinc-500 to-zinc-400'
        }`} />

        <CardContent className="p-5">
          {/* Status & prompt */}
          <div className="flex items-start gap-3 mb-4">
            <div className={`shrink-0 size-10 rounded-xl ${status.bg} border ${status.border} flex items-center justify-center`}>
              <StatusIcon className={`size-5 ${status.color} ${status.animate || ''}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}
                >
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </Badge>
                <span className="text-[11px] text-muted-foreground/50">
                  {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{task.prompt}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard
              icon={Globe}
              label="Source"
              value={extractDomain(task.url)}
              color="bg-blue-500/10 text-blue-400"
            />
            <StatCard
              icon={RotateCcw}
              label="Turns"
              value={`${task.turnsUsed} / ${task.maxTurns}`}
              color="bg-purple-500/10 text-purple-400"
            />
            <StatCard
              icon={BarChart3}
              label="Progress"
              value={`${Math.round(task.progress)}%`}
              color="bg-amber-500/10 text-amber-400"
            />
            <StatCard
              icon={Clock}
              label="Created"
              value={format(new Date(task.createdAt), 'MMM d, HH:mm')}
              color="bg-zinc-500/10 text-zinc-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabbed content */}
      <Tabs defaultValue="report" className="space-y-4">
        <TabsList className="bg-muted/30 border border-border/30 h-10 p-1">
          <TabsTrigger value="report" className="text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md px-3 h-8">
            <FileText className="size-3" />
            Report
          </TabsTrigger>
          <TabsTrigger value="steps" className="text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md px-3 h-8">
            <Zap className="size-3" />
            Agent Steps
          </TabsTrigger>
          <TabsTrigger value="raw" className="text-xs gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md px-3 h-8">
            <Terminal className="size-3" />
            Raw
          </TabsTrigger>
        </TabsList>

        {/* Report Tab */}
        <TabsContent value="report" className="mt-0">
          <AnimatePresence mode="wait">
            {(task.resultSummary || task.status === 'completed') ? (
              <motion.div
                key="report-content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/15 border-b border-border/20">
                    <span className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="size-3" />
                      Generated Report
                    </span>
                    <CopyButton text={task.resultSummary || 'No summary available.'} />
                  </div>
                  <CardContent className="p-5">
                    <div className="prose prose-sm dark:prose-invert max-w-none
                      prose-headings:text-foreground/90 prose-headings:font-semibold
                      prose-p:text-foreground/70 prose-p:leading-relaxed
                      prose-strong:text-foreground/85
                      prose-li:text-foreground/70
                      prose-code:text-emerald-300/80 prose-code:bg-muted/40 prose-code:px-1.5 prose-code:rounded-md prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
                      prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
                      prose-blockquote:border-emerald-500/30 prose-blockquote:text-foreground/60
                      prose-hr:border-border/30
                      prose-table:text-xs prose-th:text-foreground/70 prose-td:text-foreground/60 prose-th:border-border/30 prose-td:border-border/20
                      prose-pre:bg-black/30 prose-pre:border prose-pre:border-border/20 prose-pre:rounded-lg
                    ">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {task.resultSummary || 'No summary available. The task completed but did not generate a summary.'}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : task.error ? (
              <motion.div
                key="error-content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-red-500/20 bg-red-500/[0.03]">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="size-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <XCircle className="size-4 text-red-400" />
                      </div>
                      <p className="text-sm font-medium text-red-400">Execution Error</p>
                    </div>
                    <p className="text-sm text-red-400/70 leading-relaxed">{task.error}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="pending-content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-border/30">
                  <CardContent className="flex flex-col items-center justify-center py-12 px-6">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-xl animate-pulse" />
                      <div className="relative size-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 flex items-center justify-center">
                        <Brain className="size-6 text-purple-400 animate-pulse" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-foreground/70 mb-1">Report Pending</p>
                    <p className="text-xs text-muted-foreground/50 text-center">
                      The agent is still working. Check back when the task is complete.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Agent Steps Tab */}
        <TabsContent value="steps" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
              <div className="px-4 py-2.5 bg-muted/15 border-b border-border/20">
                <span className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="size-3" />
                  Execution Timeline
                </span>
              </div>
              <CardContent className="p-4">
                <div className="relative space-y-0">
                  {/* Timeline line */}
                  <div className="absolute left-[15px] top-3 bottom-3 w-px bg-border/40" />

                  <div className="space-y-4">
                    {/* Step 1: Initialization */}
                    <div className="flex items-start gap-3 relative">
                      <div className="size-[30px] rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 z-10">
                        <Eye className="size-3.5 text-blue-400" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-xs font-medium text-blue-400 mb-0.5">Observe</p>
                        <p className="text-[13px] text-foreground/70 leading-relaxed">
                          Agent navigated to <span className="font-mono text-[11px] bg-muted/40 px-1.5 py-0.5 rounded">{task.url}</span>
                        </p>
                      </div>
                    </div>

                    {/* Step 2: Analyze */}
                    <div className="flex items-start gap-3 relative">
                      <div className="size-[30px] rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 z-10">
                        <Brain className="size-3.5 text-purple-400" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-xs font-medium text-purple-400 mb-0.5">Think</p>
                        <p className="text-[13px] text-foreground/70 leading-relaxed">
                          Analyzing page structure and planning approach to fulfill the prompt.
                        </p>
                      </div>
                    </div>

                    {/* Step 3: Execute */}
                    <div className="flex items-start gap-3 relative">
                      <div className="size-[30px] rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 z-10">
                        <MousePointer className="size-3.5 text-amber-400" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-xs font-medium text-amber-400 mb-0.5">Act</p>
                        <p className="text-[13px] text-foreground/70 leading-relaxed">
                          Executed {task.turnsUsed} interaction {task.turnsUsed === 1 ? 'turn' : 'turns'} (navigation, clicks, form fills, etc.)
                        </p>
                      </div>
                    </div>

                    {/* Step 4: Report */}
                    <div className="flex items-start gap-3 relative">
                      <div className={`size-[30px] rounded-full flex items-center justify-center shrink-0 z-10 ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : task.status === 'error'
                            ? 'bg-red-500/10 border border-red-500/20'
                            : 'bg-zinc-500/10 border border-zinc-500/20'
                      }`}>
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="size-3.5 text-emerald-400" />
                        ) : task.status === 'error' ? (
                          <XCircle className="size-3.5 text-red-400" />
                        ) : (
                          <Lightbulb className="size-3.5 text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className={`text-xs font-medium mb-0.5 ${
                          task.status === 'completed' ? 'text-emerald-400' :
                          task.status === 'error' ? 'text-red-400' : 'text-zinc-400'
                        }`}>
                          {task.status === 'completed' ? 'Complete' : task.status === 'error' ? 'Failed' : 'Pending'}
                        </p>
                        <p className="text-[13px] text-foreground/70 leading-relaxed">
                          {task.status === 'completed'
                            ? 'Successfully generated report from gathered information.'
                            : task.status === 'error'
                              ? `Execution stopped: ${task.error || 'Unknown error'}`
                              : 'Waiting for agent to complete execution.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Raw Tab */}
        <TabsContent value="raw" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/15 border-b border-border/20">
                <span className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="size-3" />
                  Raw Output
                </span>
                <CopyButton text={rawTab} label="Copy raw" />
              </div>
              <CardContent className="p-4">
                <pre className="text-[12px] font-mono text-foreground/60 leading-relaxed whitespace-pre-wrap break-words max-h-[500px] overflow-y-auto">
                  {rawTab}
                </pre>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

export function TasksBrowseView() {
  const [selectedTask, setSelectedTask] = useState<BrowseTask | null>(null);
  const { setView } = useAppStore();

  return (
    <AnimatePresence mode="wait">
      {selectedTask ? (
        <TaskDetailView
          key={selectedTask.id}
          task={selectedTask}
          onBack={() => setSelectedTask(null)}
        />
      ) : (
        <motion.div
          key="task-list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Globe className="size-6 text-emerald-400" />
                Browse Tasks
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Dispatch AI agents to fetch, analyze, and summarize web content.
              </p>
            </div>
            <BrowseTaskForm />
          </div>
          <BrowseTaskList onTaskClick={setSelectedTask} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
