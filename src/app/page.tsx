'use client';

import { useAppStore } from '@/store/app-store';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AnimatePresence, motion } from 'framer-motion';
import { ErrorBoundary } from '@/components/error-boundary';

import { DashboardView } from '@/components/views/dashboard-view';
import { ChannelsView } from '@/components/views/channels-view';
import { TasksScheduledView } from '@/components/views/tasks-scheduled-view';
import { TasksBrowseView } from '@/components/views/tasks-browse-view';
import { BrowseLiveView } from '@/components/views/browse-live-view';
import { ReportsView } from '@/components/views/reports-view';
import { ReportDetailView } from '@/components/views/report-detail-view';
import { MemoryView } from '@/components/views/memory-view';
import { SettingsView } from '@/components/views/settings-view';

const viewComponents: Record<string, React.ComponentType> = {
  dashboard: DashboardView,
  channels: ChannelsView,
  'tasks-scheduled': TasksScheduledView,
  'tasks-browse': TasksBrowseView,
  'browse-live': BrowseLiveView,
  reports: ReportsView,
  'report-detail': ReportDetailView,
  memory: MemoryView,
  settings: SettingsView,
};

export default function Home() {
  const { currentView } = useAppStore();
  const ViewComponent = viewComponents[currentView] || DashboardView;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <ErrorBoundary>
                <ViewComponent />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
