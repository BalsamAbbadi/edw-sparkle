import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, Save, LogOut, Mail, BookOpen, Users } from 'lucide-react';
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

  const { data: courseCount = 0 } = useQuery({
    queryKey: ['course-count'],
    queryFn: async () => {
      const { count } = await supabase.from('courses').select('*', { count: 'exact', head: true });
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: studentCount = 0 } = useQuery({
    queryKey: ['student-count'],
    queryFn: async () => {
      const { count } = await supabase.from('students').select('*', { count: 'exact', head: true });
      return count || 0;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setForm({ display_name: profile.display_name || '', bio: profile.bio || '', status_caption: profile.status_caption || '' });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({
        display_name: form.display_name, bio: form.bio, status_caption: form.status_caption,
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      {/* Cover / Header */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="h-40 bg-gradient-to-br from-primary via-primary/80 to-secondary" />
        <div className="absolute -bottom-16 start-6">
          <label className="relative cursor-pointer group">
            <div className="w-32 h-32 rounded-full bg-card flex items-center justify-center overflow-hidden border-4 border-card shadow-xl">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-14 h-14 text-primary" />
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-primary-foreground" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
          </label>
        </div>
      </div>

      {/* Name & Status */}
      <div className="pt-20 px-2">
        <h1 className="text-3xl font-bold text-foreground">{profile?.display_name || user?.email}</h1>
        {profile?.status_caption && <p className="text-muted-foreground mt-1 text-lg">{profile.status_caption}</p>}
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <Mail className="w-4 h-4" />{user?.email}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
          <div><p className="text-2xl font-bold text-foreground">{courseCount}</p><p className="text-xs text-muted-foreground">{t('دورة', 'Courses')}</p></div>
        </div>
        <div className="glass-card rounded-xl p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><Users className="w-5 h-5 text-secondary-foreground" /></div>
          <div><p className="text-2xl font-bold text-foreground">{studentCount}</p><p className="text-xs text-muted-foreground">{t('طالب', 'Students')}</p></div>
        </div>
      </div>

      {/* Bio */}
      {profile?.bio && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-2">{t('نبذة عني', 'About Me')}</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
        </div>
      )}

      {/* Edit Form */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-foreground">{t('تعديل الملف الشخصي', 'Edit Profile')}</h3>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">{t('الاسم', 'Name')}</label>
          <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">{t('الحالة', 'Status')}</label>
          <input value={form.status_caption} onChange={e => setForm(f => ({ ...f, status_caption: e.target.value }))} placeholder={t('مثال: متاح للتدريس', 'e.g. Available')} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">{t('النبذة', 'Bio')}</label>
          <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={4} className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none resize-none" />
        </div>
        <div className="flex gap-3">
          <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" />{t('حفظ', 'Save')}
          </button>
          <button onClick={signOut} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors">
            <LogOut className="w-4 h-4" />{t('خروج', 'Logout')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
