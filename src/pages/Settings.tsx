import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Settings as SettingsIcon, Moon, Sun, Languages, Sparkles } from 'lucide-react';

export default function SettingsPage() {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [showWelcome, setShowWelcome] = React.useState(() => {
    return localStorage.getItem('ibdaa-welcome') !== 'disabled';
  });

  const toggleWelcome = () => {
    const newVal = !showWelcome;
    setShowWelcome(newVal);
    localStorage.setItem('ibdaa-welcome', newVal ? 'enabled' : 'disabled');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{t('الإعدادات', 'Settings')}</h1>
      </div>

      <div className="space-y-4 max-w-lg">
        {/* Theme */}
        <div className="glass-card rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'light' ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5 text-primary" />}
            <div>
              <p className="font-medium text-foreground">{t('المظهر', 'Appearance')}</p>
              <p className="text-sm text-muted-foreground">{t('الوضع الفاتح / الداكن', 'Light / Dark mode')}</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`w-12 h-7 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-primary' : 'bg-muted'}`}
          >
            <div className={`w-5 h-5 bg-card rounded-full absolute top-1 transition-all ${theme === 'dark' ? 'start-1' : 'end-1'}`} />
          </button>
        </div>

        {/* Language */}
        <div className="glass-card rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Languages className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">{t('اللغة', 'Language')}</p>
              <p className="text-sm text-muted-foreground">{t('العربية / English', 'Arabic / English')}</p>
            </div>
          </div>
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-4 py-1.5 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        {/* Welcome Screen */}
        <div className="glass-card rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-accent-foreground" />
            <div>
              <p className="font-medium text-foreground">{t('شاشة الترحيب', 'Welcome Screen')}</p>
              <p className="text-sm text-muted-foreground">{t('عرض عند بدء التشغيل', 'Show on startup')}</p>
            </div>
          </div>
          <button
            onClick={toggleWelcome}
            className={`w-12 h-7 rounded-full transition-colors relative ${showWelcome ? 'bg-primary' : 'bg-muted'}`}
          >
            <div className={`w-5 h-5 bg-card rounded-full absolute top-1 transition-all ${showWelcome ? 'start-1' : 'end-1'}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
