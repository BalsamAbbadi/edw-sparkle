import React from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, CreditCard, TrendingUp, CalendarDays } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { DashboardCalendar } from '@/components/DashboardCalendar';
import { format, isToday } from 'date-fns';

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: studentCount = 0 } = useQuery({
    queryKey: ['student-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('students').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: courseCount = 0 } = useQuery({
    queryKey: ['course-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('courses').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: paymentStats = { full: 0, partial: 0, unpaid: 0 } } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('status');
      if (error) throw error;
      const full = data.filter(p => p.status === 'full').length;
      const partial = data.filter(p => p.status === 'partial').length;
      const unpaid = data.filter(p => p.status === 'unpaid').length;
      return { full, partial, unpaid };
    },
    enabled: !!user,
  });

  const { data: todaySessions = [] } = useQuery({
    queryKey: ['today-sessions'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase.from('sessions').select('*, courses(title)').eq('session_date', today).order('start_time', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const displayName = profile?.display_name || user?.email?.split('@')[0] || '';

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
  const remainingSessions = todaySessions.filter((s: any) => (s.end_time || s.start_time) > currentTimeStr);
  const completedSessions = todaySessions.length - remainingSessions.length;

  const stats = [
    { icon: Users, label: t('إجمالي الطلاب', 'Total Students'), value: String(studentCount), color: 'text-primary', bgColor: 'bg-primary/10' },
    { icon: BookOpen, label: t('الدورات النشطة', 'Active Courses'), value: String(courseCount), color: 'text-secondary-foreground', bgColor: 'bg-secondary' },
    { icon: CreditCard, label: t('مدفوع بالكامل', 'Paid (Full)'), value: String(paymentStats.full), color: 'text-success', bgColor: 'bg-success/10' },
    { icon: TrendingUp, label: t('غير مدفوع', 'Unpaid'), value: String(paymentStats.unpaid), color: 'text-destructive', bgColor: 'bg-destructive/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {t(`مرحباً بك ${displayName} 👋`, `Welcome ${displayName} 👋`)}
        </h1>
        <p className="text-muted-foreground mt-1">{t('نظرة عامة على نشاطك اليوم', 'Overview of your activity today')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Today's Sessions Summary */}
      {todaySessions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-5 bg-card/80 backdrop-blur-md border border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">
              {t(`لديك ${todaySessions.length} حصص اليوم`, `You have ${todaySessions.length} sessions today`)}
              {completedSessions > 0 && (
                <span className="text-sm text-muted-foreground font-normal ms-2">
                  ({t(`أنهيت ${completedSessions} حصة`, `${completedSessions} completed`)})
                </span>
              )}
            </h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {todaySessions.map((s: any) => {
              const isPast = (s.end_time || s.start_time) < currentTimeStr;
              return (
                <div key={s.id} className={`shrink-0 rounded-xl px-4 py-2.5 border text-sm ${isPast ? 'bg-muted/50 border-border/30 text-muted-foreground line-through' : `${s.color || 'bg-primary/10 border-primary/20 text-primary'}`}`}>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-xs opacity-70">{s.start_time?.slice(0, 5)}{s.end_time ? ` - ${s.end_time?.slice(0, 5)}` : ''}</p>
                </div>
              );
            })}
          </div>
          {remainingSessions.length > 0 ? (
            <p className="text-sm text-primary mt-2 font-medium">
              {t(`تبقى لديك ${remainingSessions.length} حصة`, `${remainingSessions.length} sessions remaining`)}
            </p>
          ) : (
            <p className="text-sm text-success mt-2 font-medium">{t('🎉 أنهيت جميع حصصك اليوم!', '🎉 All sessions completed!')}</p>
          )}
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <DashboardCalendar />
      </motion.div>
    </div>
  );
}
