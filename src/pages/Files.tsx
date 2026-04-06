import { PageShell } from '@/components/PageShell';
import { FolderOpen } from 'lucide-react';
export default function FilesPage() {
  return <PageShell titleAr="الملفات" titleEn="Files" descAr="إدارة الملفات والمرفقات" descEn="Manage files and attachments" icon={<FolderOpen className="w-6 h-6 text-primary" />} />;
}
