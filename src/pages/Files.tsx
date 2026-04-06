import React from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Download, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function FilesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['all-files'],
    queryFn: async () => {
      const { data, error } = await supabase.from('files').select('*, courses(title)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('files').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-files'] });
      toast.success(t('تم حذف الملف', 'File deleted'));
    },
  });

  const getFileIcon = (type: string) => {
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('image')) return '🖼️';
    if (type?.includes('video')) return '🎥';
    return '📎';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <FolderOpen className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{t('الملفات', 'Files')}</h1>
        <span className="text-sm text-muted-foreground">({files.length})</span>
      </div>
      <p className="text-sm text-muted-foreground">{t('يمكنك رفع الملفات من صفحة الدورة', 'You can upload files from the course page')}</p>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass-card rounded-xl p-6 animate-pulse h-20" />)}</div>
      ) : files.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('لا توجد ملفات', 'No files yet')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file: any) => (
            <div key={file.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getFileIcon(file.file_type)}</span>
                <div>
                  <p className="font-medium text-foreground">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">{file.courses?.title} • {(file.file_size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-muted"><Download className="w-4 h-4 text-primary" /></a>
                <button onClick={() => deleteMutation.mutate(file.id)} className="p-2 rounded-lg hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
