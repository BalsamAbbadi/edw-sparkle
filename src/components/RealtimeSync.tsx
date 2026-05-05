import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function RealtimeSync() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const invalidateCore = () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['all-payments-income'] });
      qc.invalidateQueries({ queryKey: ['attendance-counts'] });
      qc.invalidateQueries({ queryKey: ['all-enrollments'] });
      qc.invalidateQueries({ queryKey: ['today-sessions'] });
      qc.invalidateQueries({ queryKey: ['payment-stats'] });
      qc.invalidateQueries({ queryKey: ['course-count'] });
      qc.invalidateQueries({ queryKey: ['student-count'] });
    };

    const channel = supabase
      .channel(`app-sync-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        invalidateCore();
        qc.invalidateQueries({ queryKey: ['student-attendance'] });
        qc.invalidateQueries({ queryKey: ['session-attendance'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        invalidateCore();
        qc.invalidateQueries({ queryKey: ['student-payments'] });
        qc.invalidateQueries({ queryKey: ['course-payments'] });
        qc.invalidateQueries({ queryKey: ['payments-by-course'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        invalidateCore();
        qc.invalidateQueries({ queryKey: ['sessions'] });
        qc.invalidateQueries({ queryKey: ['course-sessions'] });
        qc.invalidateQueries({ queryKey: ['session'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => {
        invalidateCore();
        qc.invalidateQueries({ queryKey: ['courses'] });
        qc.invalidateQueries({ queryKey: ['course'] });
        qc.invalidateQueries({ queryKey: ['courses-income'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => {
        invalidateCore();
        qc.invalidateQueries({ queryKey: ['enrollments'] });
        qc.invalidateQueries({ queryKey: ['student-enrollments'] });
        qc.invalidateQueries({ queryKey: ['session-enrollments'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        qc.invalidateQueries({ queryKey: ['notifications'] });
        qc.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, user]);

  return null;
}