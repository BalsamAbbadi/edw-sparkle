import { PageShell } from '@/components/PageShell';
import { StickyNote } from 'lucide-react';
export default function NotesPage() {
  return <PageShell titleAr="الملاحظات" titleEn="Notes" descAr="دفتر الملاحظات الشخصي" descEn="Personal notebook" icon={<StickyNote className="w-6 h-6 text-accent-foreground" />} />;
}
