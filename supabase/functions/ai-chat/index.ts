import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, sessions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let scheduleContext = "";
    if (sessions && Array.isArray(sessions) && sessions.length > 0) {
      const occupied = sessions.map((s: any) => 
        `${s.session_date} ${s.day_name || ''} ${s.start_time}-${s.end_time || '?'} (${s.title})`
      ).join("\n");
      scheduleContext = `\n\nالجدول الحالي للأستاذ (الحصص المشغولة):\n${occupied}\n\nبناءً على هذا الجدول، حدد الأوقات الفارغة واقترح أفضل المواعيد المتاحة. تجنب أي تعارض مع الحصص الموجودة. أعطِ عدة خيارات مع توضيح الأيام والأوقات المقترحة.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `أنت "مساعد الجدول الذكي" - مساعد متخصص في تحليل جداول المعلمين وإيجاد الأوقات الفارغة المناسبة لإضافة دورات أو حصص جديدة.

مهامك الأساسية:
1. تحليل الجدول الحالي للأستاذ وتحديد الأوقات المشغولة والفارغة
2. اقتراح أفضل المواعيد لإضافة دورة أو حصة جديدة بناءً على شروط الأستاذ
3. مراعاة عدد الحصص الأسبوعية المطلوبة ومدة كل حصة
4. تجنب أي تعارض في المواعيد
5. تقديم عدة خيارات مع شرح مزايا كل خيار

مهام إضافية:
- اقتراح طرق مبتكرة لشرح المواضيع الدراسية
- نصائح تعليمية وتربوية

أجب دائماً باللغة العربية ما لم يُطلب غير ذلك. كن واضحاً ومنظماً في عرض الخيارات.
${scheduleContext}`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، يرجى المحاولة لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في الاتصال بالذكاء الاصطناعي" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
