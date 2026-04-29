import { StatsCards } from '@/components/dashboard/stats-cards';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ActivityChart } from '@/components/dashboard/activity-chart';

export function DashboardView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your agent platform activity.</p>
      </div>

      <StatsCards />

      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityChart />
        <ActivityTimeline />
      </div>

      <QuickActions />
    </div>
  );
}
