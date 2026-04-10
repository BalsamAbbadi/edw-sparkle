import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, User, BookOpen, CreditCard, Calendar, Edit2, X, Check, Phone, CheckSquare, Square } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNotification } from '@/hooks/useNotification';

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { notify } = useNotification();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', grade: '', gender: '', notes: '', phone: '' });
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');

  const { data: student } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['student-enrollments', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('enrollments').select('*, courses(*)').eq('student_id', id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['student-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('*, courses(title, fees)').eq('student_id', id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['student-attendance', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance').select('*, sessions(session_date, start_time, end_time, title, session_notes)').eq('student_id', id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // For each course, get total sessions done (past date)
  const { data: allSessions = [] } = useQuery({
    queryKey: ['all-sessions-for-student'],
    queryFn: async () => {
      const courseIds = enrollments.map((e: any) => e.course_id);
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase.from('sessions').select('*').in('course_id', courseIds).order('session_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: enrollments.length > 0,
  });

  const updateStudentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('students').update({
        name: editForm.name, grade: editForm.grade, gender: editForm.gender, notes: editForm.notes, phone: editForm.phone,
      }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', id] });
      qc.invalidateQueries({ queryKey: ['students'] });
      notify('student', t(`تم تعديل بيانات الطالب: ${editForm.name}`, `Student updated: ${editForm.name}`));
      toast.success(t('تم تحديث بيانات الطالب', 'Student updated'));
      setEditing(false);
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ payId, amount }: { payId: string; amount: number }) => {
      const { error } = await supabase.from('payments').update({ amount_paid: amount }).eq('id', payId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-payments', id] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      notify('payment', t('تم تحديث حالة الدفع', 'Payment updated'));
      toast.success(t('تم تحديث الدفعة', 'Payment updated'));
      setEditPaymentId(null);
    },
  });

  const statusColor = (status: string) => {
    if (status === 'full') return 'bg-success/20 text-success';
    if (status === 'partial') return 'bg-warning/20 text-warning';
    return 'bg-destructive/20 text-destructive';
  };
  const statusLabel = (status: string) => {
    if (status === 'full') return t('مدفوع', 'Paid');
    if (status === 'partial') return t('جزئي', 'Partial');
    return t('غير مدفوع', 'Unpaid');
  };

  if (!student) return <div className="p-8 text-center text-muted-foreground">{t('جاري التحميل...', 'Loading...')}</div>;

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted">
          <ArrowRight className="w-5 h-5 text-muted-foreground rtl:rotate-0 ltr:rotate-180" />
        </button>
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <User className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{student.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {student.grade && <span>{student.grade}</span>}
            {student.gender && <span>{student.gender === 'male' ? t('ذكر', 'Male') : t('أنثى', 'Female')}</span>}
            {student.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{student.phone}</span>}
          </div>
        </div>
        <button onClick={() => { setEditing(true); setEditForm({ name: student.name, grade: student.grade || '', gender: student.gender || '', notes: student.notes || '', phone: student.phone || '' }); }} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Edit2 className="w-4 h-4 inline me-1" />{t('تعديل', 'Edit')}
        </button>
      </div>

      {student.notes && <p className="text-sm text-muted-foreground bg-muted/30 backdrop-blur-sm rounded-xl p-4">{student.notes}</p>}

      {/* Edit Modal */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">{t('تعديل بيانات الطالب', 'Edit Student')}</h3>
                <button onClick={() => setEditing(false)}><X className="w-5 h-5" /></button>
              </div>
              <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder={t('الاسم', 'Name')} className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 text-foreground text-sm" />
              <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder={t('رقم الهاتف', 'Phone')} className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 text-foreground text-sm" />
              <input value={editForm.grade} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))} placeholder={t('الصف', 'Grade')} className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 text-foreground text-sm" />
              <select value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 text-foreground text-sm">
                <option value="">{t('الجنس', 'Gender')}</option>
                <option value="male">{t('ذكر', 'Male')}</option>
                <option value="female">{t('أنثى', 'Female')}</option>
              </select>
              <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder={t('ملاحظات', 'Notes')} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 text-foreground text-sm resize-none" />
              <button onClick={() => updateStudentMutation.mutate()} disabled={!editForm.name} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
                {t('حفظ التعديلات', 'Save Changes')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Courses & Payments */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />{t('الدورات المسجل بها', 'Enrolled Courses')}
        </h2>
        {enrollments.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">{t('لا توجد دورات', 'No courses')}</p>
        ) : (
          enrollments.map((enr: any) => {
            const course = enr.courses;
            const payment = payments.find((p: any) => p.course_id === enr.course_id);
            const courseSessions = allSessions.filter((s: any) => s.course_id === enr.course_id);
            const pastSessions = courseSessions.filter((s: any) => s.session_date <= today);
            const studentAttendance = attendance.filter((a: any) => a.course_id === enr.course_id);
            const attended = studentAttendance.filter((a: any) => a.is_present).length;

            return (
              <div key={enr.id} className="glass-card rounded-2xl p-5 bg-card/60 backdrop-blur-xl border border-border/50 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="cursor-pointer" onClick={() => navigate(`/courses/${enr.course_id}`)}>
                    <h3 className="font-bold text-foreground hover:text-primary transition-colors">{course?.title}</h3>
                    {course?.description && <p className="text-sm text-muted-foreground">{course.description}</p>}
                    <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                      {course?.fees > 0 && <span>₪ {course.fees}</span>}
                      {course?.duration && <span>{course.duration}</span>}
                    </div>
                  </div>
                  {payment && (
                    <div>
                      {editPaymentId === payment.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" value={editPaymentAmount} onChange={e => setEditPaymentAmount(e.target.value)} min={0} max={payment.total_amount} className="w-20 px-2 py-1 rounded border border-input bg-background text-foreground text-xs" />
                          <span className="text-xs text-muted-foreground">/ {payment.total_amount} ₪</span>
                          <button onClick={() => updatePaymentMutation.mutate({ payId: payment.id, amount: Number(editPaymentAmount) })} className="p-1 rounded hover:bg-success/10"><Check className="w-3.5 h-3.5 text-success" /></button>
                          <button onClick={() => setEditPaymentId(null)} className="p-1 rounded hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditPaymentId(payment.id); setEditPaymentAmount(String(payment.amount_paid || '')); }} className="flex items-center gap-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(payment.status)}`}>
                            {statusLabel(payment.status)} ({payment.amount_paid}/{payment.total_amount} ₪)
                          </span>
                          <Edit2 className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Attendance summary */}
                <div className="bg-muted/30 backdrop-blur-sm rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />{t('الحضور', 'Attendance')}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {t(`حضر ${attended} / ${pastSessions.length}`, `Attended ${attended} / ${pastSessions.length}`)}
                    </span>
                  </div>
                  {pastSessions.length > 0 && (
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pastSessions.length > 0 ? (attended / pastSessions.length) * 100 : 0}%` }} />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{t(`إجمالي الحصص: ${courseSessions.length}`, `Total sessions: ${courseSessions.length}`)}</p>
                </div>

                {/* Session log */}
                {pastSessions.length > 0 && (
                  <details className="group">
                    <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">{t('سجل الحصص', 'Session Log')}</summary>
                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                      {pastSessions.map((s: any) => {
                        const att = studentAttendance.find((a: any) => a.session_id === s.id);
                        return (
                          <div key={s.id} className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2 text-sm">
                            <div>
                              <span className="text-foreground">{format(new Date(s.session_date), 'dd/MM/yyyy', { locale: lang === 'ar' ? ar : undefined })}</span>
                              <span className="text-muted-foreground ms-2">{s.start_time?.slice(0, 5)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {att?.is_present ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">{t('حاضر', 'Present')}</span>
                              ) : att ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">{t('غائب', 'Absent')}</span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t('لم يُسجل', 'Not recorded')}</span>
                              )}
                              {s.session_notes && <span className="text-xs text-muted-foreground" title={s.session_notes}>📝</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
