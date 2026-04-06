import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function NotificationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').delete().eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const typeIcon = (type: string) => {
    if (type === 'payment') return '💰';
    if (type === 'session') return '📅';
    if (type === 'reminder') return '⏰';
    return '🔔';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-warning" />
          <h1 className="text-2xl font-bold text-foreground">{t('الإشعارات', 'Notifications')}</h1>
          {unreadCount > 0 && <span className="px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">{unreadCount}</span>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-primary hover:underline">{t('تحديد الكل كمقروء', 'Mark all as read')}</button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass-card rounded-xl p-6 animate-pulse h-16" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('لا توجد إشعارات', 'No notifications')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div key={n.id} className={`glass-card rounded-xl p-4 flex items-center justify-between ${!n.is_read ? 'border-s-4 border-s-primary' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{typeIcon(n.type)}</span>
                <div>
                  <p className={`text-sm ${!n.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{n.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {!n.is_read && <button onClick={() => markReadMutation.mutate(n.id)} className="p-2 rounded-lg hover:bg-muted"><Check className="w-4 h-4 text-success" /></button>}
                <button onClick={() => deleteMutation.mutate(n.id)} className="p-2 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
