import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Users, Check, X, Edit2, CheckSquare, Square, StickyNote, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNotification } from '@/hooks/useNotification';

export default function SessionProfile() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { notify } = useNotification();
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ session_date: '', start_time: '', end_time: '' });
  const [noteText, setNoteText] = useState('');
  const [showNote, setShowNote] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('sessions').select('*, courses(title, fees)').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['session-enrollments', session?.course_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('enrollments').select('*, students(*)').eq('course_id', session!.course_id);
      if (error) throw error;
      return data;
    },
    enabled: !!session?.course_id && !!user,
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['session-attendance', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance').select('*').eq('session_id', id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Realtime sync attendance for this session
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`att-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `session_id=eq.${id}` }, () => {
      qc.invalidateQueries({ queryKey: ['session-attendance', id] });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  const toggleAttendanceMutation = useMutation({
    mutationFn: async ({ studentId, isPresent }: { studentId: string; isPresent: boolean }) => {
      const existing = attendanceRecords.find((a: any) => a.student_id === studentId);
      if (existing) {
        await supabase.from('attendance').update({ is_present: isPresent }).eq('id', existing.id);
      } else {
        await supabase.from('attendance').insert({
          session_id: id!, student_id: studentId, course_id: session!.course_id, user_id: user!.id, is_present: isPresent,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-attendance', id] });
      qc.invalidateQueries({ queryKey: ['student-attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-counts'] });
    },
  });

  const markAllPresentMutation = useMutation({
    mutationFn: async () => {
      for (const enr of enrollments) {
        const existing = attendanceRecords.find((a: any) => a.student_id === enr.student_id);
        if (existing) {
          await supabase.from('attendance').update({ is_present: true }).eq('id', existing.id);
        } else {
          await supabase.from('attendance').insert({
            session_id: id!, student_id: enr.student_id, course_id: session!.course_id, user_id: user!.id, is_present: true,
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-attendance', id] });
      qc.invalidateQueries({ queryKey: ['student-attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-counts'] });
      toast.success(t('تم تسجيل حضور الجميع', 'All marked present'));
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sessions').update({
        session_date: editForm.session_date, start_time: editForm.start_time, end_time: editForm.end_time || null,
      }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session', id] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['course-sessions'] });
      notify('session', t('تم تعديل موعد الحصة', 'Session date updated'));
      toast.success(t('تم تحديث الحصة', 'Session updated'));
      setEditMode(false);
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sessions').update({ session_notes: noteText }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session', id] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(t('تم حفظ الملاحظة', 'Note saved'));
      setShowNote(false);
    },
  });

  if (!session) return <div className="p-8 text-center text-muted-foreground">{t('جاري التحميل...', 'Loading...')}</div>;

  const presentCount = attendanceRecords.filter((a: any) => a.is_present).length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted">
          <ArrowRight className="w-5 h-5 text-muted-foreground rtl:rotate-0 ltr:rotate-180" />
        </button>
        <Calendar className="w-6 h-6 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{session.courses?.title || session.title}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(session.session_date), 'EEEE dd/MM/yyyy', { locale: lang === 'ar' ? ar : undefined })} • {session.start_time?.slice(0, 5)}{session.end_time ? ` - ${session.end_time?.slice(0, 5)}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowNote(true); setNoteText(session.session_notes || ''); }} className="p-2 rounded-lg hover:bg-muted">
            <StickyNote className="w-5 h-5 text-warning" />
          </button>
          <button onClick={() => { setEditMode(true); setEditForm({ session_date: session.session_date, start_time: session.start_time, end_time: session.end_time || '' }); }} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            <Edit2 className="w-4 h-4 inline me-1" />{t('تعديل الموعد', 'Edit Date')}
          </button>
        </div>
      </div>

      {session.session_notes && (
        <div className="bg-warning/10 backdrop-blur-sm rounded-xl p-4 text-sm text-foreground border border-warning/20">
          <span className="font-medium">{t('ملاحظات:', 'Notes:')}</span> {session.session_notes}
        </div>
      )}

      {/* Edit date modal */}
      {editMode && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 p-6 space-y-4">
            <h3 className="text-lg font-bold">{t('تعديل موعد الحصة', 'Edit Session Date')}</h3>
            <input type="date" value={editForm.session_date} onChange={e => setEditForm(f => ({ ...f, session_date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" />
            <div className="grid grid-cols-2 gap-2">
              <input type="time" value={editForm.start_time} onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))} className="px-3 py-2 rounded-lg border border-input bg-background text-foreground" />
              <input type="time" value={editForm.end_time} onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))} className="px-3 py-2 rounded-lg border border-input bg-background text-foreground" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => updateSessionMutation.mutate()} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium">{t('حفظ', 'Save')}</button>
              <button onClick={() => setEditMode(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground">{t('إلغاء', 'Cancel')}</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Note modal */}
      {showNote && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 p-6 space-y-4">
            <h3 className="text-lg font-bold">{t('ملاحظات الحصة', 'Session Notes')}</h3>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground resize-none" placeholder={t('أدخل ملاحظاتك...', 'Enter notes...')} />
            <div className="flex gap-2">
              <button onClick={() => saveNoteMutation.mutate()} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium">{t('حفظ', 'Save')}</button>
              <button onClick={() => setShowNote(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground">{t('إلغاء', 'Cancel')}</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Attendance */}
      <div className="glass-card rounded-2xl p-5 bg-card/60 backdrop-blur-xl border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {t('الطلاب', 'Students')} ({enrollments.length})
            <span className="text-sm text-muted-foreground font-normal ms-2">
              {t(`حاضر: ${presentCount}`, `Present: ${presentCount}`)}
            </span>
          </h2>
          <button onClick={() => markAllPresentMutation.mutate()} disabled={markAllPresentMutation.isPending} className="px-4 py-2 rounded-lg bg-success text-white text-sm font-medium hover:bg-success/90 disabled:opacity-50">
            <CheckSquare className="w-4 h-4 inline me-1" />{t('تسجيل حضور الجميع', 'Mark All Present')}
          </button>
        </div>

        <div className="space-y-2">
          {enrollments.map((enr: any) => {
            const att = attendanceRecords.find((a: any) => a.student_id === enr.student_id);
            const isPresent = att?.is_present || false;
            return (
              <div key={enr.id} className="flex items-center justify-between bg-muted/30 backdrop-blur-sm rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/students/${enr.student_id}`)}>
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground hover:text-primary transition-colors">{enr.students?.name}</p>
                    {enr.students?.grade && <p className="text-xs text-muted-foreground">{enr.students.grade}</p>}
                  </div>
                </div>
                <button
                  onClick={() => toggleAttendanceMutation.mutate({ studentId: enr.student_id, isPresent: !isPresent })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isPresent ? 'bg-success/20 text-success' : 'bg-destructive/10 text-destructive'}`}
                >
                  {isPresent ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {isPresent ? t('حاضر', 'Present') : t('غائب', 'Absent')}
                </button>
              </div>
            );
          })}
          {enrollments.length === 0 && <p className="text-center text-muted-foreground py-6">{t('لا يوجد طلاب مسجلين', 'No enrolled students')}</p>}
        </div>
      </div>
    </motion.div>
  );
}
