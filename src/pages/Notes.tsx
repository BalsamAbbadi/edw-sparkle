import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Plus, Trash2, X, Edit2, Search, CheckSquare, Square, Pin, PinOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNotification } from '@/hooks/useNotification';

const TEXT_COLORS = [
  { label: 'أسود', value: '#1a1a1a' },
  { label: 'أحمر', value: '#dc2626' },
  { label: 'أزرق', value: '#2563eb' },
  { label: 'أخضر', value: '#16a34a' },
  { label: 'بنفسجي', value: '#9333ea' },
  { label: 'برتقالي', value: '#ea580c' },
];

const PAPER_COLORS = ['#FEF3C7', '#DBEAFE', '#F3E8FF', '#DCFCE7', '#FFE4E6', '#FFF7ED', '#F0FDF4', '#ECFEFF'];

export default function NotesPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { notify } = useNotification();
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', content: '', color: '#FEF3C7', is_checklist: false });
  const [selectedColor, setSelectedColor] = useState('#1a1a1a');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: allNotes = [], isLoading } = useQuery({
    queryKey: ['all-notes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notes').select('*, courses(title)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const contentHtml = contentRef.current?.innerHTML || form.content;
      if (editingNote) {
        const { error } = await supabase.from('notes').update({
          title: form.title, content: contentHtml, color: form.color, is_checklist: form.is_checklist,
        }).eq('id', editingNote.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notes').insert({
          user_id: user!.id, title: form.title, content: contentHtml, color: form.color, is_checklist: form.is_checklist,
        });
        if (error) throw error;
        notify('note', t(`تمت إضافة ملاحظة: ${form.title}`, `Note added: ${form.title}`));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-notes'] });
      toast.success(editingNote ? t('تم تعديل الملاحظة', 'Note updated') : t('تمت إضافة الملاحظة', 'Note added'));
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-notes'] });
      toast.success(t('تم حذف الملاحظة', 'Note deleted'));
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await supabase.from('notes').delete().eq('id', id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-notes'] });
      setSelectedIds(new Set());
      setMultiSelectMode(false);
      toast.success(t('تم حذف الملاحظات المحددة', 'Selected notes deleted'));
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from('notes').update({ is_pinned: pinned }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-notes'] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingNote(null);
    setForm({ title: '', content: '', color: '#FEF3C7', is_checklist: false });
  };

  const startEdit = (note: any) => {
    setEditingNote(note);
    setForm({ title: note.title, content: note.content || '', color: note.color || '#FEF3C7', is_checklist: note.is_checklist || false });
    setShowForm(true);
    setTimeout(() => {
      if (contentRef.current) contentRef.current.innerHTML = note.content || '';
    }, 100);
  };

  const applyColor = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      document.execCommand('foreColor', false, selectedColor);
    }
  };

  const insertChecklist = () => {
    if (contentRef.current) {
      document.execCommand('insertHTML', false, '<div class="checklist-item"><input type="checkbox" class="checklist-cb" /> </div>');
    }
  };

  // Handle checkbox click in expanded note view
  const handleNoteClick = async (noteId: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
      e.stopPropagation();
      // Toggle the checkbox
      const note = allNotes.find((n: any) => n.id === noteId);
      if (!note) return;
      const parser = new DOMParser();
      const doc = parser.parseFromString(note.content || '', 'text/html');
      const checkboxes = doc.querySelectorAll('input[type="checkbox"]');
      // Find which checkbox was clicked by index
      const container = (target as HTMLElement).closest('.checklist-item') || target.parentElement;
      const allCheckboxesInView = container?.parentElement?.querySelectorAll('input[type="checkbox"]');
      // Simple approach: just update the HTML
      setTimeout(async () => {
        const viewEl = document.querySelector(`[data-note-id="${noteId}"]`);
        if (viewEl) {
          await supabase.from('notes').update({ content: viewEl.innerHTML }).eq('id', noteId);
          qc.invalidateQueries({ queryKey: ['all-notes'] });
        }
      }, 100);
    }
  };

  const filtered = allNotes.filter((n: any) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const titleMatch = (n.title || '').toLowerCase().includes(q);
    const contentText = (n.content || '').replace(/<[^>]*>/g, '').toLowerCase();
    return titleMatch || contentText.includes(q);
  });

  // Sort: pinned first
  const sortedNotes = [...filtered].sort((a: any, b: any) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return 0;
  });

  const fontFamily = lang === 'ar' ? "'Tajawal', 'Cairo', sans-serif" : "'Caveat', cursive";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <StickyNote className="w-6 h-6 text-accent-foreground" />
          <h1 className="text-2xl font-bold text-foreground">{t('الملاحظات', 'Notes')}</h1>
          <span className="text-sm text-muted-foreground">({allNotes.length})</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute start-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('بحث في العنوان والنص...', 'Search title & content...')} className="ps-10 pe-4 py-2 rounded-lg border border-input bg-background/50 backdrop-blur-sm text-foreground text-sm w-56 focus:ring-2 focus:ring-ring outline-none" />
          </div>
          <button onClick={() => { setMultiSelectMode(!multiSelectMode); setSelectedIds(new Set()); }} className={`p-2 rounded-lg transition-colors ${multiSelectMode ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
            <CheckSquare className="w-4 h-4" />
          </button>
          <button onClick={() => { closeForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />{t('ملاحظة جديدة', 'New Note')}
          </button>
        </div>
      </div>

      {/* Multi-select actions */}
      <AnimatePresence>
        {multiSelectMode && selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card rounded-xl p-4 flex items-center justify-between bg-card/60 backdrop-blur-xl border border-primary/20">
            <span className="text-sm font-medium">{t(`${selectedIds.size} محددة`, `${selectedIds.size} selected`)}</span>
            <button onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">{t('حذف المحددة', 'Delete Selected')}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-2xl bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h3 className="font-bold text-lg">{editingNote ? t('تعديل الملاحظة', 'Edit Note') : t('ملاحظة جديدة', 'New Note')}</h3>
                <button onClick={closeForm}><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t('العنوان', 'Title')} className="w-full px-4 py-3 rounded-lg border border-input bg-background/50 text-foreground text-lg font-semibold" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">{t('لون النص:', 'Text color:')}</span>
                  {TEXT_COLORS.map(c => (
                    <button key={c.value} onClick={() => setSelectedColor(c.value)} className={`w-6 h-6 rounded-full border-2 transition-all ${selectedColor === c.value ? 'border-primary scale-110' : 'border-transparent'}`} style={{ backgroundColor: c.value }} />
                  ))}
                  <button onClick={applyColor} className="px-2 py-1 text-xs rounded bg-muted text-foreground hover:bg-muted/80">{t('تلوين المحدد', 'Color selected')}</button>
                  <button onClick={insertChecklist} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-muted text-foreground hover:bg-muted/80">
                    <CheckSquare className="w-3 h-3" />{t('مهمة', 'Task')}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('لون الورقة:', 'Paper color:')}</span>
                  {PAPER_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-primary scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="note-paper rounded-xl p-6 min-h-[350px]" style={{ backgroundColor: form.color }}>
                  <div
                    ref={contentRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="min-h-[310px] outline-none text-foreground leading-[32px] whitespace-pre-wrap"
                    style={{ fontFamily, fontSize: '18px', lineHeight: '32px' }}
                    dangerouslySetInnerHTML={!editingNote ? { __html: form.content } : undefined}
                  />
                </div>
                <button onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors">
                  {saveMutation.isPending ? t('جاري الحفظ...', 'Saving...') : t('حفظ', 'Save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Note View */}
      <AnimatePresence>
        {expandedNote && (() => {
          const note = allNotes.find((n: any) => n.id === expandedNote);
          if (!note) return null;
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4" onClick={() => setExpandedNote(null)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="note-paper rounded-2xl p-8 shadow-xl" style={{ backgroundColor: note.color }}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{note.title}</h2>
                      {note.courses?.title && <p className="text-sm text-muted-foreground mt-1">📚 {note.courses.title}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => togglePinMutation.mutate({ id: note.id, pinned: !note.is_pinned })} className="p-2 rounded-lg hover:bg-foreground/10">
                        {note.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                      </button>
                      <button onClick={() => { setExpandedNote(null); startEdit(note); }} className="p-2 rounded-lg hover:bg-foreground/10"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => { deleteMutation.mutate(note.id); setExpandedNote(null); }} className="p-2 rounded-lg hover:bg-foreground/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                      <button onClick={() => setExpandedNote(null)} className="p-2 rounded-lg hover:bg-foreground/10"><X className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <div
                    data-note-id={note.id}
                    className="text-foreground/80 leading-[32px] whitespace-pre-wrap"
                    style={{ fontFamily, fontSize: '18px' }}
                    dangerouslySetInnerHTML={{ __html: note.content || '' }}
                    onClick={(e) => handleNoteClick(note.id, e)}
                  />
                  <p className="text-xs text-foreground/40 mt-6">{new Date(note.created_at).toLocaleDateString()}</p>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map(i => <div key={i} className="rounded-xl p-6 animate-pulse h-48 bg-muted" />)}</div>
      ) : sortedNotes.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center bg-card/60 backdrop-blur-xl border border-border/50">
          <StickyNote className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{search ? t('لم يتم العثور على نتائج', 'No results') : t('لا توجد ملاحظات', 'No notes yet')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedNotes.map((note: any) => (
            <motion.div key={note.id} whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }} onClick={() => !multiSelectMode && setExpandedNote(note.id)} className={`note-paper rounded-2xl p-6 relative group shadow-md cursor-pointer min-h-[220px] ${multiSelectMode && selectedIds.has(note.id) ? 'ring-2 ring-primary' : ''}`} style={{ backgroundColor: note.color }}>
              {multiSelectMode && (
                <button onClick={(e) => { e.stopPropagation(); setSelectedIds(prev => { const n = new Set(prev); n.has(note.id) ? n.delete(note.id) : n.add(note.id); return n; }); }} className="absolute top-3 start-3">
                  {selectedIds.has(note.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-muted-foreground" />}
                </button>
              )}
              <div className="absolute top-3 end-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                {note.is_pinned && <Pin className="w-4 h-4 text-primary" />}
                <button onClick={() => startEdit(note)} className="p-1.5 rounded-lg hover:bg-foreground/10"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteMutation.mutate(note.id)} className="p-1.5 rounded-lg hover:bg-foreground/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
              </div>
              {note.is_pinned && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium mb-2 inline-block">📌 {t('مثبتة', 'Pinned')}</span>}
              {note.courses?.title && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium mb-2 inline-block ms-1">📚 {note.courses.title}</span>}
              <h3 className="font-bold text-foreground mb-3 text-lg">{note.title}</h3>
              <div className="text-sm text-foreground/70 line-clamp-6 leading-[32px]" style={{ fontFamily }} dangerouslySetInnerHTML={{ __html: note.content || '' }} />
              <p className="text-xs text-foreground/40 mt-4">{new Date(note.created_at).toLocaleDateString()}</p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
