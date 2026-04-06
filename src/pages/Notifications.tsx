import { PageShell } from '@/components/PageShell';
import { Bell } from 'lucide-react';
export default function NotificationsPage() {
  return <PageShell titleAr="الإشعارات" titleEn="Notifications" descAr="مركز الإشعارات والتذكيرات" descEn="Notification and reminder center" icon={<Bell className="w-6 h-6 text-warning" />} />;
}
