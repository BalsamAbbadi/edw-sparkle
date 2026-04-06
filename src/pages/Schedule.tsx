import { Calendar } from 'lucide-react';
import { DashboardCalendar } from '@/components/DashboardCalendar';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SchedulePage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{t('الجدول', 'Schedule')}</h1>
      </div>
      <DashboardCalendar />
    </div>
  );
}
