'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import { apiFetch } from '@/lib/api-client';

export function BrowseTaskForm() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('Summarize this web page comprehensively in Markdown format.');
  const [loading, setLoading] = useState(false);
  const { setView } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{taskId?: string; error?: string}>('/api/tasks/browse', {
        method: 'POST',
        body: JSON.stringify({ url: url.trim(), prompt: prompt.trim() }),
      });
      if (!data.error) {
        toast.success('Browse task created successfully');
        setOpen(false);
        setUrl('');
        setPrompt('Summarize this web page comprehensively in Markdown format.');
        // Switch to live view
        setView('browse-live');
      } else {
        toast.error(data.error || 'Failed to create task');
      }
    } catch {
      toast.error('Failed to create browse task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="size-4" />
          New Browse Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-5 text-emerald-500" />
            Browse & Summarize
          </DialogTitle>
          <DialogDescription>
            Enter a URL and the agent will fetch, analyze, and summarize the content.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt">Task Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="What would you like the agent to do with this content?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Creating...' : 'Start Browsing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
