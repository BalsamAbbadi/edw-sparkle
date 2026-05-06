import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, Loader2, Plus, Trash2, MessageSquare, Menu } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function AIChatPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sessions').select('*').order('session_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ai_conversations' as any).select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadConversation = async (convId: string) => {
    setActiveId(convId);
    const { data } = await supabase.from('ai_messages' as any).select('*').eq('conversation_id', convId).order('created_at');
    setMessages(((data || []) as any[]).map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })));
  };

  const newConversation = () => { setActiveId(null); setMessages([]); };

  const deleteConversation = async (convId: string) => {
    if (!window.confirm(t('حذف هذه المحادثة؟', 'Delete this conversation?'))) return;
    await supabase.from('ai_conversations' as any).delete().eq('id', convId);
    qc.invalidateQueries({ queryKey: ['ai-conversations'] });
    if (activeId === convId) newConversation();
    toast.success(t('تم الحذف', 'Deleted'));
  };

  const ensureConversation = async (firstUserMsg: string): Promise<string> => {
    if (activeId) return activeId;
    const title = firstUserMsg.slice(0, 50);
    const { data, error } = await supabase.from('ai_conversations' as any).insert({ user_id: user!.id, title } as any).select().single();
    if (error) throw error;
    setActiveId((data as any).id);
    qc.invalidateQueries({ queryKey: ['ai-conversations'] });
    return (data as any).id;
  };

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let convId: string;
    try {
      convId = await ensureConversation(userMsg.content);
      await supabase.from('ai_messages' as any).insert({ conversation_id: convId, user_id: user!.id, role: 'user', content: userMsg.content } as any);
    } catch (e: any) {
      toast.error(e.message || 'Error');
      setIsLoading(false);
      return;
    }

    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];
    const sessionsForAI = sessions.map((s: any) => ({
      title: s.title, session_date: s.session_date, day_name: DAY_NAMES[new Date(s.session_date).getDay()],
      start_time: s.start_time, end_time: s.end_time,
    }));

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: allMessages, sessions: sessionsForAI }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || 'Error');
        setIsLoading(false);
        return;
      }
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {}
        }
      }
      if (assistantSoFar) {
        await supabase.from('ai_messages' as any).insert({ conversation_id: convId, user_id: user!.id, role: 'assistant', content: assistantSoFar } as any);
        await supabase.from('ai_conversations' as any).update({ updated_at: new Date().toISOString() } as any).eq('id', convId);
        qc.invalidateQueries({ queryKey: ['ai-conversations'] });
      }
    } catch {
      toast.error(t('خطأ في الاتصال', 'Connection error'));
    }
    setIsLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex h-[calc(100vh-10rem)] gap-3">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 shrink-0 glass-card rounded-2xl p-3 flex flex-col bg-card/60 backdrop-blur-xl border border-border/50">
          <button onClick={newConversation} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium mb-3">
            <Plus className="w-4 h-4" />{t('محادثة جديدة', 'New Chat')}
          </button>
          <div className="flex-1 overflow-y-auto space-y-1">
            {conversations.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">{t('لا توجد محادثات', 'No conversations')}</p>}
            {(conversations as any[]).map((c: any) => (
              <div key={c.id} onClick={() => loadConversation(c.id)} className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${activeId === c.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                <MessageSquare className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{c.title}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(c.updated_at), 'dd/MM HH:mm')}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setSidebarOpen(v => !v)} className="p-2 rounded-lg hover:bg-muted"><Menu className="w-4 h-4" /></button>
          <Bot className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t('مساعد الجدول الذكي', 'Smart Schedule Assistant')}</h1>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mb-4 glass-card rounded-2xl p-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="w-16 h-16 mx-auto mb-4 text-primary/30" />
              <p className="text-lg font-medium">{t('مرحباً! أنا مساعد الجدول الذكي 🤖', "Hello! I'm your Smart Schedule Assistant 🤖")}</p>
              <p className="text-sm mt-2">{t('اسألني عن جدولك أو الأوقات الفارغة', 'Ask me about your schedule or free slots')}</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none text-foreground">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start"><div className="bg-muted rounded-2xl px-4 py-3"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div></div>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={t('اكتب رسالتك...', 'Type your message...')} className="flex-1 px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none" />
          <button onClick={send} disabled={isLoading || !input.trim()} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
