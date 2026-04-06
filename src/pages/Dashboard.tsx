import React from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, CreditCard, TrendingUp, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardCalendar } from '@/components/DashboardCalendar';

export default function Dashboard() {
  const { t } = useLanguage();

  const stats = [
    {
      icon: Users,
      label: t('إجمالي الطلاب', 'Total Students'),
      value: '0',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: BookOpen,
      label: t('الدورات النشطة', 'Active Courses'),
      value: '0',
      color: 'text-secondary-foreground',
      bgColor: 'bg-secondary',
    },
    {
      icon: CreditCard,
      label: t('المدفوعات المكتملة', 'Paid (Full)'),
      value: '0',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      icon: TrendingUp,
      label: t('مدفوعات جزئية', 'Paid (Partial)'),
      value: '0',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {t('مرحباً بك 👋', 'Welcome 👋')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('نظرة عامة على نشاطك اليوم', 'Overview of your activity today')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card"
          >
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

      {/* Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <DashboardCalendar />
      </motion.div>
    </div>
  );
}
