import { PageShell } from '@/components/PageShell';
import { Calendar } from 'lucide-react';
import { DashboardCalendar } from '@/components/DashboardCalendar';

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">الجدول</h1>
      </div>
      <DashboardCalendar />
    </div>
  );
}
