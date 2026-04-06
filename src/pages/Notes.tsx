import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Plus, Trash2, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const COLORS = ['#FEF3C7', '#DBEAFE', '#F3E8FF', '#DCFCE7', '#FFE4E6'];

export default function NotesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', color: '#FEF3C7', is_checklist: false });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['general-notes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notes').select('*').is('course_id', null).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notes').insert({
        user_id: user!.id, title: form.title, content: form.content, color: form.color, is_checklist: form.is_checklist,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['general-notes'] });
      toast.success(t('تمت إضافة الملاحظة', 'Note added'));
      setShowForm(false);
      setForm({ title: '', content: '', color: '#FEF3C7', is_checklist: false });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['general-notes'] });
      toast.success(t('تم حذف الملاحظة', 'Note deleted'));
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StickyNote className="w-6 h-6 text-accent-foreground" />
          <h1 className="text-2xl font-bold text-foreground">{t('الملاحظات', 'Notes')}</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Plus className="w-4 h-4" />{t('ملاحظة جديدة', 'New Note')}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <h3 className="font-semibold">{t('ملاحظة جديدة', 'New Note')}</h3>
                <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
              </div>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t('العنوان', 'Title')} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder={t('المحتوى', 'Content')} rows={5} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none" />
              <div className="flex items-center gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-primary scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
              <button onClick={() => addMutation.mutate()} disabled={!form.title} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">{t('حفظ', 'Save')}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map(i => <div key={i} className="rounded-xl p-6 animate-pulse h-40" />)}</div>
      ) : notes.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <StickyNote className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('لا توجد ملاحظات', 'No notes yet')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note: any) => (
            <motion.div key={note.id} whileHover={{ y: -2 }} className="note-paper rounded-xl p-5 relative group shadow-sm" style={{ backgroundColor: note.color }}>
              <button onClick={() => deleteMutation.mutate(note.id)} className="absolute top-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-foreground/10">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
              <h3 className="font-bold text-foreground mb-2">{note.title}</h3>
              <p className="text-sm text-foreground/70 whitespace-pre-wrap line-clamp-6">{note.content}</p>
              <p className="text-xs text-foreground/40 mt-3">{new Date(note.created_at).toLocaleDateString()}</p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
