'use client';

import { useAppStore } from '@/store/app-store';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from './theme-toggle';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const viewTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  channels: 'Channels',
  'tasks-scheduled': 'Scheduled Tasks',
  'tasks-browse': 'Browse Tasks',
  'browse-live': 'Live Browse',
  reports: 'Reports',
  'report-detail': 'Report Detail',
  memory: 'Memory',
  settings: 'Settings',
};

export function Header() {
  const { currentView } = useAppStore();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="flex-1 text-sm font-semibold truncate">{viewTitles[currentView] || 'Agent Reach'}</h1>
      <Button variant="ghost" size="icon" className="size-8" disabled title="Notifications (coming soon)">
        <Bell className="size-4" />
      </Button>
      <ThemeToggle />
      <Avatar className="size-7">
        <AvatarFallback className="bg-emerald-600 text-white text-xs">AR</AvatarFallback>
      </Avatar>
    </header>
  );
}
