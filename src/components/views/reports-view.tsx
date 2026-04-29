import { ReportList } from '@/components/reports/report-list';

export function ReportsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">Browse generated summaries and insights.</p>
      </div>
      <ReportList />
    </div>
  );
}
