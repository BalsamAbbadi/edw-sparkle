import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Edit2, Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNotification } from '@/hooks/useNotification';

export default function PaymentsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { notify } = useNotification();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

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
      notify('payment', t('تم تحديث حالة الدفع', 'Payment updated'));
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

  const filteredPayments = activeFilter ? payments.filter((p: any) => p.status === activeFilter) : payments;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{t('المدفوعات', 'Payments')}</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => setActiveFilter(activeFilter === 'full' ? null : 'full')} className={`glass-card rounded-xl p-4 text-center transition-all bg-card/60 backdrop-blur-xl border ${activeFilter === 'full' ? 'border-success ring-2 ring-success/30' : 'border-border/50'}`}>
          <p className="text-2xl font-bold text-success">{fullCount}</p>
          <p className="text-xs text-muted-foreground">{t('مدفوع', 'Paid')}</p>
        </button>
        <button onClick={() => setActiveFilter(activeFilter === 'partial' ? null : 'partial')} className={`glass-card rounded-xl p-4 text-center transition-all bg-card/60 backdrop-blur-xl border ${activeFilter === 'partial' ? 'border-warning ring-2 ring-warning/30' : 'border-border/50'}`}>
          <p className="text-2xl font-bold text-warning">{partialCount}</p>
          <p className="text-xs text-muted-foreground">{t('جزئي', 'Partial')}</p>
        </button>
        <button onClick={() => setActiveFilter(activeFilter === 'unpaid' ? null : 'unpaid')} className={`glass-card rounded-xl p-4 text-center transition-all bg-card/60 backdrop-blur-xl border ${activeFilter === 'unpaid' ? 'border-destructive ring-2 ring-destructive/30' : 'border-border/50'}`}>
          <p className="text-2xl font-bold text-destructive">{unpaidCount}</p>
          <p className="text-xs text-muted-foreground">{t('غير مدفوع', 'Unpaid')}</p>
        </button>
      </div>

      {activeFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('عرض:', 'Showing:')}</span>
          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${statusBadge(activeFilter)}`}>{statusLabel(activeFilter)}</span>
          <button onClick={() => setActiveFilter(null)} className="text-xs text-primary hover:underline">{t('عرض الكل', 'Show all')}</button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass-card rounded-xl p-6 animate-pulse h-20" />)}</div>
      ) : filteredPayments.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center bg-card/60 backdrop-blur-xl border border-border/50">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('لا توجد مدفوعات', 'No payments')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPayments.map((payment: any) => (
            <div key={payment.id} className={`glass-card rounded-xl p-4 bg-card/60 backdrop-blur-xl border border-border/50 ${statusColor(payment.status)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{payment.students?.name}</p>
                  <p className="text-sm text-muted-foreground">{payment.courses?.title}</p>
                </div>
                <div className="flex items-center gap-3">
                  {editingId === payment.id ? (
                    <div className="flex items-center gap-2">
                      <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} min={0} max={payment.total_amount} className="w-24 px-2 py-1 rounded-lg border border-input bg-background text-foreground text-sm" />
                      <span className="text-sm text-muted-foreground">₪</span>
                      <button onClick={() => updateMutation.mutate({ id: payment.id, amount: Number(editAmount) })} className="p-1.5 rounded-lg hover:bg-success/10"><Check className="w-4 h-4 text-success" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="text-end">
                        <p className="font-bold text-foreground">{payment.amount_paid} / {payment.total_amount} ₪</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(payment.status)}`}>{statusLabel(payment.status)}</span>
                      </div>
                      <button onClick={() => { setEditingId(payment.id); setEditAmount(String(payment.amount_paid || '')); }} className="p-2 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
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
