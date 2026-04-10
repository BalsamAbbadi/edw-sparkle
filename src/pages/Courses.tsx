import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Edit2, Trash2, X, Clock, Users, Copy, Calendar as CalIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { addWeeks, addDays, format } from 'date-fns';
import { useNotification } from '@/hooks/useNotification';

interface CourseForm {
  title: string;
  description: string;
  duration: string;
  fees: number | '';
  totalSessions: number;
  startDate: string;
  sessionColor: string;
  course_type: string;
  payment_interval_sessions: number;
  recurring_schedule: { day: number; startTime: string; endTime: string }[];
}

const DAYS = [
  { value: 0, ar: 'الأحد', en: 'Sunday' },
  { value: 1, ar: 'الاثنين', en: 'Monday' },
  { value: 2, ar: 'الثلاثاء', en: 'Tuesday' },
  { value: 3, ar: 'الأربعاء', en: 'Wednesday' },
  { value: 4, ar: 'الخميس', en: 'Thursday' },
  { value: 5, ar: 'الجمعة', en: 'Friday' },
  { value: 6, ar: 'السبت', en: 'Saturday' },
];

const SESSION_COLORS = [
  'bg-primary/20 text-primary border-primary/30',
  'bg-secondary text-secondary-foreground border-secondary-foreground/20',
  'bg-success/20 text-success border-success/30',
  'bg-warning/20 text-warning border-warning/30',
  'bg-accent text-accent-foreground border-accent-foreground/20',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-lime-100 text-lime-700 border-lime-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-sky-100 text-sky-700 border-sky-200',
  'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  'bg-red-100 text-red-700 border-red-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
];

const emptyForm: CourseForm = {
  title: '', description: '', duration: '', fees: '', totalSessions: 16,
  startDate: format(new Date(), 'yyyy-MM-dd'), sessionColor: SESSION_COLORS[0],
  course_type: 'long', payment_interval_sessions: 0,
  recurring_schedule: []
};

