import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

type ViewMode = 'day' | 'week' | 'month';

const demoSessions = [
  { id: '1', title: 'رياضيات', titleEn: 'Mathematics', time: '09:00', color: 'bg-primary/20 text-primary border-primary/30' },
  { id: '2', title: 'فيزياء', titleEn: 'Physics', time: '11:00', color: 'bg-secondary text-secondary-foreground border-secondary-foreground/20' },
  { id: '3', title: 'كيمياء', titleEn: 'Chemistry', time: '14:00', color: 'bg-success/20 text-success border-success/30' },
];

export function DashboardCalendar() {
  const { t, lang } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const locale = lang === 'ar' ? ar : undefined;
  const isRTL = lang === 'ar';
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

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

  const views: { key: ViewMode; label: string }[] = [
    { key: 'day', label: t('يوم', 'Day') },
    { key: 'week', label: t('أسبوع', 'Week') },
    { key: 'month', label: t('شهر', 'Month') },
  ];

  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-border gap-3">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">
            {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : 'dd MMMM yyyy', { locale })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            {views.map(v => (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                  viewMode === v.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('prev')} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <PrevIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-sm rounded-lg hover:bg-muted transition-colors text-primary font-medium"
            >
              {t('اليوم', 'Today')}
            </button>
            <button onClick={() => navigate('next')} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <NextIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="p-4">
        {viewMode === 'month' ? (
          <MonthView days={monthDays} currentDate={currentDate} locale={locale} lang={lang} />
        ) : viewMode === 'week' ? (
          <WeekView days={weekDays} hours={hours} locale={locale} lang={lang} sessions={demoSessions} />
        ) : (
          <DayView date={currentDate} hours={hours} lang={lang} sessions={demoSessions} />
        )}
      </div>

      {/* Hint */}
      <div className="px-4 pb-3">
        <p className="text-xs text-muted-foreground text-center">
          {t('💡 اضغط على جلسة لعرض التفاصيل • اسحب لتغيير الوقت', '💡 Click a session for details • Drag to reschedule')}
        </p>
      </div>
    </div>
  );
}

function MonthView({ days, currentDate, locale, lang }: { days: Date[]; currentDate: Date; locale: any; lang: string }) {
  const dayNames = lang === 'ar'
    ? ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة']
    : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const firstDayOffset = days[0].getDay() === 6 ? 0 : (days[0].getDay() + 1) % 7;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(day => (
          <motion.div
            key={day.toISOString()}
            whileHover={{ scale: 1.05 }}
            className={`aspect-square flex items-center justify-center rounded-lg text-sm cursor-pointer transition-colors ${
              isToday(day)
                ? 'bg-primary text-primary-foreground font-bold'
                : isSameDay(day, currentDate)
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {format(day, 'd')}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function WeekView({ days, hours, locale, lang, sessions }: any) {
  const dayNames = lang === 'ar'
    ? ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة']
    : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Day headers */}
        <div className="grid grid-cols-8 gap-1 mb-2">
          <div className="text-xs text-muted-foreground" />
          {days.map((day: Date, i: number) => (
            <div
              key={day.toISOString()}
              className={`text-center py-2 rounded-lg ${
                isToday(day) ? 'bg-primary/10' : ''
              }`}
            >
              <div className="text-xs text-muted-foreground">{dayNames[i]}</div>
              <div className={`text-lg font-bold ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="space-y-0">
          {hours.map((hour: number) => (
            <div key={hour} className="grid grid-cols-8 gap-1">
              <div className="text-xs text-muted-foreground py-3 text-center">
                {`${hour}:00`}
              </div>
              {days.map((day: Date, dayIndex: number) => {
                const session = dayIndex === 0 && hour === 9 ? sessions[0]
                  : dayIndex === 2 && hour === 11 ? sessions[1]
                  : dayIndex === 4 && hour === 14 ? sessions[2]
                  : null;

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="border border-border/30 rounded-md min-h-[44px] p-1 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    {session && (
                      <motion.div
                        layoutId={session.id}
                        whileHover={{ scale: 1.02 }}
                        className={`${session.color} border rounded-md p-1.5 text-xs cursor-grab active:cursor-grabbing`}
                      >
                        <div className="font-semibold truncate">
                          {lang === 'ar' ? session.title : session.titleEn}
                        </div>
                        <div className="opacity-70">{session.time}</div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DayView({ date, hours, lang, sessions }: any) {
  return (
    <div className="space-y-0">
      {hours.map((hour: number) => {
        const session = hour === 9 ? sessions[0] : hour === 11 ? sessions[1] : hour === 14 ? sessions[2] : null;
        return (
          <div key={hour} className="flex gap-3 group">
            <div className="w-16 text-sm text-muted-foreground py-3 text-center shrink-0">
              {`${hour}:00`}
            </div>
            <div className="flex-1 border-t border-border/30 min-h-[56px] py-2 hover:bg-muted/30 rounded-lg transition-colors px-2">
              {session && (
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className={`${session.color} border rounded-lg p-3 cursor-pointer`}
                >
                  <div className="font-semibold">
                    {lang === 'ar' ? session.title : session.titleEn}
                  </div>
                  <div className="text-sm opacity-70">{session.time}</div>
                </motion.div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
