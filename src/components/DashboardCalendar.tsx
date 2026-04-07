import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

type ViewMode = 'day' | 'week' | 'month';

const DAY_NAMES_AR = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const DAY_NAMES_AR_SHORT = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];
const DAY_NAMES_EN = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_NAMES_EN_SHORT = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function DashboardCalendar() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedSession, setDraggedSession] = useState<any>(null);

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
      toast.success(t('تم تحديث الجلسة', 'Session updated'));
    },
  });

  const navigate = (direction: 'prev' | 'next') => {
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
    const newDate = format(date, 'yyyy-MM-dd');
    const newTime = `${String(hour).padStart(2, '0')}:00`;
    updateSessionMutation.mutate({ id: draggedSession.id, date: newDate, time: newTime });
    setDraggedSession(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Get current day name for daily view header
  const currentDayIndex = (currentDate.getDay() + 1) % 7; // Adjusted for Saturday start
  const dayNameFull = lang === 'ar' ? DAY_NAMES_AR[currentDayIndex] : DAY_NAMES_EN[currentDayIndex];

  // Title based on view
  let headerTitle = '';
  if (viewMode === 'day') {
    headerTitle = `${dayNameFull} - ${format(currentDate, 'dd / MM / yyyy')}`;
  } else if (viewMode === 'week') {
    headerTitle = format(currentDate, 'dd MMMM yyyy', { locale });
  } else {
    headerTitle = format(currentDate, 'MMMM yyyy', { locale });
  }

  const dayNames = lang === 'ar' ? DAY_NAMES_AR_SHORT : DAY_NAMES_EN_SHORT;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-border gap-3">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">{headerTitle}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            {views.map(v => (
              <button key={v.key} onClick={() => setViewMode(v.key)} className={`px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === v.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('prev')} className="p-2 rounded-lg hover:bg-muted transition-colors"><PrevIcon className="w-4 h-4" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm rounded-lg hover:bg-muted transition-colors text-primary font-medium">{t('اليوم', 'Today')}</button>
            <button onClick={() => navigate('next')} className="p-2 rounded-lg hover:bg-muted transition-colors"><NextIcon className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {viewMode === 'month' ? (
          <div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: monthDays[0].getDay() === 6 ? 0 : (monthDays[0].getDay() + 1) % 7 }).map((_, i) => <div key={`e-${i}`} />)}
              {monthDays.map(day => {
                const daySessions = getSessionsForDate(day);
                return (
                  <div key={day.toISOString()} onClick={() => { setCurrentDate(day); setViewMode('day'); }} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm cursor-pointer transition-colors relative ${isToday(day) ? 'bg-primary text-primary-foreground font-bold' : isSameDay(day, currentDate) ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
                    {format(day, 'd')}
                    {daySessions.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-primary absolute bottom-1" />}
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
                        <div key={`${day.toISOString()}-${hour}`} className="border border-border/30 rounded-md min-h-[44px] p-1 hover:bg-muted/50 transition-colors cursor-pointer" onDragOver={handleDragOver} onDrop={e => handleDrop(e, day, hour)}>
                          {cellSessions.map((session: any) => (
                            <div key={session.id} draggable onDragStart={e => handleDragStart(e, session)} className={`${session.color || 'bg-primary/20 text-primary border-primary/30'} border rounded-md p-1.5 text-xs cursor-grab active:cursor-grabbing`}>
                              <div className="font-semibold truncate">{session.title}</div>
                              <div className="opacity-70">{session.start_time?.slice(0, 5)}</div>
                            </div>
                          ))}
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
                  <div className="flex-1 border-t border-border/30 min-h-[56px] py-2 hover:bg-muted/30 rounded-lg transition-colors px-2">
                    {cellSessions.map((session: any) => (
                      <div key={session.id} draggable onDragStart={e => handleDragStart(e, session)} className={`${session.color || 'bg-primary/20 text-primary border-primary/30'} border rounded-lg p-3 cursor-grab active:cursor-grabbing`}>
                        <div className="font-semibold">{session.title}</div>
                        <div className="text-sm opacity-70">{session.start_time?.slice(0, 5)}{session.end_time ? ` - ${session.end_time?.slice(0, 5)}` : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 pb-3">
        <p className="text-xs text-muted-foreground text-center">
          {t('💡 اسحب الجلسات لتغيير الوقت والتاريخ', '💡 Drag sessions to change time and date')}
        </p>
      </div>
    </div>
  );
}
