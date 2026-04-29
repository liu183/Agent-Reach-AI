// Agent Reach v2.0 — TypeScript Types & Interfaces

export type ViewType =
  | 'dashboard'
  | 'channels'
  | 'tasks-scheduled'
  | 'tasks-browse'
  | 'browse-live'
  | 'reports'
  | 'report-detail'
  | 'memory'
  | 'settings';

export interface ChannelDef {
  id: string;
  name: string;
  nameZh: string;
  tier: 0 | 1 | 2;
  icon: string;
  color: string;
  description: string;
  descriptionZh: string;
  needsAuth: boolean;
  authType: 'none' | 'cookie' | 'apikey' | 'browser';
  backends: string[];
}

export type ChannelHealth = 'ok' | 'warn' | 'off' | 'error' | 'unknown';

export interface TaskSchedule {
  id: string;
  name: string;
  description?: string;
  cronExpr: string;
  repeatType: string;
  prompt: string;
  channels: string[];
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  lastStatus: string;
}

export interface BrowseTask {
  id: string;
  url: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  turnsUsed: number;
  maxTurns: number;
  resultSummary?: string;
  error?: string;
  createdAt: string;
}

export interface Report {
  id: string;
  title: string;
  content: string;
  summary?: string;
  source: string;
  channel?: string;
  status: string;
  wordCount: number;
  createdAt: string;
}

export interface MemoryEntry {
  id: string;
  category: string;
  level: number;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
}

export interface DailyActivity {
  date: string;
  label: string;
  reports: number;
  tasks: number;
}

export interface DashboardStats {
  channelsOnline: number;
  channelsTotal: number;
  tasksToday: number;
  reportsTotal: number;
  reportsToday: number;
  agentSessions: number;
  recentReports: Report[];
  recentTasks: Array<{
    id: string;
    type: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
  dailyActivity: DailyActivity[];
}

export interface ChannelConfigData {
  id: string;
  channel: string;
  platform: string;
  tier: number;
  enabled: boolean;
  authConfig: Record<string, unknown>;
  healthStatus: ChannelHealth;
  lastCheck: string | null;
}

export interface AgentRunRequest {
  url: string;
  prompt: string;
  maxTurns?: number;
  saveReport?: boolean;
}

export interface AgentRunResponse {
  taskId: string;
  status: string;
  result?: string;
  reportId?: string;
}

export interface StreamEvent {
  type: 'progress' | 'thinking' | 'result' | 'error' | 'done';
  data: string;
  progress?: number;
}
