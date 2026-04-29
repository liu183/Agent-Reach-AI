'use client';

import { BrowseTaskForm } from '@/components/tasks/browse-task-form';
import { BrowseTaskList } from '@/components/browse/browse-task-list';
import type { BrowseTask } from '@/lib/types';
import { useAppStore } from '@/store/app-store';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function TasksBrowseView() {
  const [selectedTask, setSelectedTask] = useState<BrowseTask | null>(null);
  const { setView } = useAppStore();

  if (selectedTask) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTask(null)}>
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="text-lg font-semibold flex-1 truncate">{selectedTask.url}</h2>
          <Badge
            variant={
              selectedTask.status === 'completed'
                ? 'default'
                : selectedTask.status === 'error'
                  ? 'destructive'
                  : 'secondary'
            }
            className={
              selectedTask.status === 'completed'
                ? 'bg-emerald-500/20 text-emerald-400'
                : ''
            }
          >
            {selectedTask.status}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{selectedTask.prompt}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Created: {new Date(selectedTask.createdAt).toLocaleString()} · Turns: {selectedTask.turnsUsed}/{selectedTask.maxTurns}
            </p>
          </CardHeader>
          {(selectedTask.resultSummary || selectedTask.status === 'completed') && (
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedTask.resultSummary || 'No summary available. The task completed but did not generate a summary.'}
                </ReactMarkdown>
              </div>
            </CardContent>
          )}
          {selectedTask.error && (
            <CardContent>
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
                {selectedTask.error}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Browse Tasks</h2>
          <p className="text-muted-foreground">Fetch and summarize web content on demand.</p>
        </div>
        <BrowseTaskForm />
      </div>
      <BrowseTaskList onTaskClick={setSelectedTask} />
    </div>
  );
}
