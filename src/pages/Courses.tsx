import { PageShell } from '@/components/PageShell';
import { BookOpen } from 'lucide-react';
export default function CoursesPage() {
  return <PageShell titleAr="الدورات" titleEn="Courses" descAr="إدارة الدورات والمواد التعليمية" descEn="Manage courses and learning materials" icon={<BookOpen className="w-6 h-6 text-primary" />} />;
}
