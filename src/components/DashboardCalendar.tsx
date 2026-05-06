import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, StickyNote, X } from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'day' | 'week' | 'month';

const DAY_NAMES_AR = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const DAY_NAMES_AR_SHORT = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];
const DAY_NAMES_EN = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_NAMES_EN_SHORT = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function DashboardCalendar() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedSession, setDraggedSession] = useState<any>(null);
  const [noteSession, setNoteSession] = useState<any>(null);
  const [noteText, setNoteText] = useState('');
  const [extendedHours, setExtendedHours] = useState(false);

  const locale = lang === 'ar' ? ar : undefined;
  const isRTL = lang === 'ar';
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sessions').select('*').order('session_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, date, time }: { id: string; date: string; time: string }) => {
      const { error } = await supabase.from('sessions').update({ session_date: date, start_time: time }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['course-sessions'] });
      toast.success(t('تم تحديث الجلسة', 'Session updated'));
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from('sessions').update({ session_notes: notes }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      setNoteSession(null);
      toast.success(t('تم حفظ الملاحظة', 'Note saved'));
    },
  });

  const navigateCalendar = (direction: 'prev' | 'next') => {
    const d = direction === 'next' ? 1 : -1;
    if (viewMode === 'day') setCurrentDate(prev => addDays(prev, d));
    else if (viewMode === 'week') setCurrentDate(prev => d > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    else setCurrentDate(prev => d > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 6 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  const views: { key: ViewMode; label: string }[] = [
    { key: 'day', label: t('يوم', 'Day') },
    { key: 'week', label: t('أسبوع', 'Week') },
    { key: 'month', label: t('شهر', 'Month') },
  ];

  const getSessionsForDateHour = (date: Date, hour: number) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return sessions.filter((s: any) => s.session_date === dateStr && parseInt(s.start_time?.split(':')[0]) === hour);
  };

  const getSessionsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return sessions.filter((s: any) => s.session_date === dateStr);
  };

  const handleDragStart = (e: React.DragEvent, session: any) => {
    setDraggedSession(session);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    if (!draggedSession) return;
    updateSessionMutation.mutate({ id: draggedSession.id, date: format(date, 'yyyy-MM-dd'), time: `${String(hour).padStart(2, '0')}:00` });
    setDraggedSession(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const currentDayIndex = (currentDate.getDay() + 1) % 7;
  const dayNameFull = lang === 'ar' ? DAY_NAMES_AR[currentDayIndex] : DAY_NAMES_EN[currentDayIndex];

  let headerTitle = '';
  if (viewMode === 'day') headerTitle = `${dayNameFull} - ${format(currentDate, 'dd / MM / yyyy')}`;
  else if (viewMode === 'week') headerTitle = format(currentDate, 'dd MMMM yyyy', { locale });
  else headerTitle = format(currentDate, 'MMMM yyyy', { locale });

  const dayNames = lang === 'ar' ? DAY_NAMES_AR_SHORT : DAY_NAMES_EN_SHORT;

  const SessionBlock = ({ session, compact = false }: { session: any; compact?: boolean }) => (
    <div
      draggable
      onDragStart={e => handleDragStart(e, session)}
      onClick={() => navigate(`/sessions/${session.id}`)}
      className={`${session.color || 'bg-primary/20 text-primary border-primary/30'} border rounded-lg ${compact ? 'p-1.5 text-xs' : 'p-3'} cursor-pointer relative group/session`}
    >
      <div className="font-semibold truncate">{session.title}</div>
      <div className={`opacity-70 ${compact ? '' : 'text-sm'}`}>{session.start_time?.slice(0, 5)}{session.end_time ? ` - ${session.end_time?.slice(0, 5)}` : ''}</div>
      {session.session_notes && <div className="absolute top-1 end-1"><StickyNote className="w-3 h-3 text-warning" /></div>}
      <button
        onClick={(e) => { e.stopPropagation(); setNoteSession(session); setNoteText(session.session_notes || ''); }}
        className="absolute bottom-1 end-1 opacity-0 group-hover/session:opacity-100 transition-opacity p-0.5 rounded hover:bg-foreground/10"
      >
        <StickyNote className="w-3 h-3" />
      </button>
    </div>
  );

  return (
    <div className="glass-card rounded-2xl overflow-hidden bg-card/60 backdrop-blur-xl border border-border/50">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-border gap-3">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">{headerTitle}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted/50 backdrop-blur-sm rounded-lg p-1">
            {views.map(v => (
              <button key={v.key} onClick={() => setViewMode(v.key)} className={`px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === v.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => navigateCalendar('prev')} className="p-2 rounded-lg hover:bg-muted transition-colors"><PrevIcon className="w-4 h-4" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm rounded-lg hover:bg-muted transition-colors text-primary font-medium">{t('اليوم', 'Today')}</button>
            <button onClick={() => navigateCalendar('next')} className="p-2 rounded-lg hover:bg-muted transition-colors"><NextIcon className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Session Note Modal */}
      <AnimatePresence>
        {noteSession && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4" onClick={() => setNoteSession(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h3 className="font-bold">{t('ملاحظات الحصة', 'Session Notes')}</h3>
                <button onClick={() => setNoteSession(null)}><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-muted-foreground">{noteSession.title} - {noteSession.session_date}</p>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} placeholder={t('أضف ملاحظاتك هنا...', 'Add your notes here...')} className="w-full px-3 py-2 rounded-lg border border-input bg-background/50 text-foreground text-sm resize-none" />
              <button onClick={() => saveNoteMutation.mutate({ id: noteSession.id, notes: noteText })} className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium">{t('حفظ', 'Save')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4">
        {viewMode === 'month' ? (
          <div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: monthDays[0].getDay() === 6 ? 0 : (monthDays[0].getDay() + 1) % 7 }).map((_, i) => <div key={`e-${i}`} />)}
              {monthDays.map(day => {
                const daySessions = getSessionsForDate(day);
                return (
                  <div key={day.toISOString()} onClick={() => { setCurrentDate(day); setViewMode('day'); }} className={`min-h-[60px] flex flex-col items-center justify-start p-1 rounded-lg text-xs cursor-pointer transition-colors ${isToday(day) ? 'bg-primary text-primary-foreground font-bold' : isSameDay(day, currentDate) ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
                    <span>{format(day, 'd')}</span>
                    {daySessions.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />}
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'week' ? (
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div />
                {weekDays.map((day, i) => (
                  <div key={day.toISOString()} onClick={() => { setCurrentDate(day); setViewMode('day'); }} className={`text-center py-2 rounded-lg cursor-pointer hover:bg-muted/50 ${isToday(day) ? 'bg-primary/10' : ''}`}>
                    <div className="text-xs text-muted-foreground">{dayNames[i]}</div>
                    <div className={`text-lg font-bold ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>{format(day, 'd')}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-0">
                {hours.map(hour => (
                  <div key={hour} className="grid grid-cols-8 gap-1">
                    <div className="text-xs text-muted-foreground py-3 text-center">{`${hour}:00`}</div>
                    {weekDays.map(day => {
                      const cellSessions = getSessionsForDateHour(day, hour);
                      return (
                        <div key={`${day.toISOString()}-${hour}`} className="border border-border/20 rounded-md min-h-[44px] p-1 hover:bg-muted/30 transition-colors" onDragOver={handleDragOver} onDrop={e => handleDrop(e, day, hour)}>
                          {cellSessions.map((session: any) => <SessionBlock key={session.id} session={session} compact />)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {hours.map(hour => {
              const cellSessions = getSessionsForDateHour(currentDate, hour);
              return (
                <div key={hour} className="flex gap-3" onDragOver={handleDragOver} onDrop={e => handleDrop(e, currentDate, hour)}>
                  <div className="w-16 text-sm text-muted-foreground py-3 text-center shrink-0">{`${hour}:00`}</div>
                  <div className="flex-1 border-t border-border/30 min-h-[56px] py-2 hover:bg-muted/20 rounded-lg transition-colors px-2">
                    {cellSessions.map((session: any) => <SessionBlock key={session.id} session={session} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 pb-3">
        <p className="text-xs text-muted-foreground text-center">
          {t('💡 اسحب الجلسات لتغيير الوقت • اضغط 📝 لإضافة ملاحظات', '💡 Drag to reschedule • Click 📝 for notes')}
        </p>
      </div>
    </div>
  );
}
