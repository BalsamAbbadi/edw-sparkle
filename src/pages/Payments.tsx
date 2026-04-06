import { PageShell } from '@/components/PageShell';
import { CreditCard } from 'lucide-react';
export default function PaymentsPage() {
  return <PageShell titleAr="المدفوعات" titleEn="Payments" descAr="تتبع المدفوعات والمستحقات" descEn="Track payments and dues" icon={<CreditCard className="w-6 h-6 text-primary" />} />;
}
