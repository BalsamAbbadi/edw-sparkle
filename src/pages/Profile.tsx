import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, Save, LogOut } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ display_name: '', bio: '', status_caption: '' });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        status_caption: profile.status_caption || '',
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({
        display_name: form.display_name,
        bio: form.bio,
        status_caption: form.status_caption,
      }).eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success(t('تم حفظ التعديلات', 'Changes saved'));
    },
  });

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const filePath = `${user!.id}/avatar_${Date.now()}`;
    const { error: uploadError } = await supabase.storage.from('course-files').upload(filePath, file);
    if (uploadError) { toast.error(uploadError.message); return; }
    const { data: urlData } = supabase.storage.from('course-files').getPublicUrl(filePath);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('user_id', user!.id);
    qc.invalidateQueries({ queryKey: ['profile'] });
    toast.success(t('تم تحديث الصورة', 'Avatar updated'));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <User className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{t('الملف الشخصي', 'Profile')}</h1>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-6">
        {/* Avatar */}
        <div className="flex justify-center">
          <label className="relative cursor-pointer group">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-primary/20">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-primary" />
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-primary-foreground" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">{t('الاسم', 'Name')}</label>
            <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">{t('النبذة', 'Bio')}</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">{t('الحالة', 'Status')}</label>
            <input value={form.status_caption} onChange={e => setForm(f => ({ ...f, status_caption: e.target.value }))} placeholder={t('مثال: متاح للتدريس', 'e.g. Available for teaching')} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Save className="w-4 h-4" />{t('حفظ', 'Save')}
            </button>
            <button onClick={signOut} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors">
              <LogOut className="w-4 h-4" />{t('خروج', 'Logout')}
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">{user?.email}</p>
    </motion.div>
  );
}
