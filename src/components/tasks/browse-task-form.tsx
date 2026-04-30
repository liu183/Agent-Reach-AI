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
import { Plus, Globe, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import { apiFetch } from '@/lib/api-client';
import { motion } from 'framer-motion';

export function BrowseTaskForm() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const { setView, setPendingBrowseTaskId } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{id?: string; taskId?: string; error?: string}>('/api/tasks/browse', {
        method: 'POST',
        body: JSON.stringify({
          url: url.trim(),
          prompt: (prompt.trim() || 'Browse this page and provide a comprehensive summary') ,
        }),
      });
      if (!data.error) {
        const newTaskId = data.id || data.taskId;
        toast.success('Browse task created — switching to live view');
        setOpen(false);
        setUrl('');
        setPrompt('');
        setPendingBrowseTaskId(newTaskId || null);
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
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5">
          <Plus className="size-4" />
          New Browse Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg border-border/40 bg-card/95 backdrop-blur-sm">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
              <Sparkles className="size-5 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-lg">Browse & Summarize</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                The AI agent will navigate to the URL, read the page content, and generate a detailed report.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Feature hints */}
        <div className="flex gap-2 flex-wrap">
          {['Navigate pages', 'Extract data', 'Follow links', 'Summarize'].map((feature) => (
            <span key={feature} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground/60 border border-border/30">
              {feature}
            </span>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="text-xs font-medium text-foreground/80">
              Target URL
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
              <Input
                id="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-9 h-10 bg-muted/20 border-border/40 focus:border-emerald-500/50 focus:ring-emerald-500/20"
              />
            </div>
            <p className="text-[11px] text-muted-foreground/40">
              Enter the full URL of any publicly accessible webpage.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-xs font-medium text-foreground/80">
              Task Prompt
              <span className="text-muted-foreground/40 font-normal ml-1">(optional)</span>
            </Label>
            <Textarea
              id="prompt"
              placeholder="e.g., 'Summarize the main arguments in this article' or 'Extract all product prices and names'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="bg-muted/20 border-border/40 focus:border-emerald-500/50 focus:ring-emerald-500/20 resize-none"
            />
            <p className="text-[11px] text-muted-foreground/40">
              Leave empty for a general summary of the page content.
            </p>
          </div>
          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border/40">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !url.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="size-3.5" />
                  </motion.div>
                  Dispatching Agent...
                </>
              ) : (
                <>
                  Start Browsing
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
