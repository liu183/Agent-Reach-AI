import { create } from 'zustand';
import type { ViewType, ChannelHealth } from '@/lib/types';

interface AppState {
  currentView: ViewType;
  selectedReportId: string | null;
  sidebarOpen: boolean;
  pendingBrowseTaskId: string | null;
  setView: (view: ViewType) => void;
  setSelectedReport: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setPendingBrowseTaskId: (id: string | null) => void;
  channelHealth: Record<string, ChannelHealth>;
  setChannelHealth: (channelId: string, status: ChannelHealth) => void;
  resetChannelHealth: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  selectedReportId: null,
  sidebarOpen: true,
  pendingBrowseTaskId: null,
  setView: (view) => set({ currentView: view }),
  setSelectedReport: (id) => set({ selectedReportId: id }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setPendingBrowseTaskId: (id) => set({ pendingBrowseTaskId: id }),
  channelHealth: {},
  setChannelHealth: (channelId, status) =>
    set((state) => ({ channelHealth: { ...state.channelHealth, [channelId]: status } })),
  resetChannelHealth: () => set({ channelHealth: {} }),
}));
