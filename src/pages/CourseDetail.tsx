import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Users, StickyNote, FolderOpen, Calendar, ArrowRight, Plus, X, Trash2, Upload, Download, Edit2, Check, ExternalLink, Phone, CheckSquare, Square, AlertTriangle, Pin, PinOff, Pin as PinIcon, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, addDays, isBefore, differenceInCalendarDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNotification } from '@/hooks/useNotification';

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
  const { notify } = useNotification();
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
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteSearch, setNoteSearch] = useState('');
  const [sessionNoteId, setSessionNoteId] = useState<string | null>(null);
  const [sessionNoteText, setSessionNoteText] = useState('');

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

  // Check all sessions for conflicts
  const { data: allSessions = [] } = useQuery({
    queryKey: ['all-sessions-conflict'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sessions').select('id, session_date, start_time, end_time, title, course_id');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Detect session conflicts
  const hasConflict = (sessionDate: string, startTime: string, endTime: string | null, excludeId?: string) => {
    return allSessions.some((s: any) => {
      if (s.id === excludeId) return false;
      if (s.session_date !== sessionDate) return false;
      const sStart = s.start_time;
      const sEnd = s.end_time || s.start_time;
      const newEnd = endTime || startTime;
      return (startTime < sEnd && newEnd > sStart);
    });
  };

  // Attendance count per session
  const { data: attendanceCounts = {} } = useQuery({
    queryKey: ['attendance-counts', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance').select('session_id, is_present').eq('course_id', id!);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((a: any) => { if (a.is_present) counts[a.session_id] = (counts[a.session_id] || 0) + 1; });
      return counts;
    },
    enabled: !!id && !!user,
  });

  // Payment interval logic
  const paymentInterval = (course as any)?.payment_interval_sessions || 0;
  const completedSessionsCount = sessions.filter((s: any) => isBefore(new Date(s.session_date), new Date())).length;
  const isPaymentDue = paymentInterval > 0 && completedSessionsCount > 0 && completedSessionsCount % paymentInterval === 0;

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
      return studentForm.name;
    },
    onSuccess: (name) => {
      qc.invalidateQueries({ queryKey: ['enrollments', id] });
      qc.invalidateQueries({ queryKey: ['course-payments', id] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      notify('student', t(`تم إضافة طالب: ${name} إلى ${course?.title}`, `Student added: ${name} to ${course?.title}`), `/students/${name}`);
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
      notify('student', t(`تم تحديث بيانات الطالب: ${editStudentForm.name}`, `Student updated: ${editStudentForm.name}`), `/students/${editStudentId}`);
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
      notify('payment', t('تم تحديث حالة الدفع', 'Payment updated'), `/courses/${id}`);
      toast.success(t('تم تحديث الدفعة', 'Payment updated'));
      setEditPaymentId(null);
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const contentHtml = noteContentRef.current?.innerHTML || noteForm.content;
      if (editingNoteId) {
        const { error } = await supabase.from('notes').update({
          title: noteForm.title, content: contentHtml, color: noteForm.color, is_checklist: noteForm.is_checklist,
        }).eq('id', editingNoteId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notes').insert({
          user_id: user!.id, course_id: id!, title: noteForm.title, content: contentHtml, color: noteForm.color, is_checklist: noteForm.is_checklist,
        });
        if (error) throw error;
        notify('note', t(`تمت إضافة ملاحظة في ${course?.title}`, `Note added in ${course?.title}`), `/courses/${id}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-notes', id] });
      qc.invalidateQueries({ queryKey: ['all-notes'] });
      toast.success(editingNoteId ? t('تم تعديل الملاحظة', 'Note updated') : t('تمت إضافة الملاحظة', 'Note added'));
      setShowAddNote(false);
      setEditingNoteId(null);
      setNoteForm({ title: '', content: '', color: '#FEF3C7', is_checklist: false });
    },
  });

  const togglePinNoteMutation = useMutation({
    mutationFn: async ({ noteId, pinned }: { noteId: string; pinned: boolean }) => {
      const { error } = await supabase.from('notes').update({ is_pinned: pinned } as any).eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-notes', id] });
      qc.invalidateQueries({ queryKey: ['all-notes'] });
    },
  });

  const handleNoteCheckboxToggle = async (noteId: string, checkboxIndex: number) => {
    const note = notes.find((n: any) => n.id === noteId);
    if (!note) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(note.content || '', 'text/html');
    const checkboxes = doc.querySelectorAll('input[type="checkbox"]');
    const cb = checkboxes[checkboxIndex] as HTMLInputElement | undefined;
    if (!cb) return;
    const wasChecked = cb.hasAttribute('checked');
    if (wasChecked) cb.removeAttribute('checked'); else cb.setAttribute('checked', 'checked');
    const span = cb.parentElement?.querySelector('span');
    if (span) {
      span.style.textDecoration = wasChecked ? 'none' : 'line-through';
      span.style.opacity = wasChecked ? '1' : '0.5';
    }
    await supabase.from('notes').update({ content: doc.body.innerHTML }).eq('id', noteId);
    qc.invalidateQueries({ queryKey: ['course-notes', id] });
    qc.invalidateQueries({ queryKey: ['all-notes'] });
  };

  const startEditNote = (note: any) => {
    setEditingNoteId(note.id);
    setNoteForm({ title: note.title, content: note.content || '', color: note.color || '#FEF3C7', is_checklist: note.is_checklist || false });
    setShowAddNote(true);
    setTimeout(() => { if (noteContentRef.current) noteContentRef.current.innerHTML = note.content || ''; }, 100);
  };

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

  const renderNoteInteractive = (note: any) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(note.content || '', 'text/html');
    return (
      <div className="text-foreground/80 leading-[32px]" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif", fontSize: '18px', whiteSpace: 'pre-wrap' }}>
        {Array.from(doc.body.childNodes).map((node, idx) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.classList.contains('checklist-item') || el.querySelector('input[type="checkbox"]')) {
              const cb = el.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
              const span = el.querySelector('span');
              const isChecked = cb?.hasAttribute('checked');
              const allCbs = doc.querySelectorAll('input[type="checkbox"]');
              let cbIndex = 0;
              for (let i = 0; i < allCbs.length; i++) if (allCbs[i] === cb) { cbIndex = i; break; }
              return (
                <div key={idx} className="flex items-center gap-2 my-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleNoteCheckboxToggle(note.id, cbIndex); }}>
                  {isChecked ? <CheckSquare className="w-4 h-4 text-success shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span style={{ textDecoration: isChecked ? 'line-through' : 'none', opacity: isChecked ? 0.5 : 1 }}>{span?.textContent || el.textContent || ''}</span>
                </div>
              );
            }
            return <div key={idx} dangerouslySetInnerHTML={{ __html: el.outerHTML }} />;
          }
          return <span key={idx}>{node.textContent}</span>;
        })}
      </div>
    );
  };


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
      notify('file', t('تم رفع ملف جديد', 'New file uploaded'), `/courses/${id}`);
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
      // Check for conflicts
      if (hasConflict(editSessionForm.session_date, editSessionForm.start_time, editSessionForm.end_time || null, editSessionId!)) {
        throw new Error(t('يوجد تعارض مع حصة أخرى في نفس الوقت!', 'Conflict with another session at this time!'));
      }
      const { error } = await supabase.from('sessions').update({
        session_date: editSessionForm.session_date, start_time: editSessionForm.start_time, end_time: editSessionForm.end_time || null,
      }).eq('id', editSessionId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-sessions', id] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['all-sessions-conflict'] });
      notify('session', t(`تم تعديل موعد حصة في ${course?.title}`, `Session updated in ${course?.title}`), `/sessions/${editSessionId}`);
      toast.success(t('تم تحديث الحصة', 'Session updated'));
      setEditSessionId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await supabase.from('attendance').delete().eq('session_id', sessionId);
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-sessions', id] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(t('تم حذف الحصة', 'Session deleted'));
    },
  });

  // Postpone: move the selected session to the END of the cycle (after the last session,
  // preserving the recurring interval). Subsequent sessions naturally "move forward" in sequence.
  const postponeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const sorted = [...sessions].sort((a: any, b: any) =>
        a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time)
      );
      const idx = sorted.findIndex((s: any) => s.id === sessionId);
      if (idx < 0 || sorted.length === 0) return;
      const last = sorted[sorted.length - 1];
      // Determine recurring gap (in days) from the last two sessions, default 7
      let gap = 7;
      if (sorted.length >= 2) {
        const d1 = new Date(sorted[sorted.length - 2].session_date);
        const d2 = new Date(last.session_date);
        const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
        if (diff > 0) gap = diff;
      }
      const newDate = format(addDays(new Date(last.session_date), gap), 'yyyy-MM-dd');
      const { error } = await supabase.from('sessions').update({ session_date: newDate }).eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-sessions', id] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      notify('session', t(`تم تأجيل حصة وإزاحة الحصص في ${course?.title}`, `Session postponed in ${course?.title}`), `/courses/${id}`);
      toast.success(t('تم تأجيل الحصة وإزاحة باقي الحصص', 'Session postponed'));
    },
  });

  const saveSessionNoteMutation = useMutation({
    mutationFn: async ({ sid, notes }: { sid: string; notes: string }) => {
      const { error } = await supabase.from('sessions').update({ session_notes: notes }).eq('id', sid);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-sessions', id] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      setSessionNoteId(null);
      toast.success(t('تم حفظ ملاحظة الحصة', 'Session note saved'));
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
      document.execCommand('insertHTML', false, '<div class="checklist-item" style="display:flex;align-items:center;gap:8px;margin:4px 0;"><input type="checkbox" style="width:16px;height:16px;cursor:pointer;" /><span>مهمة جديدة</span></div>');
    }
  };

  if (!course) return <div className="p-8 text-center text-muted-foreground">{t('جاري التحميل...', 'Loading...')}</div>;

  const today = format(new Date(), 'yyyy-MM-dd');
  const isPast = (dateStr: string) => isBefore(new Date(dateStr), new Date());

  const tabs = [
    { key: 'students' as const, label: t('الطلاب', 'Students'), icon: Users, count: enrollments.length },
    { key: 'schedule' as const, label: t('الحصص', 'Sessions'), icon: Calendar, count: sessions.length },
    { key: 'notes' as const, label: t('ملاحظات', 'Notes'), icon: StickyNote, count: notes.length },
    { key: 'files' as const, label: t('ملفات', 'Files'), icon: FolderOpen, count: files.length },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowRight className="w-5 h-5 text-muted-foreground rtl:rotate-0 ltr:rotate-180" />
        </button>
        <BookOpen className="w-6 h-6 text-primary" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
            {isPaymentDue && <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium animate-pulse">💰 {t('موعد الدفع', 'Payment Due')}</span>}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {course.description && <span>{course.description}</span>}
            {course.fees > 0 && <span className="font-medium">₪ {course.fees}</span>}
            {paymentInterval > 0 && <span className="text-xs">({t(`كل ${paymentInterval} حصص`, `Every ${paymentInterval} sessions`)})</span>}
          </div>
        </div>
        <button
          onClick={async () => {
            const willArchive = !(course as any).is_archived;
            await supabase.from('courses').update({ is_archived: willArchive, archived_at: willArchive ? new Date().toISOString() : null } as any).eq('id', id!);
            qc.invalidateQueries({ queryKey: ['course', id] });
            qc.invalidateQueries({ queryKey: ['courses'] });
            toast.success(willArchive ? t('تم أرشفة الدورة', 'Course archived') : t('تمت إزالة الأرشفة', 'Unarchived'));
          }}
          className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 text-sm font-medium flex items-center gap-2"
        >
          {(course as any).is_archived ? '↩️' : '🗄️'} {(course as any).is_archived ? t('إزالة الأرشفة', 'Unarchive') : t('أرشفة', 'Archive')}
        </button>
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
                      <p className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/students/${enr.student_id}`)}>{enr.students?.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {enr.students?.grade && <span>{enr.students.grade}</span>}
                        {enr.students?.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{enr.students.phone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {payment && editPaymentId === payment.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" value={editPaymentAmount || ''} onChange={e => setEditPaymentAmount(e.target.value === '' ? 0 : Number(e.target.value))} min={0} max={payment.total_amount} className="w-20 px-2 py-1 rounded border border-input bg-background text-foreground text-xs" />
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
          {/* Session Note Modal */}
          <AnimatePresence>
            {sessionNoteId && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4" onClick={() => setSessionNoteId(null)}>
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 p-6 space-y-4" onClick={e => e.stopPropagation()}>
                  <h3 className="font-bold">{t('ملاحظات الحصة', 'Session Notes')}</h3>
                  <textarea value={sessionNoteText} onChange={e => setSessionNoteText(e.target.value)} rows={4} placeholder={t('أضف ملاحظاتك...', 'Add notes...')} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none" />
                  <button onClick={() => saveSessionNoteMutation.mutate({ sid: sessionNoteId, notes: sessionNoteText })} className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium">{t('حفظ', 'Save')}</button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {sessions.map((s: any, idx: number) => {
            const sessionIsPast = isPast(s.session_date);
            const isPaymentSession = paymentInterval > 0 && (idx + 1) % paymentInterval === 0;
            const conflict = hasConflict(s.session_date, s.start_time, s.end_time, s.id);
            return (
              <div key={s.id} className={`glass-card rounded-xl p-4 transition-all ${sessionIsPast ? 'opacity-50 grayscale' : ''} ${conflict ? 'border-destructive/50 border-2' : ''}`}>
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
                    <div className="cursor-pointer flex-1" onClick={() => navigate(`/sessions/${s.id}`)}>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground hover:text-primary transition-colors">{t('حصة', 'Session')} #{idx + 1}</p>
                        {isPaymentSession && <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium">💰</span>}
                        {conflict && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{t('تعارض', 'Conflict')}</span>}
                        {attendanceCounts[s.id] > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success">{attendanceCounts[s.id]} ✓</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(s.session_date), 'EEEE dd/MM/yyyy', { locale: lang === 'ar' ? ar : undefined })} • {s.start_time?.slice(0, 5)}{s.end_time ? ` - ${s.end_time?.slice(0, 5)}` : ''}
                      </p>
                      {s.session_notes && <p className="text-xs text-warning mt-1">📝 {s.session_notes}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setSessionNoteId(s.id); setSessionNoteText(s.session_notes || ''); }} className="p-2 rounded-lg hover:bg-muted"><StickyNote className="w-4 h-4 text-warning" /></button>
                      <button onClick={() => { setEditSessionId(s.id); setEditSessionForm({ session_date: s.session_date, start_time: s.start_time, end_time: s.end_time || '' }); }} className="p-2 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
                      <button onClick={() => { if (window.confirm(t('تأجيل وإزاحة جميع الحصص التالية؟', 'Postpone and shift all following sessions?'))) postponeSessionMutation.mutate(s.id); }} className="p-2 rounded-lg hover:bg-warning/10"><Calendar className="w-4 h-4 text-warning" /></button>
                      <button onClick={() => { if (window.confirm(t('حذف الحصة؟', 'Delete session?'))) deleteSessionMutation.mutate(s.id); }} className="p-2 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {sessions.length === 0 && <p className="text-center text-muted-foreground py-8">{t('لا توجد حصص', 'No sessions')}</p>}
        </div>
      )}

      {/* Notes Tab */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { setEditingNoteId(null); setNoteForm({ title: '', content: '', color: '#FEF3C7', is_checklist: false }); setShowAddNote(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              <Plus className="w-4 h-4" />{t('ملاحظة جديدة', 'New Note')}
            </button>
            <div className="relative">
              <Search className="absolute start-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input value={noteSearch} onChange={e => setNoteSearch(e.target.value)} placeholder={t('بحث في الملاحظات...', 'Search notes...')} className="ps-10 pe-4 py-2 rounded-lg border border-input bg-background/50 backdrop-blur-sm text-foreground text-sm w-56 focus:ring-2 focus:ring-ring outline-none" />
            </div>
          </div>

          <AnimatePresence>
            {showAddNote && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-2xl bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 overflow-hidden max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center p-4 border-b border-border">
                    <h3 className="font-bold text-lg">{editingNoteId ? t('تعديل الملاحظة', 'Edit Note') : t('ملاحظة جديدة', 'New Note')}</h3>
                    <button onClick={() => { setShowAddNote(false); setEditingNoteId(null); }}><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-4 space-y-4">
                    <input value={noteForm.title} onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))} placeholder={t('العنوان', 'Title')} className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground text-lg font-semibold" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground">{t('لون النص:', 'Text color:')}</span>
                      {TEXT_COLORS.map(c => (
                        <button key={c.value} onClick={() => setSelectedTextColor(c.value)} className={`w-6 h-6 rounded-full border-2 transition-all ${selectedTextColor === c.value ? 'border-primary scale-110' : 'border-transparent'}`} style={{ backgroundColor: c.value }} />
                      ))}
                      <button onClick={applyNoteColor} className="px-2 py-1 text-xs rounded bg-muted text-foreground">{t('تلوين المحدد', 'Color selected')}</button>
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
                      <div
                        ref={noteContentRef}
                        contentEditable
                        suppressContentEditableWarning
                        onFocus={() => { try { document.execCommand('defaultParagraphSeparator', false, 'br'); } catch {} }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            document.execCommand('insertLineBreak');
                          }
                        }}
                        className="min-h-[210px] outline-none text-foreground leading-[32px]"
                        style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif", fontSize: '18px', lineHeight: '32px', whiteSpace: 'pre-wrap' }}
                      />
                    </div>
                    <button onClick={() => addNoteMutation.mutate()} disabled={!noteForm.title} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
                      {editingNoteId ? t('حفظ التعديلات', 'Save Changes') : t('حفظ', 'Save')}
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
                          <button onClick={() => togglePinNoteMutation.mutate({ noteId: note.id, pinned: !(note as any).is_pinned })} className="p-2 rounded-lg hover:bg-foreground/10">
                            {(note as any).is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                          </button>
                          <button onClick={() => { setExpandedNote(null); startEditNote(note); }} className="p-2 rounded-lg hover:bg-foreground/10"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => { if (window.confirm(t('حذف؟', 'Delete?'))) { deleteNoteMutation.mutate(note.id); setExpandedNote(null); } }} className="p-2 rounded-lg hover:bg-foreground/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                          <button onClick={() => setExpandedNote(null)} className="p-2 rounded-lg hover:bg-foreground/10"><X className="w-5 h-5" /></button>
                        </div>
                      </div>
                      {renderNoteInteractive(note)}
                    </div>
                  </motion.div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...notes]
              .filter((n: any) => {
                const q = noteSearch.toLowerCase();
                if (!q) return true;
                return (n.title || '').toLowerCase().includes(q) || (n.content || '').replace(/<[^>]*>/g, '').toLowerCase().includes(q);
              })
              .sort((a: any, b: any) => ((b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)))
              .map((note: any) => (
                <motion.div key={note.id} whileHover={{ y: -2 }} onClick={() => setExpandedNote(note.id)} className="note-paper rounded-xl p-5 relative group min-h-[160px] cursor-pointer shadow-sm" style={{ backgroundColor: note.color }}>
                  <div className="absolute top-2 end-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    {(note as any).is_pinned && <PinIcon className="w-4 h-4 text-primary" />}
                    <button onClick={() => togglePinNoteMutation.mutate({ noteId: note.id, pinned: !(note as any).is_pinned })} className="p-1 rounded hover:bg-foreground/10">
                      {(note as any).is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => startEditNote(note)} className="p-1 rounded hover:bg-foreground/10"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { if (window.confirm(t('حذف؟', 'Delete?'))) deleteNoteMutation.mutate(note.id); }} className="p-1 rounded hover:bg-foreground/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                  {(note as any).is_pinned && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium mb-2 inline-block">📌 {t('مثبتة', 'Pinned')}</span>}
                  <h4 className="font-semibold mb-2 text-foreground">{note.title}</h4>
                  {renderNoteInteractive(note)}
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
