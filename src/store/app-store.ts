import { create } from 'zustand';
import type { ViewType, ChannelHealth } from '@/lib/types';

interface AppState {
  currentView: ViewType;
  selectedReportId: string | null;
  sidebarOpen: boolean;
  setView: (view: ViewType) => void;
  setSelectedReport: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  channelHealth: Record<string, ChannelHealth>;
  setChannelHealth: (channelId: string, status: ChannelHealth) => void;
  resetChannelHealth: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  selectedReportId: null,
  sidebarOpen: true,
  channelHealth: {},
  setView: (view) => set({ currentView: view }),
  setSelectedReport: (id) => set({ selectedReportId: id }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setChannelHealth: (channelId, status) =>
    set((state) => ({ channelHealth: { ...state.channelHealth, [channelId]: status } })),
  resetChannelHealth: () => set({ channelHealth: {} }),
}));
