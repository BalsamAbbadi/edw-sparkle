import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Users, StickyNote, FolderOpen, Calendar, ArrowRight, Plus, X, Trash2, Upload, Download, Edit2, Check, ExternalLink, Phone, CheckSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';

const TEXT_COLORS = [
  { label: 'أسود', value: '#1a1a1a' },
  { label: 'أحمر', value: '#dc2626' },
  { label: 'أزرق', value: '#2563eb' },
  { label: 'أخضر', value: '#16a34a' },
  { label: 'بنفسجي', value: '#9333ea' },
  { label: 'برتقالي', value: '#ea580c' },
];

const PAPER_COLORS = ['#FEF3C7', '#DBEAFE', '#F3E8FF', '#DCFCE7', '#FFE4E6'];

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'students' | 'notes' | 'files' | 'schedule'>('students');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', grade: '', gender: '', notes: '', phone: '' });
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: '', content: '', color: '#FEF3C7', is_checklist: false });
  const [selectedTextColor, setSelectedTextColor] = useState('#1a1a1a');
  const noteContentRef = useRef<HTMLDivElement>(null);
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState(0);
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [editSessionForm, setEditSessionForm] = useState({ session_date: '', start_time: '', end_time: '' });
  const [editStudentId, setEditStudentId] = useState<string | null>(null);
  const [editStudentForm, setEditStudentForm] = useState({ name: '', grade: '', gender: '', notes: '', phone: '' });
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  const { data: course } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('enrollments').select('*, students(*)').eq('course_id', id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['course-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('*').eq('course_id', id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['course-notes', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('notes').select('*').eq('course_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: files = [] } = useQuery({
    queryKey: ['course-files', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('files').select('*').eq('course_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['course-sessions', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('sessions').select('*').eq('course_id', id!).order('session_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Mutations
  const addStudentMutation = useMutation({
    mutationFn: async () => {
      let studentId: string;
      const { data: existing } = await supabase.from('students').select('id').eq('name', studentForm.name).eq('user_id', user!.id).maybeSingle();
      if (existing) {
        studentId = existing.id;
      } else {
        const { data: newStudent, error } = await supabase.from('students').insert({
          user_id: user!.id, name: studentForm.name, grade: studentForm.grade, gender: studentForm.gender, notes: studentForm.notes, phone: studentForm.phone,
        }).select().single();
        if (error) throw error;
        studentId = newStudent.id;
      }
      const { error: enrollError } = await supabase.from('enrollments').insert({ student_id: studentId, course_id: id!, user_id: user!.id });
      if (enrollError) throw enrollError;
      await supabase.from('payments').insert({
        student_id: studentId, course_id: id!, user_id: user!.id, amount_paid: 0, total_amount: course?.fees || 0,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments', id] });
      qc.invalidateQueries({ queryKey: ['course-payments', id] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success(t('تم إضافة الطالب', 'Student added'));
      setShowAddStudent(false);
      setStudentForm({ name: '', grade: '', gender: '', notes: '', phone: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeStudentMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments', id] });
      toast.success(t('تم إزالة الطالب', 'Student removed'));
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('students').update({
        name: editStudentForm.name, grade: editStudentForm.grade, gender: editStudentForm.gender, notes: editStudentForm.notes, phone: editStudentForm.phone,
      }).eq('id', editStudentId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments', id] });
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success(t('تم تحديث بيانات الطالب', 'Student updated'));
      setEditStudentId(null);
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ payId, amount }: { payId: string; amount: number }) => {
      const { error } = await supabase.from('payments').update({ amount_paid: amount }).eq('id', payId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-payments', id] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success(t('تم تحديث الدفعة', 'Payment updated'));
      setEditPaymentId(null);
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const contentHtml = noteContentRef.current?.innerHTML || noteForm.content;
      const { error } = await supabase.from('notes').insert({
        user_id: user!.id, course_id: id!, title: noteForm.title, content: contentHtml, color: noteForm.color, is_checklist: noteForm.is_checklist,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-notes', id] });
      qc.invalidateQueries({ queryKey: ['all-notes'] });
      toast.success(t('تمت إضافة الملاحظة', 'Note added'));
      setShowAddNote(false);
      setNoteForm({ title: '', content: '', color: '#FEF3C7', is_checklist: false });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-notes', id] });
      qc.invalidateQueries({ queryKey: ['all-notes'] });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const filePath = `${user!.id}/${id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('course-files').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('course-files').getPublicUrl(filePath);
      const { error } = await supabase.from('files').insert({
        course_id: id!, user_id: user!.id, file_name: file.name, file_url: urlData.publicUrl, file_size: file.size, file_type: file.type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-files', id] });
      toast.success(t('تم رفع الملف', 'File uploaded'));
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await supabase.from('files').delete().eq('id', fileId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-files', id] }),
  });

  const updateSessionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sessions').update({
        session_date: editSessionForm.session_date, start_time: editSessionForm.start_time, end_time: editSessionForm.end_time || null,
      }).eq('id', editSessionId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-sessions', id] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(t('تم تحديث الحصة', 'Session updated'));
      setEditSessionId(null);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-sessions', id] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(t('تم حذف الحصة', 'Session deleted'));
    },
  });

  const postponeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const idx = sessions.findIndex((s: any) => s.id === sessionId);
      const sessionsToShift = sessions.slice(idx);
      for (const s of sessionsToShift) {
        const newDate = format(addDays(new Date(s.session_date), 7), 'yyyy-MM-dd');
        await supabase.from('sessions').update({ session_date: newDate }).eq('id', s.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-sessions', id] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(t('تم تأجيل الحصة وإزاحة باقي الحصص', 'Session postponed'));
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFileMutation.mutate(file);
  };

  const getViewerUrl = (url: string, type: string) => {
    if (type?.includes('pdf')) return url;
    return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  };

  const getPaymentForStudent = (studentId: string) => payments.find((p: any) => p.student_id === studentId);

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

  const applyNoteColor = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      document.execCommand('foreColor', false, selectedTextColor);
    }
  };

  const insertChecklist = () => {
    if (noteContentRef.current) {
      document.execCommand('insertHTML', false, '<div class="checklist-item">☐ </div>');
    }
  };

  if (!course) return <div className="p-8 text-center text-muted-foreground">{t('جاري التحميل...', 'Loading...')}</div>;

  const tabs = [
    { key: 'students' as const, label: t('الطلاب', 'Students'), icon: Users, count: enrollments.length },
    { key: 'schedule' as const, label: t('الحصص', 'Sessions'), icon: Calendar, count: sessions.length },
    { key: 'notes' as const, label: t('ملاحظات', 'Notes'), icon: StickyNote, count: notes.length },
    { key: 'files' as const, label: t('ملفات', 'Files'), icon: FolderOpen, count: files.length },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/courses')} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowRight className="w-5 h-5 text-muted-foreground rtl:rotate-0 ltr:rotate-180" />
        </button>
        <BookOpen className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {course.description && <span>{course.description}</span>}
            {course.fees > 0 && <span className="font-medium">₪ {course.fees}</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 bg-muted/50 backdrop-blur-sm rounded-lg p-1 overflow-x-auto">
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${tab === tb.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <tb.icon className="w-4 h-4" />{tb.label} <span className="text-xs opacity-70">({tb.count})</span>
          </button>
        ))}
      </div>

      {/* Students Tab */}
      {tab === 'students' && (
        <div className="space-y-4">
          <button onClick={() => setShowAddStudent(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            <Plus className="w-4 h-4" />{t('إضافة طالب', 'Add Student')}
          </button>
          <AnimatePresence>
            {showAddStudent && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{t('طالب جديد', 'New Student')}</h3>
                  <button onClick={() => setShowAddStudent(false)}><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={studentForm.name} onChange={e => setStudentForm(f => ({ ...f, name: e.target.value }))} placeholder={t('اسم الطالب', 'Student name')} required className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                  <input value={studentForm.phone} onChange={e => setStudentForm(f => ({ ...f, phone: e.target.value }))} placeholder={t('رقم الهاتف (اختياري)', 'Phone (optional)')} className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                  <input value={studentForm.grade} onChange={e => setStudentForm(f => ({ ...f, grade: e.target.value }))} placeholder={t('الصف', 'Grade')} className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                  <select value={studentForm.gender} onChange={e => setStudentForm(f => ({ ...f, gender: e.target.value }))} className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                    <option value="">{t('الجنس', 'Gender')}</option>
                    <option value="male">{t('ذكر', 'Male')}</option>
                    <option value="female">{t('أنثى', 'Female')}</option>
                  </select>
                  <input value={studentForm.notes} onChange={e => setStudentForm(f => ({ ...f, notes: e.target.value }))} placeholder={t('ملاحظات', 'Notes')} className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm sm:col-span-2" />
                </div>
                <button onClick={() => addStudentMutation.mutate()} disabled={!studentForm.name || addStudentMutation.isPending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                  {t('إضافة', 'Add')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit Student Modal */}
          <AnimatePresence>
            {editStudentId && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">{t('تعديل بيانات الطالب', 'Edit Student')}</h3>
                    <button onClick={() => setEditStudentId(null)}><X className="w-5 h-5" /></button>
                  </div>
                  <input value={editStudentForm.name} onChange={e => setEditStudentForm(f => ({ ...f, name: e.target.value }))} placeholder={t('الاسم', 'Name')} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                  <input value={editStudentForm.phone} onChange={e => setEditStudentForm(f => ({ ...f, phone: e.target.value }))} placeholder={t('الهاتف', 'Phone')} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                  <input value={editStudentForm.grade} onChange={e => setEditStudentForm(f => ({ ...f, grade: e.target.value }))} placeholder={t('الصف', 'Grade')} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                  <select value={editStudentForm.gender} onChange={e => setEditStudentForm(f => ({ ...f, gender: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                    <option value="">{t('الجنس', 'Gender')}</option>
                    <option value="male">{t('ذكر', 'Male')}</option>
                    <option value="female">{t('أنثى', 'Female')}</option>
                  </select>
                  <textarea value={editStudentForm.notes} onChange={e => setEditStudentForm(f => ({ ...f, notes: e.target.value }))} placeholder={t('ملاحظات', 'Notes')} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none" />
                  <button onClick={() => updateStudentMutation.mutate()} disabled={!editStudentForm.name} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
                    {t('حفظ', 'Save')}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            {enrollments.map((enr: any) => {
              const payment = getPaymentForStudent(enr.student_id);
              return (
                <div key={enr.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{enr.students?.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {enr.students?.grade && <span>{enr.students.grade}</span>}
                        {enr.students?.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{enr.students.phone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {payment && editPaymentId === payment.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" value={editPaymentAmount} onChange={e => setEditPaymentAmount(Number(e.target.value))} min={0} max={payment.total_amount} className="w-20 px-2 py-1 rounded border border-input bg-background text-foreground text-xs" />
                          <span className="text-xs text-muted-foreground">/ {payment.total_amount} ₪</span>
                          <button onClick={() => updatePaymentMutation.mutate({ payId: payment.id, amount: editPaymentAmount })} className="p-1 rounded hover:bg-success/10"><Check className="w-3.5 h-3.5 text-success" /></button>
                          <button onClick={() => setEditPaymentId(null)} className="p-1 rounded hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : payment ? (
                        <button onClick={() => { setEditPaymentId(payment.id); setEditPaymentAmount(payment.amount_paid); }} className="flex items-center gap-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(payment.status)}`}>
                            {statusLabel(payment.status)} ({payment.amount_paid}/{payment.total_amount} ₪)
                          </span>
                          <Edit2 className="w-3 h-3 text-muted-foreground" />
                        </button>
                      ) : null}
                      <button onClick={() => { setEditStudentId(enr.student_id); setEditStudentForm({ name: enr.students?.name || '', grade: enr.students?.grade || '', gender: enr.students?.gender || '', notes: enr.students?.notes || '', phone: enr.students?.phone || '' }); }} className="p-2 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
                      <button onClick={() => { if (window.confirm(t('إزالة الطالب؟', 'Remove?'))) removeStudentMutation.mutate(enr.id); }} className="p-2 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {enrollments.length === 0 && <p className="text-center text-muted-foreground py-8">{t('لا يوجد طلاب', 'No students')}</p>}
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {tab === 'schedule' && (
        <div className="space-y-2">
          {sessions.map((s: any, idx: number) => (
            <div key={s.id} className="glass-card rounded-xl p-4">
              {editSessionId === s.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <input type="date" value={editSessionForm.session_date} onChange={e => setEditSessionForm(f => ({ ...f, session_date: e.target.value }))} className="px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm" />
                    <input type="time" value={editSessionForm.start_time} onChange={e => setEditSessionForm(f => ({ ...f, start_time: e.target.value }))} className="px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm" />
                    <input type="time" value={editSessionForm.end_time} onChange={e => setEditSessionForm(f => ({ ...f, end_time: e.target.value }))} className="px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateSessionMutation.mutate()} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm">{t('حفظ', 'Save')}</button>
                    <button onClick={() => setEditSessionId(null)} className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-sm">{t('إلغاء', 'Cancel')}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{t('حصة', 'Session')} #{idx + 1}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(s.session_date), 'EEEE dd/MM/yyyy', { locale: lang === 'ar' ? ar : undefined })} • {s.start_time?.slice(0, 5)}{s.end_time ? ` - ${s.end_time?.slice(0, 5)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditSessionId(s.id); setEditSessionForm({ session_date: s.session_date, start_time: s.start_time, end_time: s.end_time || '' }); }} className="p-2 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => { if (window.confirm(t('تأجيل وإزاحة؟', 'Postpone?'))) postponeSessionMutation.mutate(s.id); }} className="p-2 rounded-lg hover:bg-warning/10"><Calendar className="w-4 h-4 text-warning" /></button>
                    <button onClick={() => { if (window.confirm(t('حذف؟', 'Delete?'))) deleteSessionMutation.mutate(s.id); }} className="p-2 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {sessions.length === 0 && <p className="text-center text-muted-foreground py-8">{t('لا توجد حصص', 'No sessions')}</p>}
        </div>
      )}

      {/* Notes Tab - Full featured */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <button onClick={() => setShowAddNote(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            <Plus className="w-4 h-4" />{t('ملاحظة جديدة', 'New Note')}
          </button>
          <AnimatePresence>
            {showAddNote && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-2xl bg-card rounded-2xl shadow-xl border border-border overflow-hidden max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center p-4 border-b border-border">
                    <h3 className="font-bold">{t('ملاحظة جديدة', 'New Note')}</h3>
                    <button onClick={() => setShowAddNote(false)}><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-4 space-y-4">
                    <input value={noteForm.title} onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))} placeholder={t('العنوان', 'Title')} className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground text-lg font-semibold" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground">{t('لون النص:', 'Text color:')}</span>
                      {TEXT_COLORS.map(c => (
                        <button key={c.value} onClick={() => setSelectedTextColor(c.value)} className={`w-6 h-6 rounded-full border-2 transition-all ${selectedTextColor === c.value ? 'border-primary scale-110' : 'border-transparent'}`} style={{ backgroundColor: c.value }} />
                      ))}
                      <button onClick={applyNoteColor} className="px-2 py-1 text-xs rounded bg-muted text-foreground">{t('تلوين', 'Color')}</button>
                      <button onClick={insertChecklist} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-muted text-foreground">
                        <CheckSquare className="w-3 h-3" />{t('مهمة', 'Task')}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t('لون الورقة:', 'Paper:')}</span>
                      {PAPER_COLORS.map(c => (
                        <button key={c} onClick={() => setNoteForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full border-2 transition-all ${noteForm.color === c ? 'border-primary scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="note-paper rounded-xl p-6 min-h-[250px]" style={{ backgroundColor: noteForm.color }}>
                      <div ref={noteContentRef} contentEditable suppressContentEditableWarning className="min-h-[210px] outline-none text-foreground leading-[32px] whitespace-pre-wrap" style={{ fontFamily: "'Caveat', 'Cairo', cursive", fontSize: '18px', lineHeight: '32px' }} />
                    </div>
                    <button onClick={() => addNoteMutation.mutate()} disabled={!noteForm.title} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
                      {t('حفظ', 'Save')}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expanded Note */}
          <AnimatePresence>
            {expandedNote && (() => {
              const note = notes.find((n: any) => n.id === expandedNote);
              if (!note) return null;
              return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4" onClick={() => setExpandedNote(null)}>
                  <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="note-paper rounded-2xl p-8 shadow-xl" style={{ backgroundColor: note.color }}>
                      <div className="flex justify-between items-start mb-4">
                        <h2 className="text-2xl font-bold text-foreground">{note.title}</h2>
                        <div className="flex gap-2">
                          <button onClick={() => { if (window.confirm(t('حذف؟', 'Delete?'))) { deleteNoteMutation.mutate(note.id); setExpandedNote(null); } }} className="p-2 rounded-lg hover:bg-foreground/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                          <button onClick={() => setExpandedNote(null)} className="p-2 rounded-lg hover:bg-foreground/10"><X className="w-5 h-5" /></button>
                        </div>
                      </div>
                      <div className="text-foreground/80 leading-[32px] whitespace-pre-wrap" style={{ fontFamily: "'Caveat', 'Cairo', cursive", fontSize: '18px' }} dangerouslySetInnerHTML={{ __html: note.content || '' }} />
                    </div>
                  </motion.div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {notes.map((note: any) => (
              <motion.div key={note.id} whileHover={{ y: -2 }} onClick={() => setExpandedNote(note.id)} className="note-paper rounded-xl p-5 relative group min-h-[160px] cursor-pointer shadow-sm" style={{ backgroundColor: note.color }}>
                <button onClick={e => { e.stopPropagation(); if (window.confirm(t('حذف؟', 'Delete?'))) deleteNoteMutation.mutate(note.id); }} className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4 text-destructive" /></button>
                <h4 className="font-semibold mb-2 text-foreground">{note.title}</h4>
                <div className="text-sm text-foreground/70 line-clamp-4 leading-[32px]" style={{ fontFamily: "'Caveat', 'Cairo', cursive" }} dangerouslySetInnerHTML={{ __html: note.content || '' }} />
              </motion.div>
            ))}
          </div>
          {notes.length === 0 && <p className="text-center text-muted-foreground py-8">{t('لا توجد ملاحظات', 'No notes')}</p>}
        </div>
      )}

      {/* Files Tab */}
      {tab === 'files' && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer w-fit">
            <Upload className="w-4 h-4" />{t('رفع ملف', 'Upload File')}
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>
          <div className="space-y-2">
            {files.map((file: any) => (
              <div key={file.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">{(file.file_size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="flex gap-2">
                  <a href={getViewerUrl(file.file_url, file.file_type)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-muted"><ExternalLink className="w-4 h-4 text-primary" /></a>
                  <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-muted"><Download className="w-4 h-4 text-muted-foreground" /></a>
                  <button onClick={() => deleteFileMutation.mutate(file.id)} className="p-2 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                </div>
              </div>
            ))}
            {files.length === 0 && <p className="text-center text-muted-foreground py-8">{t('لا توجد ملفات', 'No files')}</p>}
          </div>
        </div>
      )}
    </motion.div>
  );
}
