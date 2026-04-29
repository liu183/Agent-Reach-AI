'use client';

import * as LucideIcons from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Zap } from 'lucide-react';
import type { ViewType } from '@/lib/types';

const navItems: { view: ViewType; label: string; icon: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { view: 'channels', label: 'Channels', icon: 'Rss' },
  { view: 'tasks-scheduled', label: 'Scheduled Tasks', icon: 'Calendar' },
  { view: 'tasks-browse', label: 'Browse Tasks', icon: 'Globe' },
  { view: 'reports', label: 'Reports', icon: 'FileText' },
  { view: 'memory', label: 'Memory', icon: 'Brain' },
  { view: 'settings', label: 'Settings', icon: 'Settings' },
];

export function AppSidebar() {
  const { currentView, setView } = useAppStore();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="gap-3" onClick={() => setView('dashboard')}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Zap className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Agent Reach</span>
                <span className="text-xs text-muted-foreground">v2.0</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[item.icon] || LucideIcons.Circle;
                return (
                  <SidebarMenuItem key={item.view}>
                    <SidebarMenuButton
                      isActive={currentView === item.view || (item.view === 'reports' && currentView === 'report-detail')}
                      onClick={() => setView(item.view)}
                      tooltip={item.label}
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Platforms</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="flex flex-wrap gap-1.5 px-2 py-1">
              {['Web', 'GitHub', 'Reddit', 'YouTube', 'Twitter', 'Bilibili', 'V2EX', 'RSS'].map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center rounded-md bg-sidebar-accent px-2 py-0.5 text-xs text-sidebar-accent-foreground"
                >
                  {name}
                </span>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" tooltip="Agent Reach v2.0">
              <span className="text-xs text-muted-foreground">Agent Reach v2.0</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
