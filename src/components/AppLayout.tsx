import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Moon, Sun, Languages, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-16 flex items-center justify-between border-b border-border px-4 md:px-6 bg-card/80 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              {profile && (
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/profile')}>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-foreground leading-tight">{profile.display_name || user?.email}</p>
                    {profile.status_caption && <p className="text-xs text-muted-foreground leading-tight">{profile.status_caption}</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-full relative" onClick={() => navigate('/notifications')}>
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">{unreadCount}</span>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="rounded-full">
                <Languages className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
          {/* Footer */}
          <footer className="border-t border-border px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">{t('© إبداع - منصة إدارة الدورات التعليمية', '© Ibdaa - Course Management Platform')}</p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
