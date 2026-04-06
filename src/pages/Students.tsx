import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function StudentsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['all-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('enrollments').select('*, courses(title)');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('*, courses(title)');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filtered = students.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()));

  const getStudentCourses = (studentId: string) => enrollments.filter((e: any) => e.student_id === studentId);
  const getStudentPayments = (studentId: string) => payments.filter((p: any) => p.student_id === studentId);

  const statusColor = (status: string) => {
    if (status === 'full') return 'bg-success/20 text-success';
    if (status === 'partial') return 'bg-warning/20 text-warning';
    return 'bg-destructive/20 text-destructive';
  };

  const statusLabel = (status: string) => {
    if (status === 'full') return t('مدفوع', 'Paid');
    if (status === 'partial') return t('جزئي', 'Partial');
    return t('غير مدفوع', 'Unpaid');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t('الطلاب', 'Students')}</h1>
          <span className="text-sm text-muted-foreground">({students.length})</span>
        </div>
        <div className="relative">
          <Search className="absolute start-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('بحث بالاسم...', 'Search by name...')}
            className="ps-10 pe-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm w-64 focus:ring-2 focus:ring-ring outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass-card rounded-xl p-6 animate-pulse h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{search ? t('لم يتم العثور على نتائج', 'No results found') : t('لا يوجد طلاب بعد. أضف طلاب من صفحة الدورات', 'No students yet. Add students from courses page')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((student: any) => {
            const courses = getStudentCourses(student.id);
            const pmts = getStudentPayments(student.id);
            return (
              <motion.div key={student.id} whileHover={{ y: -1 }} className="glass-card rounded-xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{student.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {student.grade && <span>{student.grade}</span>}
                      {student.gender && <span>{student.gender === 'male' ? t('ذكر', 'Male') : t('أنثى', 'Female')}</span>}
                    </div>
                  </div>
                </div>
                {student.notes && <p className="text-sm text-muted-foreground mb-3">{student.notes}</p>}
                {courses.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{t('الدورات المسجلة:', 'Enrolled courses:')}</p>
                    {courses.map((enr: any) => {
                      const pmt = pmts.find((p: any) => p.course_id === enr.course_id);
                      return (
                        <div key={enr.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                          <span className="text-sm text-foreground">{enr.courses?.title}</span>
                          {pmt && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(pmt.status)}`}>
                              {statusLabel(pmt.status)} ({pmt.amount_paid}/{pmt.total_amount})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
