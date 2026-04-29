import { ScheduledTaskList } from '@/components/tasks/scheduled-task-list';

export function TasksScheduledView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Scheduled Tasks</h2>
        <p className="text-muted-foreground">Set up recurring content collection and summarization tasks.</p>
      </div>
      <ScheduledTaskList />
    </div>
  );
}
