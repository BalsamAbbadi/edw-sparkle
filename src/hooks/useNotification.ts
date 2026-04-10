import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export function useNotification() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const notify = async (type: string, message: string, linkTo?: string) => {
    if (!user) return;
    await supabase.from('notifications').insert({ user_id: user.id, type, message, link_to: linkTo || '' } as any);
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['unread-notifications-count'] });
  };

  return { notify };
}