export default function CoursesPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [showDuplicate, setShowDuplicate] = useState<any>(null);
  const [dupStartDate, setDupStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [courseTab, setCourseTab] = useState<'long' | 'short' | 'archived'>('long');

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ['enrollment-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('enrollments').select('course_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((e: any) => { counts[e.course_id] = (counts[e.course_id] || 0) + 1; });
      return counts;
    },
    enabled: !!user,
  });

  const { data: paymentsByCourse = {} } = useQuery({
    queryKey: ['payments-by-course'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('course_id, status');
      if (error) throw error;
      const result: Record<string, { full: number; partial: number; unpaid: number }> = {};
      data.forEach((p: any) => {
        if (!result[p.course_id]) result[p.course_id] = { full: 0, partial: 0, unpaid: 0 };
        if (p.status === 'full') result[p.course_id].full++;
        else if (p.status === 'partial') result[p.course_id].partial++;
        else result[p.course_id].unpaid++;
      });
      return result;
    },
    enabled: !!user,
  });

  const createSessions = async (courseId: string, courseTitle: string, schedule: any[], totalSessions: number, startDateStr: string, color: string) => {
    if (schedule.length === 0) return;
    const startDate = new Date(startDateStr);
    const sessions: any[] = [];
    let sessionCount = 0;
    const totalWeeks = Math.ceil(totalSessions / schedule.length);
    for (let week = 0; week < totalWeeks && sessionCount < totalSessions; week++) {
      for (const slot of schedule) {
        if (sessionCount >= totalSessions) break;
        const currentDay = startDate.getDay();
        const diff = (slot.day - currentDay + 7) % 7;
        const sessionDate = addWeeks(addDays(startDate, diff), week);
        if (sessionDate < startDate && week === 0) continue;
        sessions.push({
          course_id: courseId, user_id: user!.id, title: courseTitle,
          session_date: format(sessionDate, 'yyyy-MM-dd'), start_time: slot.startTime, end_time: slot.endTime || null, color,
        });
        sessionCount++;
      }
    }
    if (sessions.length > 0) await supabase.from('sessions').insert(sessions);
  };

  const saveMutation = useMutation({
    mutationFn: async (formData: CourseForm) => {
      const fees = formData.fees === '' ? 0 : Number(formData.fees);
      if (editingId) {
        const { error } = await supabase.from('courses').update({
          title: formData.title, description: formData.description, duration: formData.duration, fees, recurring_schedule: formData.recurring_schedule as any,
          course_type: formData.course_type, payment_interval_sessions: formData.payment_interval_sessions,
        } as any).eq('id', editingId);
        if (error) throw error;
        // Update total_amount in payments when fees change
        await supabase.from('payments').update({ total_amount: fees } as any).eq('course_id', editingId);
      } else {
        const { data: course, error } = await supabase.from('courses').insert({
          user_id: user!.id, title: formData.title, description: formData.description, duration: formData.duration, fees, recurring_schedule: formData.recurring_schedule as any,
          course_type: formData.course_type, payment_interval_sessions: formData.payment_interval_sessions, start_date: formData.startDate,
        } as any).select().single();
        if (error) throw error;
        await createSessions(course.id, formData.title, formData.recurring_schedule, formData.totalSessions, formData.startDate, formData.sessionColor);
        notify('course', t(`تم إنشاء دورة: ${formData.title}`, `Course created: ${formData.title}`), `/courses/${course.id}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(editingId ? t('تم تعديل الدورة', 'Course updated') : t('تم إنشاء الدورة', 'Course created'));
      resetForm();
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async ({ course, startDate }: { course: any; startDate: string }) => {
      const { data: newCourse, error } = await supabase.from('courses').insert({
        user_id: user!.id, title: `${course.title} (${t('نسخة', 'Copy')})`,
        description: course.description, duration: course.duration, fees: course.fees,
        recurring_schedule: course.recurring_schedule,
      }).select().single();
      if (error) throw error;
      const schedule = (course.recurring_schedule as any[]) || [];
      const { count } = await supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('course_id', course.id);
      await createSessions(newCourse.id, newCourse.title, schedule, count || 16, startDate, SESSION_COLORS[Math.floor(Math.random() * SESSION_COLORS.length)]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      setShowDuplicate(null);
      toast.success(t('تم نسخ الدورة', 'Course duplicated'));
    },
  });

  // CASCADE DELETE: delete enrollments, payments, sessions, notes, files when deleting course
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const course = courses.find(c => c.id === id);
      // Get students enrolled in this course
      const { data: enrollments } = await supabase.from('enrollments').select('student_id').eq('course_id', id);
      const studentIds = (enrollments || []).map((e: any) => e.student_id);
      // Delete related data
      await supabase.from('enrollments').delete().eq('course_id', id);
      await supabase.from('payments').delete().eq('course_id', id);
      await supabase.from('sessions').delete().eq('course_id', id);
      await supabase.from('notes').delete().eq('course_id', id);
      await supabase.from('files').delete().eq('course_id', id);
      // Delete students that were ONLY in this course
      for (const sid of studentIds) {
        const { count } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('student_id', sid);
        if (count === 0) {
          await supabase.from('students').delete().eq('id', sid);
        }
      }
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
      return course?.title || '';
    },
    onSuccess: (title) => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['all-notes'] });
      notify('course', t(`تم حذف الدورة: ${title}`, `Course deleted: ${title}`));
      toast.success(t('تم حذف الدورة وجميع بياناتها', 'Course and all related data deleted'));
    },
  });

  const resetForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };

  const startEdit = (course: any) => {
    setEditingId(course.id);
    setForm({
      title: course.title, description: course.description || '', duration: course.duration || '',
      fees: course.fees || '', totalSessions: 16, startDate: format(new Date(), 'yyyy-MM-dd'),
      sessionColor: SESSION_COLORS[0],
      course_type: (course as any).course_type || 'long',
      payment_interval_sessions: (course as any).payment_interval_sessions || 0,
      recurring_schedule: (course.recurring_schedule as any[]) || [],
    });
    setShowForm(true);
  };

  const addScheduleSlot = () => setForm(f => ({ ...f, recurring_schedule: [...f.recurring_schedule, { day: 0, startTime: '09:00', endTime: '10:00' }] }));
  const removeScheduleSlot = (idx: number) => setForm(f => ({ ...f, recurring_schedule: f.recurring_schedule.filter((_, i) => i !== idx) }));
  const updateScheduleSlot = (idx: number, field: string, value: any) => setForm(f => ({
    ...f, recurring_schedule: f.recurring_schedule.map((s, i) => i === idx ? { ...s, [field]: field === 'day' ? Number(value) : value } : s),
  }));

  const PaymentMiniChart = ({ stats }: { stats: { full: number; partial: number; unpaid: number } }) => {
    const total = stats.full + stats.partial + stats.unpaid;
    if (total === 0) return null;
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
          {stats.full > 0 && <div className="bg-success h-full" style={{ width: `${(stats.full / total) * 100}%` }} />}
          {stats.partial > 0 && <div className="bg-warning h-full" style={{ width: `${(stats.partial / total) * 100}%` }} />}
          {stats.unpaid > 0 && <div className="bg-destructive h-full" style={{ width: `${(stats.unpaid / total) * 100}%` }} />}
        </div>
        <div className="flex gap-1.5 text-[10px]">
          <span className="text-success">{stats.full}</span>
          <span className="text-warning">{stats.partial}</span>
          <span className="text-destructive">{stats.unpaid}</span>
        </div>
      </div>
    );
  };

  const filteredCourses = courses.filter((c: any) => {
    if (courseTab === 'archived') return (c as any).is_archived;
    if (courseTab === 'short') return (c as any).course_type === 'short' && !(c as any).is_archived;
    return ((c as any).course_type || 'long') === 'long' && !(c as any).is_archived;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t('الدورات', 'Courses')}</h1>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />{t('دورة جديدة', 'New Course')}
        </button>
      </div>

      {/* Course Type Tabs */}
      <div className="flex gap-2 bg-muted/50 backdrop-blur-sm rounded-lg p-1">
        {[
          { key: 'long' as const, label: t('دورات طويلة المدى', 'Long-term Courses') },
          { key: 'short' as const, label: t('دورات قصيرة المدى', 'Short-term Courses') },
          { key: 'archived' as const, label: t('أرشيف الدورات', 'Archived Courses') },
        ].map(tb => (
          <button key={tb.key} onClick={() => setCourseTab(tb.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${courseTab === tb.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-lg bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-bold">{editingId ? t('تعديل الدورة', 'Edit Course') : t('دورة جديدة', 'New Course')}</h2>
                <button onClick={resetForm}><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">{t('اسم الدورة', 'Course Title')}</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 text-foreground focus:ring-2 focus:ring-ring outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">{t('الوصف', 'Description')}</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 text-foreground focus:ring-2 focus:ring-ring outline-none resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">{t('المدة', 'Duration')}</label>
                    <input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder={t('3 أشهر', '3 months')} className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 text-foreground focus:ring-2 focus:ring-ring outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">{t('الرسوم (₪)', 'Fees (₪)')}</label>
                    <input type="number" value={form.fees} onChange={e => setForm(f => ({ ...f, fees: e.target.value === '' ? '' : Number(e.target.value) }))} min={0} placeholder={t('أدخل السعر', 'Enter price')} className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 text-foreground focus:ring-2 focus:ring-ring outline-none" />
                  </div>
                </div>

                {!editingId && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">{t('تاريخ البداية', 'Start Date')}</label>
                        <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 text-foreground focus:ring-2 focus:ring-ring outline-none" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">{t('عدد الحصص', 'Total Sessions')}</label>
                        <input type="number" value={form.totalSessions} onChange={e => setForm(f => ({ ...f, totalSessions: Number(e.target.value) }))} min={1} className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 text-foreground focus:ring-2 focus:ring-ring outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">{t('لون الحصص', 'Session Color')}</label>
                      <div className="flex flex-wrap gap-2">
                        {SESSION_COLORS.map((c, i) => (
                          <button key={i} type="button" onClick={() => setForm(f => ({ ...f, sessionColor: c }))}
                            className={`w-7 h-7 rounded-lg border-2 transition-all ${c.split(' ')[0]} ${form.sessionColor === c ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-transparent'}`} />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">{t('مواعيد الحصص', 'Weekly Schedule')}</label>
                    <button type="button" onClick={addScheduleSlot} className="text-xs text-primary hover:underline">{t('+ إضافة', '+ Add')}</button>
                  </div>
                  {form.recurring_schedule.length === 0 && <p className="text-xs text-muted-foreground">{t('أضف الأيام والأوقات', 'Add days and times')}</p>}
                  {form.recurring_schedule.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <select value={slot.day} onChange={e => updateScheduleSlot(idx, 'day', e.target.value)} className="px-2 py-1.5 rounded-lg border border-input bg-background/50 text-foreground text-sm flex-1">
                        {DAYS.map(d => <option key={d.value} value={d.value}>{lang === 'ar' ? d.ar : d.en}</option>)}
                      </select>
                      <input type="time" value={slot.startTime} onChange={e => updateScheduleSlot(idx, 'startTime', e.target.value)} className="px-2 py-1.5 rounded-lg border border-input bg-background/50 text-foreground text-sm" />
                      <span className="text-muted-foreground text-sm">-</span>
                      <input type="time" value={slot.endTime} onChange={e => updateScheduleSlot(idx, 'endTime', e.target.value)} className="px-2 py-1.5 rounded-lg border border-input bg-background/50 text-foreground text-sm" />
                      <button type="button" onClick={() => removeScheduleSlot(idx)} className="text-destructive"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>

                <button type="submit" disabled={saveMutation.isPending} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {saveMutation.isPending ? t('جاري الحفظ...', 'Saving...') : editingId ? t('حفظ التعديلات', 'Save') : t('إنشاء الدورة', 'Create')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Duplicate Modal */}
      <AnimatePresence>
        {showDuplicate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 p-6 space-y-4">
              <h3 className="text-lg font-bold">{t('نسخ الدورة', 'Duplicate Course')}</h3>
              <p className="text-sm text-muted-foreground">{showDuplicate.title}</p>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('تاريخ بداية الدورة الجديدة', 'New start date')}</label>
                <input type="date" value={dupStartDate} onChange={e => setDupStartDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => duplicateMutation.mutate({ course: showDuplicate, startDate: dupStartDate })} disabled={duplicateMutation.isPending} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50">{t('نسخ', 'Duplicate')}</button>
                <button onClick={() => setShowDuplicate(null)} className="px-4 py-2 rounded-lg bg-muted text-foreground">{t('إلغاء', 'Cancel')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map(i => <div key={i} className="glass-card rounded-xl p-6 animate-pulse h-48" />)}</div>
      ) : courses.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center bg-card/60 backdrop-blur-xl border border-border/50">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('لا توجد دورات بعد!', 'No courses yet!')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course: any) => {
            const studentNum = enrollmentCounts[course.id] || 0;
            const pStats = paymentsByCourse[course.id] || { full: 0, partial: 0, unpaid: 0 };
            return (
              <motion.div key={course.id} whileHover={{ y: -3 }} className="glass-card rounded-2xl overflow-hidden cursor-pointer group bg-card/60 backdrop-blur-xl border border-border/50" onClick={() => navigate(`/courses/${course.id}`)}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-foreground">{course.title}</h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setShowDuplicate(course); setDupStartDate(format(new Date(), 'yyyy-MM-dd')); }} className="p-1.5 rounded-lg hover:bg-muted"><Copy className="w-4 h-4 text-muted-foreground" /></button>
                      <button onClick={() => startEdit(course)} className="p-1.5 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
                      <button onClick={() => {
                        const msg = t('سيتم حذف الدورة وجميع الطلاب والدفعات المرتبطة بها. هل أنت متأكد؟', 'This will delete the course and all related students, payments, sessions. Are you sure?');
                        if (window.confirm(msg)) deleteMutation.mutate(course.id);
                      }} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                    </div>
                  </div>
                  {course.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {course.duration && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{course.duration}</span>}
                    {course.fees > 0 && <span>₪ {course.fees}</span>}
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{studentNum}</span>
                  </div>
                  <PaymentMiniChart stats={pStats} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
