import React from 'react';
import {
  BookOpen, Users, CreditCard, Calendar, Bell, StickyNote,
  Settings, User, Home, FolderOpen, Bot, Sparkles, DollarSign
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { useLanguage } from '@/contexts/LanguageContext';

const navItems = [
  { icon: Home, titleAr: 'الرئيسية', titleEn: 'Dashboard', url: '/' },
  { icon: Calendar, titleAr: 'الجدول', titleEn: 'Schedule', url: '/schedule' },
  { icon: BookOpen, titleAr: 'الدورات', titleEn: 'Courses', url: '/courses' },
  { icon: Users, titleAr: 'الطلاب', titleEn: 'Students', url: '/students' },
  { icon: CreditCard, titleAr: 'المدفوعات', titleEn: 'Payments', url: '/payments' },
  { icon: DollarSign, titleAr: 'الدخل', titleEn: 'Income', url: '/income' },
  { icon: StickyNote, titleAr: 'الملاحظات', titleEn: 'Notes', url: '/notes' },
  { icon: FolderOpen, titleAr: 'الملفات', titleEn: 'Files', url: '/files' },
  { icon: Bell, titleAr: 'الإشعارات', titleEn: 'Notifications', url: '/notifications' },
  { icon: Bot, titleAr: 'مساعدك الاصطناعي', titleEn: 'AI Assistant', url: '/ai-chat' },
];

const bottomItems = [
  { icon: User, titleAr: 'الملف الشخصي', titleEn: 'Profile', url: '/profile' },
  { icon: Settings, titleAr: 'الإعدادات', titleEn: 'Settings', url: '/settings' },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { t } = useLanguage();

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-lg">
            <img src="/logo.png" alt="إبداع" className="w-7 h-7 object-contain" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold text-foreground font-heading">
              {t('إبداع', 'Ibdaa')}
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!collapsed && <span>{t(item.titleAr, item.titleEn)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!collapsed && <span>{t(item.titleAr, item.titleEn)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
