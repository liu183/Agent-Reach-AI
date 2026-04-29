'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Pin, Tag, Calendar } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import type { MemoryEntry } from '@/lib/types';
import { MEMORY_LEVELS } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';

export function MemoryViewer() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async (level?: string) => {
    try {
      const params = level ? `?level=${level}` : '';
      const data = await apiFetch<MemoryEntry[]>(`/api/memory${params}`);
      setEntries(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="size-5 text-emerald-500" />
        <h2 className="text-lg font-semibold">Agent Memory System</h2>
      </div>

      <Tabs defaultValue="all" onValueChange={(v) => fetchEntries(v === 'all' ? undefined : v)}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          {MEMORY_LEVELS.map((level) => (
            <TabsTrigger key={level.level} value={String(level.level)} className="text-xs">
              L{level.level}: {level.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {MEMORY_LEVELS.map((level) => (
          <TabsContent key={level.level} value={String(level.level)} className="mt-4">
            <MemoryLevelView level={level.level} entries={entries.filter((e) => e.level === level.level)} loading={loading} />
          </TabsContent>
        ))}
        <TabsContent value="all" className="mt-4">
          <MemoryLevelView level={-1} entries={entries} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MemoryLevelView({
  level,
  entries,
  loading,
}: {
  level: number;
  entries: MemoryEntry[];
  loading: boolean;
}) {
  const levelInfo = MEMORY_LEVELS.find((l) => l.level === level);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Brain className="size-10 text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">No Memory Entries</h3>
          <p className="text-sm text-muted-foreground text-center">
            {levelInfo ? `${levelInfo.name}: ${levelInfo.description}` : 'Memory entries will appear here as the agent learns.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {entries.map((entry) => (
        <Card key={entry.id} className="relative">
          {entry.pinned && (
            <div className="absolute top-2 right-2">
              <Pin className="size-3.5 text-emerald-500" />
            </div>
          )}
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] capitalize">
                L{entry.level}: {MEMORY_LEVELS.find((l) => l.level === entry.level)?.name || entry.category}
              </Badge>
              <Badge variant="secondary" className="text-[10px] capitalize">
                {entry.category}
              </Badge>
            </div>
            <CardTitle className="text-sm">{entry.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground prose prose-xs dark:prose-invert max-w-none mb-3 line-clamp-4">
              <ReactMarkdown>{entry.content}</ReactMarkdown>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1 flex-wrap">
                {entry.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] gap-1">
                    <Tag className="size-2.5" />
                    {tag}
                  </Badge>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="size-2.5" />
                {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
