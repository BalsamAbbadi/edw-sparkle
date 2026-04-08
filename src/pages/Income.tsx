import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, Award, AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent
} from '@/components/ui/chart';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, LineChart, Line, Tooltip, Legend
} from 'recharts';

export default function IncomePage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [detailModal, setDetailModal] = useState<any>(null);

  const { data: payments = [] } = useQuery({
    queryKey: ['all-payments-income'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('*, students(name), courses(title, fees)').order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Monthly revenue (last 12 months)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), 11 - i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const monthPayments = payments.filter((p: any) => {
      const d = new Date(p.created_at);
      return d >= monthStart && d <= monthEnd;
    });
    const collected = monthPayments.reduce((s: number, p: any) => s + Number(p.amount_paid), 0);
    const total = monthPayments.reduce((s: number, p: any) => s + Number(p.total_amount), 0);
    return {
      month: format(date, 'MMM', { locale: lang === 'ar' ? ar : undefined }),
      collected,
      total,
      outstanding: total - collected,
    };
  });

  const totalCollected = payments.reduce((s: number, p: any) => s + Number(p.amount_paid), 0);
  const totalExpected = payments.reduce((s: number, p: any) => s + Number(p.total_amount), 0);
  const totalOutstanding = totalExpected - totalCollected;

  // Best course by income
  const courseIncome: Record<string, { title: string; total: number; collected: number }> = {};
  payments.forEach((p: any) => {
    const cid = p.course_id;
    if (!courseIncome[cid]) courseIncome[cid] = { title: p.courses?.title || '', total: 0, collected: 0 };
    courseIncome[cid].total += Number(p.total_amount);
    courseIncome[cid].collected += Number(p.amount_paid);
  });
  const courseRanking = Object.values(courseIncome).sort((a, b) => b.collected - a.collected);
  const bestCourse = courseRanking[0];

  // Late students
  const lateStudents = payments.filter((p: any) => p.status === 'unpaid' || p.status === 'partial');

  // Pie data
  const fullCount = payments.filter((p: any) => p.status === 'full').length;
  const partialCount = payments.filter((p: any) => p.status === 'partial').length;
  const unpaidCount = payments.filter((p: any) => p.status === 'unpaid').length;
  const pieData = [
    { name: t('مدفوع', 'Paid'), value: fullCount, fill: 'hsl(var(--success))' },
    { name: t('جزئي', 'Partial'), value: partialCount, fill: 'hsl(var(--warning))' },
    { name: t('غير مدفوع', 'Unpaid'), value: unpaidCount, fill: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  const chartConfig = {
    collected: { label: t('المحصّل', 'Collected'), color: 'hsl(var(--success))' },
    outstanding: { label: t('المتبقي', 'Outstanding'), color: 'hsl(var(--destructive))' },
  };

  // Payment timeline
  const timelinePayments = [...payments]
    .filter((p: any) => p.amount_paid > 0)
    .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 20);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{t('الدخل', 'Income')}</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-5 bg-card/80 backdrop-blur-md border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-success" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCollected} ₪</p>
              <p className="text-xs text-muted-foreground">{t('إجمالي المحصّل', 'Total Collected')}</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalOutstanding} ₪</p>
              <p className="text-xs text-muted-foreground">{t('المتبقي', 'Outstanding')}</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalExpected} ₪</p>
              <p className="text-xs text-muted-foreground">{t('الإجمالي المتوقع', 'Total Expected')}</p>
            </div>
          </div>
        </div>
        {bestCourse && (
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center"><Award className="w-5 h-5 text-accent-foreground" /></div>
              <div>
                <p className="text-sm font-bold text-foreground truncate">{bestCourse.title}</p>
                <p className="text-xs text-muted-foreground">{t('أفضل دورة دخلاً', 'Top Course')} - {bestCourse.collected} ₪</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <div className="glass-card rounded-2xl p-6 bg-card/80 backdrop-blur-md border border-border/50">
          <h3 className="text-lg font-bold text-foreground mb-4">{t('الأرباح الشهرية', 'Monthly Revenue')}</h3>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="collected" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name={t('المحصّل', 'Collected')} />
              <Bar dataKey="outstanding" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name={t('المتبقي', 'Outstanding')} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Pie Chart */}
        <div className="glass-card rounded-2xl p-6 bg-card/80 backdrop-blur-md border border-border/50">
          <h3 className="text-lg font-bold text-foreground mb-4">{t('توزيع حالات الدفع', 'Payment Status Distribution')}</h3>
          <div className="h-[280px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                  onClick={(data) => setDetailModal(data)} className="cursor-pointer">
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} className="hover:opacity-80 transition-opacity" />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, name: any) => [`${value} ${t('طالب', 'students')}`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Revenue by Course */}
      <div className="glass-card rounded-2xl p-6 bg-card/80 backdrop-blur-md border border-border/50">
        <h3 className="text-lg font-bold text-foreground mb-4">{t('الدخل حسب الدورة', 'Revenue by Course')}</h3>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={courseRanking.slice(0, 10)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis type="number" />
            <YAxis dataKey="title" type="category" width={120} className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="collected" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name={t('المحصّل', 'Collected')} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Late Students & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Late Students */}
        <div className="glass-card rounded-2xl p-6 bg-card/80 backdrop-blur-md border border-border/50">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {t('طلاب متأخرون بالدفع', 'Late Payments')} ({lateStudents.length})
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {lateStudents.map((p: any) => (
              <div key={p.id} className={`rounded-lg p-3 flex items-center justify-between ${p.status === 'unpaid' ? 'bg-destructive/5 border border-destructive/20' : 'bg-warning/5 border border-warning/20'}`}>
                <div>
                  <p className="font-medium text-foreground text-sm">{p.students?.name}</p>
                  <p className="text-xs text-muted-foreground">{p.courses?.title}</p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-bold text-foreground">{p.amount_paid}/{p.total_amount} ₪</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'unpaid' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'}`}>
                    {p.status === 'unpaid' ? t('غير مدفوع', 'Unpaid') : t('جزئي', 'Partial')}
                  </span>
                </div>
              </div>
            ))}
            {lateStudents.length === 0 && <p className="text-center text-muted-foreground py-4">{t('لا يوجد طلاب متأخرين 🎉', 'No late payments 🎉')}</p>}
          </div>
        </div>

        {/* Payment Timeline */}
        <div className="glass-card rounded-2xl p-6 bg-card/80 backdrop-blur-md border border-border/50">
          <h3 className="text-lg font-bold text-foreground mb-4">{t('سجل الدفعات', 'Payment Timeline')}</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {timelinePayments.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${p.status === 'full' ? 'bg-success' : p.status === 'partial' ? 'bg-warning' : 'bg-destructive'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.students?.name} - {p.courses?.title}</p>
                  <p className="text-xs text-muted-foreground">{p.amount_paid} ₪ {t('من', 'of')} {p.total_amount} ₪</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{format(new Date(p.updated_at), 'dd/MM')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pie Detail Modal */}
      <AnimatePresence>
        {detailModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4" onClick={() => setDetailModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">{detailModal.name}</h3>
                <button onClick={() => setDetailModal(null)}><X className="w-5 h-5" /></button>
              </div>
              <p className="text-3xl font-bold text-foreground mb-2">{detailModal.value} {t('طالب', 'students')}</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {payments
                  .filter((p: any) => {
                    if (detailModal.name.includes(t('مدفوع', 'Paid')) && !detailModal.name.includes(t('غير', 'Un'))) return p.status === 'full';
                    if (detailModal.name.includes(t('جزئي', 'Partial'))) return p.status === 'partial';
                    return p.status === 'unpaid';
                  })
                  .map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center rounded-lg bg-muted/50 px-3 py-2">
                      <span className="text-sm">{p.students?.name}</span>
                      <span className="text-sm font-medium">{p.amount_paid}/{p.total_amount} ₪</span>
                    </div>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
