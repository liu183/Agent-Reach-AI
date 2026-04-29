'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { CHANNELS } from '@/lib/constants';
import { apiFetch } from '@/lib/api-client';

interface ScheduledTaskFormProps {
  onCreated?: () => void;
}

export function ScheduledTaskForm({ onCreated }: ScheduledTaskFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('Summarize the latest content from the selected channels.');
  const [channels, setChannels] = useState<string[]>([]);
  const [repeatType, setRepeatType] = useState('daily');
  const [loading, setLoading] = useState(false);

  const toggleChannel = (channelId: string) => {
    setChannels((prev) =>
      prev.includes(channelId) ? prev.filter((c) => c !== channelId) : [...prev, channelId]
    );
  };

  const getCronExpr = (repeat: string): string => {
    switch (repeat) {
      case 'hourly': return '0 * * * *';
      case 'daily': return '0 9 * * *';
      case 'weekday': return '0 9 * * 1-5';
      case 'weekly': return '0 10 * * 1';
      case 'monthly': return '0 9 1 * *';
      default: return '0 9 * * *';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a task name');
      return;
    }
    if (channels.length === 0) {
      toast.error('Please select at least one channel');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{error?: string}>('/api/tasks/scheduled', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          prompt: prompt.trim(),
          channels,
          cronExpr: getCronExpr(repeatType),
          repeatType,
        }),
      });
      if (!data.error) {
        toast.success('Scheduled task created');
        setOpen(false);
        setName('');
        setDescription('');
        setPrompt('Summarize the latest content from the selected channels.');
        setChannels([]);
        setRepeatType('daily');
        onCreated?.();
      } else {
        toast.error(data.error || 'Failed to create task');
      }
    } catch {
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="size-4" />
          New Scheduled Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-5 text-emerald-500" />
            Create Scheduled Task
          </DialogTitle>
          <DialogDescription>
            Set up recurring content collection and summarization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Task Name</Label>
            <Input id="name" placeholder="Daily GitHub Trending Report" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description (optional)</Label>
            <Input id="desc" placeholder="Collect trending repos from GitHub" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt">Task Prompt</Label>
            <Textarea id="prompt" placeholder="What should the agent do?" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Channels</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
              {CHANNELS.map((ch) => (
                <label key={ch.id} className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-muted/50">
                  <Checkbox checked={channels.includes(ch.id)} onCheckedChange={() => toggleChannel(ch.id)} />
                  <span className="text-xs truncate">{ch.name}</span>
                </label>
              ))}
            </div>
            {channels.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {channels.map((ch) => (
                  <Badge key={ch} variant="secondary" className="text-[10px] cursor-pointer" onClick={() => toggleChannel(ch)}>
                    {CHANNELS.find((c) => c.id === ch)?.name} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Repeat</Label>
            <Select value={repeatType} onValueChange={setRepeatType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Every Hour</SelectItem>
                <SelectItem value="daily">Every Day (9:00 AM)</SelectItem>
                <SelectItem value="weekday">Weekdays (9:00 AM)</SelectItem>
                <SelectItem value="weekly">Weekly (Monday 10:00 AM)</SelectItem>
                <SelectItem value="monthly">Monthly (1st 9:00 AM)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
