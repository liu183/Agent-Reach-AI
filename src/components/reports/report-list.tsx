'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Clock, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { apiFetch } from '@/lib/api-client';
import type { Report } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

export function ReportList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const { setView, setSelectedReport } = useAppStore();

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (channelFilter) params.set('channel', channelFilter);
      const data = await apiFetch<{reports?: Report[]}>(`/api/reports?${params}`);
      setReports(data.reports || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(fetchReports, 300);
    return () => clearTimeout(debounce);
  }, [search, channelFilter]);

  const channels = [...new Set(reports.map((r) => r.channel).filter(Boolean))];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={channelFilter === '' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setChannelFilter('')}
          >
            All
          </Badge>
          {channels.map((ch) => (
            <Badge
              key={ch}
              variant={channelFilter === ch ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => setChannelFilter(channelFilter === ch ? '' : ch || '')}
            >
              {ch}
            </Badge>
          ))}
        </div>
      </div>

      {/* Report list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="size-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No Reports Found</h3>
            <p className="text-sm text-muted-foreground text-center">
              {search || channelFilter ? 'Try adjusting your search or filters.' : 'Create a browse task to generate reports.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {reports.map((report) => (
            <Card
              key={report.id}
              className="cursor-pointer transition-all hover:border-emerald-500/30 hover:shadow-sm"
              onClick={() => {
                setSelectedReport(report.id);
                setView('report-detail');
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm mb-1 line-clamp-1">{report.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{report.summary}</p>
                    <div className="flex items-center gap-2">
                      {report.channel && (
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {report.channel}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{report.wordCount} words</span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
