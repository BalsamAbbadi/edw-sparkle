import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, Award, AlertTriangle, X, ChevronDown, BarChart3, PieChart as PieIcon, Activity } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar } from 'recharts';

type DrillView = 'collected' | 'outstanding' | 'expected' | 'ranking' | null;
type RankingMode = 'income' | 'ratio' | 'students' | 'collection' | 'ending';

export default function IncomePage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [detailModal, setDetailModal] = useState<any>(null);
  const [drillView, setDrillView] = useState<DrillView>(null);
  const [rankingMode, setRankingMode] = useState<RankingMode>('income');

  const { data: payments = [] } = useQuery({
    queryKey: ['all-payments-income'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('*, students(name), courses(title, fees, is_archived, archived_at)').order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['all-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('enrollments').select('course_id, student_id');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sessions').select('course_id, session_date');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses-income'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Exclude ALL archived courses from active stats
  const activePayments = payments.filter((p: any) => !p.courses?.is_archived);

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), 11 - i);
    const ms = startOfMonth(date), me = endOfMonth(date);
    const mp = activePayments.filter((p: any) => { const d = new Date(p.created_at); return d >= ms && d <= me; });
    return {
      month: format(date, 'MMM', { locale: lang === 'ar' ? ar : undefined }),
      collected: mp.reduce((s: number, p: any) => s + Number(p.amount_paid), 0),
      total: mp.reduce((s: number, p: any) => s + Number(p.total_amount), 0),
      outstanding: mp.reduce((s: number, p: any) => s + Number(p.total_amount) - Number(p.amount_paid), 0),
    };
  });

  const totalCollected = activePayments.reduce((s: number, p: any) => s + Number(p.amount_paid), 0);
  const totalExpected = activePayments.reduce((s: number, p: any) => s + Number(p.total_amount), 0);
  const totalOutstanding = totalExpected - totalCollected;

  // Course income data
  const courseIncome: Record<string, { title: string; total: number; collected: number; studentCount: number; lastSession: string; totalSessions: number; isArchived: boolean }> = {};
  activePayments.forEach((p: any) => {
    const cid = p.course_id;
    if (!courseIncome[cid]) courseIncome[cid] = { title: p.courses?.title || '', total: 0, collected: 0, studentCount: 0, lastSession: '', totalSessions: 0, isArchived: p.courses?.is_archived || false };
    courseIncome[cid].total += Number(p.total_amount);
    courseIncome[cid].collected += Number(p.amount_paid);
  });
  enrollments.forEach((e: any) => {
    if (courseIncome[e.course_id]) courseIncome[e.course_id].studentCount++;
  });

  const courseList = Object.entries(courseIncome).map(([id, data]) => {
    const courseSessions = sessions.filter((s: any) => s.course_id === id);
    const lastSession = courseSessions.sort((a: any, b: any) => b.session_date.localeCompare(a.session_date))[0]?.session_date || '';
    const daysToEnd = lastSession ? differenceInDays(new Date(lastSession), new Date()) : 999;
    return {
      id, ...data,
      collectionRate: data.total > 0 ? Math.round((data.collected / data.total) * 100) : 0,
      lastSession,
      totalSessions: courseSessions.length,
      daysToEnd,
    };
  });

  const getSortedCourses = () => {
    switch (rankingMode) {
      case 'income': return [...courseList].sort((a, b) => b.collected - a.collected);
      case 'ratio': return [...courseList].sort((a, b) => (b.total > 0 ? b.collected / b.total : 0) - (a.total > 0 ? a.collected / a.total : 0));
      case 'students': return [...courseList].sort((a, b) => b.studentCount - a.studentCount);
      case 'collection': return [...courseList].sort((a, b) => b.collectionRate - a.collectionRate);
      case 'ending': return [...courseList].sort((a, b) => a.daysToEnd - b.daysToEnd);
      default: return courseList;
    }
  };

  const bestCourse = [...courseList].sort((a, b) => b.collected - a.collected)[0];

  const pieData = [
    { name: t('مدفوع', 'Paid'), value: activePayments.filter((p: any) => p.status === 'full').length, fill: 'hsl(var(--success))' },
    { name: t('جزئي', 'Partial'), value: activePayments.filter((p: any) => p.status === 'partial').length, fill: 'hsl(var(--warning))' },
    { name: t('غير مدفوع', 'Unpaid'), value: activePayments.filter((p: any) => p.status === 'unpaid').length, fill: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  const chartConfig = {
    collected: { label: t('المحصّل', 'Collected'), color: 'hsl(var(--success))' },
    outstanding: { label: t('المتبقي', 'Outstanding'), color: 'hsl(var(--destructive))' },
  };

  const timelinePayments = [...activePayments].filter((p: any) => p.amount_paid > 0).sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 20);

  // Course-level bar chart data
  const courseBarData = courseList.slice(0, 10).map(c => ({
    name: c.title.length > 12 ? c.title.slice(0, 12) + '...' : c.title,
    collected: c.collected,
    outstanding: c.total - c.collected,
    students: c.studentCount,
    rate: c.collectionRate,
  }));

  // Collection rate radial data
  const radialData = courseList.slice(0, 6).map((c, i) => ({
    name: c.title,
    value: c.collectionRate,
    fill: ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', '#8b5cf6', '#06b6d4'][i % 6],
  }));

  const rankModes: { key: RankingMode; label: string }[] = [
    { key: 'income', label: t('حسب الدخل', 'By Income') },
    { key: 'students', label: t('حسب عدد الطلاب', 'By Students') },
    { key: 'collection', label: t('حسب نسبة التحصيل', 'By Collection Rate') },
    { key: 'ratio', label: t('حسب نسبة الدخل', 'By Income Ratio') },
    { key: 'ending', label: t('حسب قرب الانتهاء', 'By Ending Soon') },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{t('الدخل', 'Income')}</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => setDrillView('collected')} className="glass-card rounded-xl p-5 bg-card/60 backdrop-blur-xl border border-border/50 text-start hover:ring-2 hover:ring-success/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-success" /></div>
            <div><p className="text-2xl font-bold text-foreground">{totalCollected} ₪</p><p className="text-xs text-muted-foreground">{t('إجمالي المحصّل', 'Total Collected')}</p></div>
          </div>
        </button>
        <button onClick={() => setDrillView('outstanding')} className="glass-card rounded-xl p-5 bg-card/60 backdrop-blur-xl border border-border/50 text-start hover:ring-2 hover:ring-destructive/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold text-foreground">{totalOutstanding} ₪</p><p className="text-xs text-muted-foreground">{t('المتبقي', 'Outstanding')}</p></div>
          </div>
        </button>
        <button onClick={() => setDrillView('expected')} className="glass-card rounded-xl p-5 bg-card/60 backdrop-blur-xl border border-border/50 text-start hover:ring-2 hover:ring-primary/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{totalExpected} ₪</p><p className="text-xs text-muted-foreground">{t('الإجمالي المتوقع', 'Expected')}</p></div>
          </div>
        </button>
        <button onClick={() => setDrillView('ranking')} className="glass-card rounded-xl p-5 bg-card/60 backdrop-blur-xl border border-border/50 text-start hover:ring-2 hover:ring-accent/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center"><Award className="w-5 h-5 text-accent-foreground" /></div>
            <div><p className="text-sm font-bold text-foreground truncate">{bestCourse?.title || '-'}</p><p className="text-xs text-muted-foreground">{t('أفضل دورة', 'Top Course')} {bestCourse ? `- ${bestCourse.collected} ₪` : ''}</p></div>
          </div>
        </button>
      </div>

      {/* Drill-down Views */}
      <AnimatePresence>
        {drillView && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4" onClick={() => setDrillView(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-card/95 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">
                  {drillView === 'collected' && t('تفاصيل المحصّل', 'Collected Details')}
                  {drillView === 'outstanding' && t('تفاصيل المتبقي', 'Outstanding Details')}
                  {drillView === 'expected' && t('تفاصيل المتوقع', 'Expected Details')}
                  {drillView === 'ranking' && t('تصنيف الدورات', 'Course Rankings')}
                </h3>
                <button onClick={() => setDrillView(null)}><X className="w-5 h-5" /></button>
              </div>

              {drillView === 'ranking' ? (
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {rankModes.map(m => (
                      <button key={m.key} onClick={() => setRankingMode(m.key)} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${rankingMode === m.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>{m.label}</button>
                    ))}
                  </div>
                  {/* Ranking chart */}
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getSortedCourses().slice(0, 8).map(c => ({
                        name: c.title.length > 10 ? c.title.slice(0, 10) + '..' : c.title,
                        value: rankingMode === 'students' ? c.studentCount : rankingMode === 'ending' ? Math.max(0, c.daysToEnd) : c.collected,
                        rate: c.collectionRate,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {getSortedCourses().map((c, i) => (
                      <div key={c.id} className="glass-card rounded-xl p-4 bg-card/60 border border-border/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
                            <h4 className="font-bold text-foreground">{c.title}</h4>
                          </div>
                          <span className="text-sm font-bold text-foreground">{c.collected} ₪</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span>👩‍🎓 {c.studentCount} {t('طالب', 'students')}</span>
                          <span>{t('المتوقع:', 'Expected:')} {c.total} ₪</span>
                          <span>{t('التحصيل:', 'Collection:')} {c.collectionRate}%</span>
                          <span>{t('الحصص:', 'Sessions:')} {c.totalSessions}</span>
                          {rankingMode === 'ending' && <span className={c.daysToEnd <= 7 ? 'text-destructive font-bold' : ''}>{c.daysToEnd <= 0 ? t('انتهت', 'Ended') : `${c.daysToEnd} ${t('يوم', 'days')}`}</span>}
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${c.collectionRate}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {courseList.map(c => {
                    const value = drillView === 'collected' ? c.collected : drillView === 'outstanding' ? (c.total - c.collected) : c.total;
                    return (
                      <div key={c.id} className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{c.title}</p>
                          <p className="text-xs text-muted-foreground">👩‍🎓 {c.studentCount} • {t('التحصيل:', 'Rate:')} {c.collectionRate}%</p>
                        </div>
                        <span className="font-bold text-foreground">{value} ₪</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 bg-card/60 backdrop-blur-xl border border-border/50">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />{t('الأرباح الشهرية', 'Monthly Revenue')}</h3>
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
        <div className="glass-card rounded-2xl p-6 bg-card/60 backdrop-blur-xl border border-border/50">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><PieIcon className="w-5 h-5 text-primary" />{t('توزيع حالات الدفع', 'Payment Distribution')}</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" onClick={(data) => setDetailModal(data)} className="cursor-pointer">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} className="hover:opacity-80 transition-opacity" />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} formatter={(value: any, name: any) => [`${value} ${t('طالب', 'students')}`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 - Per course */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 bg-card/60 backdrop-blur-xl border border-border/50">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />{t('دخل كل دورة', 'Income Per Course')}</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="name" className="text-xs" width={100} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="collected" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} name={t('المحصّل', 'Collected')} stackId="a" />
                <Bar dataKey="outstanding" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} name={t('المتبقي', 'Outstanding')} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 bg-card/60 backdrop-blur-xl border border-border/50">
          <h3 className="text-lg font-bold text-foreground mb-4">{t('نسبة التحصيل لكل دورة', 'Collection Rate Per Course')}</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialData} startAngle={180} endAngle={0}>
                <RadialBar dataKey="value" cornerRadius={8} label={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} formatter={(v: any) => [`${v}%`]} />
                <Legend formatter={(value, entry: any) => entry?.payload?.name || value} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 3 - Trend + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 bg-card/60 backdrop-blur-xl border border-border/50">
          <h3 className="text-lg font-bold text-foreground mb-4">{t('اتجاه الدخل', 'Income Trend')}</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="collected" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.2} name={t('المحصّل', 'Collected')} />
                <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} name={t('المتوقع', 'Expected')} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 bg-card/60 backdrop-blur-xl border border-border/50">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {t('طلاب متأخرون', 'Late Payments')} ({activePayments.filter((p: any) => p.status !== 'full').length})
          </h3>
          <div className="space-y-2 max-h-[230px] overflow-y-auto">
            {activePayments.filter((p: any) => p.status !== 'full').map((p: any) => (
              <div key={p.id} className={`rounded-lg p-3 flex items-center justify-between ${p.status === 'unpaid' ? 'bg-destructive/5 border border-destructive/20' : 'bg-warning/5 border border-warning/20'}`}>
                <div><p className="font-medium text-foreground text-sm">{p.students?.name}</p><p className="text-xs text-muted-foreground">{p.courses?.title}</p></div>
                <div className="text-end"><p className="text-sm font-bold">{p.amount_paid}/{p.total_amount} ₪</p></div>
              </div>
            ))}
            {activePayments.filter((p: any) => p.status !== 'full').length === 0 && <p className="text-center text-muted-foreground py-4">🎉</p>}
          </div>
        </div>
      </div>

      {/* Payment Timeline */}
      <div className="glass-card rounded-2xl p-6 bg-card/60 backdrop-blur-xl border border-border/50">
        <h3 className="text-lg font-bold text-foreground mb-4">{t('سجل الدفعات', 'Payment Timeline')}</h3>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {timelinePayments.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${p.status === 'full' ? 'bg-success' : p.status === 'partial' ? 'bg-warning' : 'bg-destructive'}`} />
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{p.students?.name} - {p.courses?.title}</p><p className="text-xs text-muted-foreground">{p.amount_paid} ₪ {t('من', 'of')} {p.total_amount} ₪</p></div>
              <span className="text-xs text-muted-foreground shrink-0">{format(new Date(p.updated_at), 'dd/MM')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pie Detail Modal */}
      <AnimatePresence>
        {detailModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4" onClick={() => setDetailModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md bg-card/95 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">{detailModal.name}</h3>
                <button onClick={() => setDetailModal(null)}><X className="w-5 h-5" /></button>
              </div>
              <p className="text-3xl font-bold text-foreground mb-2">{detailModal.value} {t('طالب', 'students')}</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {payments.filter((p: any) => {
                  if (detailModal.name.includes(t('مدفوع', 'Paid')) && !detailModal.name.includes(t('غير', 'Un'))) return p.status === 'full';
                  if (detailModal.name.includes(t('جزئي', 'Partial'))) return p.status === 'partial';
                  return p.status === 'unpaid';
                }).map((p: any) => (
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
