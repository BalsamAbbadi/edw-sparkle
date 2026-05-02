import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Edit2, Trash2, X, Check, Phone, CheckSquare, Square, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNotification } from '@/hooks/useNotification';
import { useNavigate } from 'react-router-dom';

export default function StudentsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', grade: '', gender: '', notes: '', phone: '' });
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [showBulkPayment, setShowBulkPayment] = useState(false);
  const [bulkPaymentStatus, setBulkPaymentStatus] = useState<'full' | 'partial' | 'unpaid'>('full');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['all-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('enrollments').select('*, courses(title, fees)');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('*, courses(title)');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('id, title');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateStudentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('students').update({
        name: editForm.name, grade: editForm.grade, gender: editForm.gender, notes: editForm.notes, phone: editForm.phone,
      }).eq('id', editingId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      notify('student', t(`تم تحديث بيانات الطالب: ${editForm.name}`, `Student updated: ${editForm.name}`), `/students/${editingId}`);
      toast.success(t('تم تحديث بيانات الطالب', 'Student updated'));
      setEditingId(null);
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      const student = students.find(s => s.id === id);
      await supabase.from('attendance').delete().eq('student_id', id);
      await supabase.from('enrollments').delete().eq('student_id', id);
      await supabase.from('payments').delete().eq('student_id', id);
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      return student?.name || '';
    },
    onSuccess: (name) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['all-enrollments'] });
      notify('student', t(`تم حذف الطالب: ${name}`, `Student deleted: ${name}`));
      toast.success(t('تم حذف الطالب', 'Student deleted'));
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await supabase.from('attendance').delete().eq('student_id', id);
        await supabase.from('enrollments').delete().eq('student_id', id);
        await supabase.from('payments').delete().eq('student_id', id);
        await supabase.from('students').delete().eq('id', id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['all-enrollments'] });
      notify('student', t(`تم حذف ${selectedIds.size} طالب`, `${selectedIds.size} students deleted`));
      setSelectedIds(new Set());
      setMultiSelectMode(false);
      toast.success(t('تم حذف الطلاب المحددين', 'Selected students deleted'));
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { error } = await supabase.from('payments').update({ amount_paid: amount }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      notify('payment', t('تم تحديث حالة الدفع', 'Payment updated'));
      toast.success(t('تم تحديث الدفعة', 'Payment updated'));
      setEditPaymentId(null);
    },
  });

  const bulkUpdatePaymentMutation = useMutation({
    mutationFn: async ({ studentIds, status }: { studentIds: string[]; status: string }) => {
      const studentPayments = payments.filter((p: any) => studentIds.includes(p.student_id));
      for (const p of studentPayments) {
        let amount = 0;
        if (status === 'full') amount = p.total_amount;
        else if (status === 'partial') amount = Math.round(p.total_amount / 2);
        await supabase.from('payments').update({ amount_paid: amount }).eq('id', p.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      setSelectedIds(new Set());
      setMultiSelectMode(false);
      setShowBulkPayment(false);
      toast.success(t('تم تحديث حالة الدفع', 'Payment status updated'));
    },
  });

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditForm({ name: s.name, grade: s.grade || '', gender: s.gender || '', notes: s.notes || '', phone: s.phone || '' });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const getStudentCourses = (studentId: string) => enrollments.filter((e: any) => e.student_id === studentId);
  const getStudentPayments = (studentId: string) => payments.filter((p: any) => p.student_id === studentId);
  // "Late" = unpaid/partial AND due_date is in the past
  const todayStr = new Date().toISOString().slice(0, 10);
  const hasLatePayment = (studentId: string) => getStudentPayments(studentId).some((p: any) => p.status !== 'full' && p.due_date && p.due_date < todayStr);

  let filtered = students.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()));
  if (filterCourse) {
    const enrolledStudentIds = enrollments.filter((e: any) => e.course_id === filterCourse).map((e: any) => e.student_id);
    filtered = filtered.filter((s: any) => enrolledStudentIds.includes(s.id));
  }
  if (filterPayment) {
    const paymentStudentIds = payments.filter((p: any) => p.status === filterPayment).map((p: any) => p.student_id);
    filtered = filtered.filter((s: any) => paymentStudentIds.includes(s.id));
  }

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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t('الطلاب', 'Students')}</h1>
          <span className="text-sm text-muted-foreground">({students.length})</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute start-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('بحث بالاسم...', 'Search by name...')} className="ps-10 pe-4 py-2 rounded-lg border border-input bg-background/50 backdrop-blur-sm text-foreground text-sm w-48 focus:ring-2 focus:ring-ring outline-none" />
          </div>
          <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background/50 backdrop-blur-sm text-foreground text-sm">
            <option value="">{t('كل الدورات', 'All Courses')}</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background/50 backdrop-blur-sm text-foreground text-sm">
            <option value="">{t('كل الحالات', 'All Statuses')}</option>
            <option value="full">{t('مدفوع', 'Paid')}</option>
            <option value="partial">{t('جزئي', 'Partial')}</option>
            <option value="unpaid">{t('غير مدفوع', 'Unpaid')}</option>
          </select>
          <button onClick={() => { setMultiSelectMode(!multiSelectMode); setSelectedIds(new Set()); }} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${multiSelectMode ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}>
            <CheckSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Multi-select actions */}
      <AnimatePresence>
        {multiSelectMode && selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card rounded-xl p-4 flex items-center justify-between bg-card/60 backdrop-blur-xl border border-primary/20">
            <span className="text-sm font-medium">{t(`تم تحديد ${selectedIds.size} طالب`, `${selectedIds.size} selected`)}</span>
            <div className="flex gap-2">
              <button onClick={() => setShowBulkPayment(true)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">{t('تعديل الدفع', 'Update Payment')}</button>
              <button onClick={() => { if (window.confirm(t('حذف الطلاب المحددين؟', 'Delete selected?'))) bulkDeleteMutation.mutate(Array.from(selectedIds)); }} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">{t('حذف', 'Delete')}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Payment Modal */}
      <AnimatePresence>
        {showBulkPayment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 p-6 space-y-4">
              <h3 className="text-lg font-bold">{t('تعديل حالة الدفع', 'Update Payment Status')}</h3>
              <select value={bulkPaymentStatus} onChange={e => setBulkPaymentStatus(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground">
                <option value="full">{t('مدفوع بالكامل', 'Fully Paid')}</option>
                <option value="partial">{t('جزئي (نصف المبلغ)', 'Partial (half)')}</option>
                <option value="unpaid">{t('غير مدفوع', 'Unpaid')}</option>
              </select>
              <div className="flex gap-2">
                <button onClick={() => bulkUpdatePaymentMutation.mutate({ studentIds: Array.from(selectedIds), status: bulkPaymentStatus })} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium">{t('تطبيق', 'Apply')}</button>
                <button onClick={() => setShowBulkPayment(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground">{t('إلغاء', 'Cancel')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">{t('تعديل بيانات الطالب', 'Edit Student')}</h3>
                <button onClick={() => setEditingId(null)}><X className="w-5 h-5" /></button>
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
              <button onClick={() => updateStudentMutation.mutate()} disabled={!editForm.name || updateStudentMutation.isPending} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
                {t('حفظ التعديلات', 'Save Changes')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Students List - Row layout */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass-card rounded-xl p-4 animate-pulse h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center bg-card/60 backdrop-blur-xl border border-border/50">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{search || filterCourse || filterPayment ? t('لم يتم العثور على نتائج', 'No results found') : t('لا يوجد طلاب بعد', 'No students yet')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((student: any) => {
            const studentCourses = getStudentCourses(student.id);
            const pmts = getStudentPayments(student.id);
            const isLate = hasLatePayment(student.id);
            const isSelected = selectedIds.has(student.id);
            return (
              <motion.div key={student.id} whileHover={{ x: 2 }} className={`glass-card rounded-xl p-4 bg-card/60 backdrop-blur-xl border border-border/50 transition-all ${isLate ? 'border-s-4 border-s-destructive/60' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {multiSelectMode && (
                      <button onClick={() => toggleSelect(student.id)}>
                        {isSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-muted-foreground" />}
                      </button>
                    )}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/students/${student.id}`)}>{student.name}</h3>
                        {isLate && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">{t('متأخر', 'Late')}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {student.grade && <span>{student.grade}</span>}
                        {student.gender && <span>{student.gender === 'male' ? t('ذكر', 'Male') : t('أنثى', 'Female')}</span>}
                        {student.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{student.phone}</span>}
                        {studentCourses.length > 0 && <span className="text-primary">{studentCourses.length} {t('دورات', 'courses')}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Payment badges inline */}
                    {pmts.length > 0 && (
                      <div className="flex gap-1">
                        {pmts.map((pmt: any) => (
                          <span key={pmt.id} className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor(pmt.status)}`}>
                            {pmt.courses?.title?.slice(0, 8)}: {pmt.amount_paid}/{pmt.total_amount}₪
                          </span>
                        ))}
                      </div>
                    )}
                    <button onClick={() => startEdit(student)} className="p-2 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => { if (window.confirm(t('حذف هذا الطالب؟', 'Delete student?'))) deleteStudentMutation.mutate(student.id); }} className="p-2 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
