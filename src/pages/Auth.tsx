import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPage() {
  const { t } = useLanguage();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success(t('تم تسجيل الدخول بنجاح', 'Signed in successfully'));
      } else {
        if (!displayName.trim()) {
          toast.error(t('أدخل اسمك', 'Enter your name'));
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, displayName);
        if (error) throw error;
        toast.success(t('تم إنشاء الحساب! تحقق من بريدك الإلكتروني', 'Account created! Check your email'));
      }
    } catch (error: any) {
      toast.error(error.message || t('حدث خطأ', 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground font-heading">{t('إبداع', 'Ibdaa')}</h1>
          <p className="text-muted-foreground mt-2">{t('منصة إدارة الدورات التعليمية', 'Course Management Platform')}</p>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex bg-muted rounded-lg p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${isLogin ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              {t('تسجيل الدخول', 'Sign In')}
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${!isLogin ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              {t('حساب جديد', 'Sign Up')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute start-3 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder={t('الاسم الكامل', 'Full Name')}
                  className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none"
                  required={!isLogin}
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute start-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('البريد الإلكتروني', 'Email')}
                className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute start-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('كلمة المرور', 'Password')}
                className="w-full ps-10 pe-10 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-3 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading
                ? t('جاري التحميل...', 'Loading...')
                : isLogin
                ? t('دخول', 'Sign In')
                : t('إنشاء حساب', 'Create Account')}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
