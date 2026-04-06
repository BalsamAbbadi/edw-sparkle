import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Construction } from 'lucide-react';

interface PageShellProps {
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon: React.ReactNode;
}

export function PageShell({ titleAr, titleEn, descAr, descEn, icon }: PageShellProps) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(titleAr, titleEn)}</h1>
          <p className="text-muted-foreground text-sm">{t(descAr, descEn)}</p>
        </div>
      </div>

      <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center">
        <Construction className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {t('قيد التطوير', 'Under Development')}
        </h2>
        <p className="text-muted-foreground text-sm max-w-md">
          {t(
            'هذه الصفحة قيد الإنشاء. سيتم إضافة جميع الميزات قريباً!',
            'This page is under construction. All features will be added soon!'
          )}
        </p>
      </div>
    </motion.div>
  );
}
