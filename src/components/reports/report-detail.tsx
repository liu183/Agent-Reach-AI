'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Clock, FileText } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { apiFetch } from '@/lib/api-client';
import type { Report } from '@/lib/types';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ReportDetail() {
  const { selectedReportId, setView } = useAppStore();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedId, setFetchedId] = useState<string | null>(null);

  // Fetch report data when selectedReportId changes
  useEffect(() => {
    if (selectedReportId && selectedReportId !== fetchedId) {
      setFetchedId(selectedReportId);
      setLoading(true);
      apiFetch<Report>(`/api/reports/${selectedReportId}`)
        .then((data) => {
          setReport(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
    if (!selectedReportId && fetchedId !== null) {
      setView('reports');
    }
  }, [selectedReportId, fetchedId, setView]);

  if (!selectedReportId) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-96" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="size-10 text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">Report Not Found</h3>
          <Button variant="outline" onClick={() => setView('reports')} className="mt-3">
            Back to Reports
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setView('reports')}>
          <ArrowLeft className="size-4" />
        </Button>
        <h2 className="text-lg font-semibold flex-1">Report Detail</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{report.title}</CardTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {report.channel && (
              <Badge variant="outline" className="capitalize text-xs">
                {report.channel}
              </Badge>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {format(new Date(report.createdAt), 'MMM d, yyyy HH:mm')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {report.wordCount} words
            </span>
            <Badge
              variant={report.status === 'completed' ? 'default' : 'secondary'}
              className={`text-xs ${report.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : ''}`}
            >
              {report.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-emerald-500 prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-pre:bg-muted">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.content}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
