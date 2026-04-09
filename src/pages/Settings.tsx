import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Settings as SettingsIcon, Moon, Sun, Languages, Sparkles, Bell, Shield, Palette, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const [showWelcome, setShowWelcome] = React.useState(() => localStorage.getItem('ibdaa-welcome') !== 'disabled');
  const [confirmDialogs, setConfirmDialogs] = React.useState(() => localStorage.getItem('ibdaa-confirm') !== 'disabled');

  const toggleWelcome = () => {
    const v = !showWelcome;
    setShowWelcome(v);
    localStorage.setItem('ibdaa-welcome', v ? 'enabled' : 'disabled');
  };

  const toggleConfirm = () => {
    const v = !confirmDialogs;
    setConfirmDialogs(v);
    localStorage.setItem('ibdaa-confirm', v ? 'enabled' : 'disabled');
  };

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={`w-12 h-7 rounded-full transition-colors relative ${on ? 'bg-primary' : 'bg-muted'}`}>
      <div className={`w-5 h-5 bg-card rounded-full absolute top-1 transition-all ${on ? 'start-1' : 'end-1'}`} />
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{t('الإعدادات', 'Settings')}</h1>
      </div>

      <div className="space-y-4 max-w-lg">
        {/* Theme */}
        <div className="glass-card rounded-xl p-5 flex items-center justify-between bg-card/60 backdrop-blur-xl border border-border/50">
          <div className="flex items-center gap-3">
            {theme === 'light' ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5 text-primary" />}
            <div>
              <p className="font-medium text-foreground">{t('المظهر', 'Appearance')}</p>
              <p className="text-sm text-muted-foreground">{t('الوضع الفاتح / الداكن', 'Light / Dark mode')}</p>
            </div>
          </div>
          <Toggle on={theme === 'dark'} onClick={toggleTheme} />
        </div>

        {/* Language */}
        <div className="glass-card rounded-xl p-5 flex items-center justify-between bg-card/60 backdrop-blur-xl border border-border/50">
          <div className="flex items-center gap-3">
            <Languages className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">{t('اللغة', 'Language')}</p>
              <p className="text-sm text-muted-foreground">{t('العربية / English', 'Arabic / English')}</p>
            </div>
          </div>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="px-4 py-1.5 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        {/* Welcome Screen */}
        <div className="glass-card rounded-xl p-5 flex items-center justify-between bg-card/60 backdrop-blur-xl border border-border/50">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-accent-foreground" />
            <div>
              <p className="font-medium text-foreground">{t('شاشة الترحيب', 'Welcome Screen')}</p>
              <p className="text-sm text-muted-foreground">{t('عرض عند بدء التشغيل', 'Show on startup')}</p>
            </div>
          </div>
          <Toggle on={showWelcome} onClick={toggleWelcome} />
        </div>

        {/* Confirm Dialogs */}
        <div className="glass-card rounded-xl p-5 flex items-center justify-between bg-card/60 backdrop-blur-xl border border-border/50">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">{t('تأكيد الحذف', 'Confirm Deletions')}</p>
              <p className="text-sm text-muted-foreground">{t('طلب تأكيد قبل الحذف', 'Ask before deleting')}</p>
            </div>
          </div>
          <Toggle on={confirmDialogs} onClick={toggleConfirm} />
        </div>

        {/* Notifications */}
        <div className="glass-card rounded-xl p-5 flex items-center justify-between bg-card/60 backdrop-blur-xl border border-border/50">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-warning" />
            <div>
              <p className="font-medium text-foreground">{t('الإشعارات', 'Notifications')}</p>
              <p className="text-sm text-muted-foreground">{t('تسجيل جميع الأنشطة', 'Log all activities')}</p>
            </div>
          </div>
          <Toggle on={true} onClick={() => {}} />
        </div>

        {/* Logout */}
        <button onClick={signOut} className="glass-card rounded-xl p-5 flex items-center gap-3 w-full hover:bg-destructive/5 transition-colors bg-card/60 backdrop-blur-xl border border-border/50">
          <LogOut className="w-5 h-5 text-destructive" />
          <p className="font-medium text-destructive">{t('تسجيل الخروج', 'Sign Out')}</p>
        </button>
      </div>
    </motion.div>
  );
}
