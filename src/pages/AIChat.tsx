import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, Loader2, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function AIChatPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Fetch real sessions to pass to AI
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sessions').select('*').order('session_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];

    // Prepare sessions data for AI with day names
    const sessionsForAI = sessions.map((s: any) => ({
      title: s.title,
      session_date: s.session_date,
      day_name: DAY_NAMES[new Date(s.session_date).getDay()],
      start_time: s.start_time,
      end_time: s.end_time,
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
    } catch (e) {
      toast.error(t('خطأ في الاتصال', 'Connection error'));
    }
    setIsLoading(false);
  };

  const quickPrompts = [
    t('أريد إضافة دورة جديدة، ابحث عن أوقات فارغة', 'Find free time slots for a new course'),
    t('ما هي الأوقات المتاحة هذا الأسبوع؟', 'What times are available this week?'),
    t('أريد حصتين أسبوعياً كل واحدة ساعة', 'I need 2 sessions per week, 1 hour each'),
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex items-center gap-3 mb-4">
        <Bot className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{t('مساعد الجدول الذكي', 'Smart Schedule Assistant')}</h1>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{sessions.length} {t('حصة في الجدول', 'sessions loaded')}</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 glass-card rounded-2xl p-4">
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="w-16 h-16 mx-auto mb-4 text-primary/30" />
            <p className="text-lg font-medium">{t('مرحباً! أنا مساعد الجدول الذكي 🤖', "Hello! I'm your Smart Schedule Assistant 🤖")}</p>
            <p className="text-sm mt-2 mb-6">{t('أساعدك في إيجاد أوقات فارغة مناسبة لإضافة دورات أو حصص جديدة', 'I help you find available time slots for new courses or sessions')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {quickPrompts.map((p, i) => (
                <button key={i} onClick={() => setInput(p)} className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors">
                  {p}
                </button>
              ))}
            </div>
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
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={t('اسأل عن الأوقات الفارغة في الجدول...', 'Ask about free time slots...')} className="flex-1 px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none" />
        <button onClick={send} disabled={isLoading || !input.trim()} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
