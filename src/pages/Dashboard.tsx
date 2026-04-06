import React from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, CreditCard, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { DashboardCalendar } from '@/components/DashboardCalendar';

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();

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

  const stats = [
    { icon: Users, label: t('إجمالي الطلاب', 'Total Students'), value: String(studentCount), color: 'text-primary', bgColor: 'bg-primary/10' },
    { icon: BookOpen, label: t('الدورات النشطة', 'Active Courses'), value: String(courseCount), color: 'text-secondary-foreground', bgColor: 'bg-secondary' },
    { icon: CreditCard, label: t('مدفوع بالكامل', 'Paid (Full)'), value: String(paymentStats.full), color: 'text-success', bgColor: 'bg-success/10' },
    { icon: TrendingUp, label: t('غير مدفوع', 'Unpaid'), value: String(paymentStats.unpaid), color: 'text-destructive', bgColor: 'bg-destructive/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('مرحباً بك 👋', 'Welcome 👋')}</h1>
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <DashboardCalendar />
      </motion.div>
    </div>
  );
}
