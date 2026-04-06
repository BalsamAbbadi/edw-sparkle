import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Edit2, Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function PaymentsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState(0);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('*, students(name), courses(title)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { error } = await supabase.from('payments').update({ amount_paid: amount }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success(t('تم تحديث الدفعة', 'Payment updated'));
      setEditingId(null);
    },
  });

  const statusColor = (status: string) => {
    if (status === 'full') return 'border-s-4 border-s-success';
    if (status === 'partial') return 'border-s-4 border-s-warning';
    return 'border-s-4 border-s-destructive';
  };

  const statusBadge = (status: string) => {
    if (status === 'full') return 'bg-success/20 text-success';
    if (status === 'partial') return 'bg-warning/20 text-warning';
    return 'bg-destructive/20 text-destructive';
  };

  const statusLabel = (status: string) => {
    if (status === 'full') return t('مدفوع بالكامل', 'Fully Paid');
    if (status === 'partial') return t('مدفوع جزئياً', 'Partially Paid');
    return t('غير مدفوع', 'Unpaid');
  };

  const fullCount = payments.filter((p: any) => p.status === 'full').length;
  const partialCount = payments.filter((p: any) => p.status === 'partial').length;
  const unpaidCount = payments.filter((p: any) => p.status === 'unpaid').length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{t('المدفوعات', 'Payments')}</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success">{fullCount}</p>
          <p className="text-xs text-muted-foreground">{t('مدفوع', 'Paid')}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-warning">{partialCount}</p>
          <p className="text-xs text-muted-foreground">{t('جزئي', 'Partial')}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{unpaidCount}</p>
          <p className="text-xs text-muted-foreground">{t('غير مدفوع', 'Unpaid')}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass-card rounded-xl p-6 animate-pulse h-20" />)}</div>
      ) : payments.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('لا توجد مدفوعات بعد', 'No payments yet')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((payment: any) => (
            <div key={payment.id} className={`glass-card rounded-xl p-4 ${statusColor(payment.status)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{payment.students?.name}</p>
                  <p className="text-sm text-muted-foreground">{payment.courses?.title}</p>
                </div>
                <div className="flex items-center gap-3">
                  {editingId === payment.id ? (
                    <div className="flex items-center gap-2">
                      <input type="number" value={editAmount} onChange={e => setEditAmount(Number(e.target.value))} min={0} max={payment.total_amount} className="w-24 px-2 py-1 rounded-lg border border-input bg-background text-foreground text-sm" />
                      <button onClick={() => updateMutation.mutate({ id: payment.id, amount: editAmount })} className="p-1.5 rounded-lg hover:bg-success/10"><Check className="w-4 h-4 text-success" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="text-end">
                        <p className="font-bold text-foreground">{payment.amount_paid} / {payment.total_amount}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(payment.status)}`}>{statusLabel(payment.status)}</span>
                      </div>
                      <button onClick={() => { setEditingId(payment.id); setEditAmount(payment.amount_paid); }} className="p-2 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
