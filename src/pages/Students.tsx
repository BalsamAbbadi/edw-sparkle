import { PageShell } from '@/components/PageShell';
import { Users } from 'lucide-react';
export default function StudentsPage() {
  return <PageShell titleAr="الطلاب" titleEn="Students" descAr="إدارة بيانات الطلاب والتسجيل" descEn="Manage student data and enrollment" icon={<Users className="w-6 h-6 text-primary" />} />;
}
