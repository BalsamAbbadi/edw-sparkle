import { PageShell } from '@/components/PageShell';
import { User } from 'lucide-react';
export default function ProfilePage() {
  return <PageShell titleAr="الملف الشخصي" titleEn="Profile" descAr="إدارة معلوماتك الشخصية" descEn="Manage your personal information" icon={<User className="w-6 h-6 text-primary" />} />;
}
