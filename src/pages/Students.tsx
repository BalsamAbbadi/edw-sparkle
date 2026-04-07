import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Edit2, Trash2, X, Check, Phone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function StudentsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', grade: '', gender: '', notes: '', phone: '' });
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState(0);

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

  const updateStudentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('students').update({
        name: editForm.name, grade: editForm.grade, gender: editForm.gender, notes: editForm.notes, phone: editForm.phone,
      }).eq('id', editingId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success(t('تم تحديث بيانات الطالب', 'Student updated'));
      setEditingId(null);
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('enrollments').delete().eq('student_id', id);
      await supabase.from('payments').delete().eq('student_id', id);
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['all-enrollments'] });
      toast.success(t('تم حذف الطالب', 'Student deleted'));
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { error } = await supabase.from('payments').update({ amount_paid: amount }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success(t('تم تحديث الدفعة', 'Payment updated'));
      setEditPaymentId(null);
    },
  });

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditForm({ name: s.name, grade: s.grade || '', gender: s.gender || '', notes: s.notes || '', phone: (s as any).phone || '' });
  };

  const filtered = students.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()));

  const getStudentCourses = (studentId: string) => enrollments.filter((e: any) => e.student_id === studentId);
  const getStudentPayments = (studentId: string) => payments.filter((p: any) => p.student_id === studentId);

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
        <div className="relative">
          <Search className="absolute start-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('بحث بالاسم...', 'Search by name...')} className="ps-10 pe-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm w-64 focus:ring-2 focus:ring-ring outline-none" />
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">{t('تعديل بيانات الطالب', 'Edit Student')}</h3>
                <button onClick={() => setEditingId(null)}><X className="w-5 h-5" /></button>
              </div>
              <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder={t('الاسم', 'Name')} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
              <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder={t('رقم الهاتف (اختياري)', 'Phone (optional)')} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
              <input value={editForm.grade} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))} placeholder={t('الصف', 'Grade')} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
              <select value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                <option value="">{t('الجنس', 'Gender')}</option>
                <option value="male">{t('ذكر', 'Male')}</option>
                <option value="female">{t('أنثى', 'Female')}</option>
              </select>
              <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder={t('ملاحظات', 'Notes')} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none" />
              <button onClick={() => updateStudentMutation.mutate()} disabled={!editForm.name || updateStudentMutation.isPending} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
                {t('حفظ التعديلات', 'Save Changes')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass-card rounded-xl p-6 animate-pulse h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{search ? t('لم يتم العثور على نتائج', 'No results found') : t('لا يوجد طلاب بعد. أضف طلاب من صفحة الدورات', 'No students yet. Add students from courses page')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((student: any) => {
            const courses = getStudentCourses(student.id);
            const pmts = getStudentPayments(student.id);
            return (
              <motion.div key={student.id} whileHover={{ y: -1 }} className="glass-card rounded-xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{student.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {student.grade && <span>{student.grade}</span>}
                      {student.gender && <span>{student.gender === 'male' ? t('ذكر', 'Male') : t('أنثى', 'Female')}</span>}
                      {(student as any).phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{(student as any).phone}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(student)} className="p-2 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => { if (confirm(t('هل أنت متأكد؟', 'Are you sure?'))) deleteStudentMutation.mutate(student.id); }} className="p-2 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                  </div>
                </div>
                {student.notes && <p className="text-sm text-muted-foreground mb-3">{student.notes}</p>}
                {courses.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{t('الدورات المسجلة:', 'Enrolled courses:')}</p>
                    {courses.map((enr: any) => {
                      const pmt = pmts.find((p: any) => p.course_id === enr.course_id);
                      return (
                        <div key={enr.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                          <div>
                            <span className="text-sm text-foreground">{enr.courses?.title}</span>
                            {enr.courses?.fees > 0 && <span className="text-xs text-muted-foreground ms-2">({enr.courses.fees} ₪)</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {pmt && editPaymentId === pmt.id ? (
                              <div className="flex items-center gap-1">
                                <input type="number" value={editPaymentAmount} onChange={e => setEditPaymentAmount(Number(e.target.value))} min={0} max={pmt.total_amount} className="w-20 px-2 py-1 rounded border border-input bg-background text-foreground text-xs" />
                                <span className="text-xs text-muted-foreground">/ {pmt.total_amount} ₪</span>
                                <button onClick={() => updatePaymentMutation.mutate({ id: pmt.id, amount: editPaymentAmount })} className="p-1 rounded hover:bg-success/10"><Check className="w-3.5 h-3.5 text-success" /></button>
                                <button onClick={() => setEditPaymentId(null)} className="p-1 rounded hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : pmt ? (
                              <button onClick={() => { setEditPaymentId(pmt.id); setEditPaymentAmount(pmt.amount_paid); }} className="flex items-center gap-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(pmt.status)}`}>
                                  {statusLabel(pmt.status)} ({pmt.amount_paid}/{pmt.total_amount} ₪)
                                </span>
                                <Edit2 className="w-3 h-3 text-muted-foreground" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
