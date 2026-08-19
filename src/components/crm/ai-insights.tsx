"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { MessageSquareText, Phone, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { runAiAnalysis } from "@/actions/deals";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIInsightCard } from "@/components/crm/ai-insight-card";
import { AIChatDrawer } from "@/components/crm/ai-chat-drawer";

const TEMPERATURE_CONFIG: Record<string, { label: string; dot: string; badgeClass: string }> = {
  HOT: { label: "Қызып тұр", dot: "🔴", badgeClass: "bg-destructive/10 text-destructive" },
  WARM: { label: "Жылы", dot: "🟡", badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  COLD: { label: "Суық", dot: "⚪", badgeClass: "bg-muted text-muted-foreground" },
};

export function AIInsights({
  dealId,
  clientPhone,
  temperature,
  summary,
  signals,
  nextAction,
  analyzedAt,
}: {
  dealId: string;
  clientPhone: string | null;
  temperature: string | null;
  summary: string | null;
  signals: string[];
  nextAction: string | null;
  analyzedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [chatOpen, setChatOpen] = useState(false);

  function refresh() {
    startTransition(async () => {
      try {
        await runAiAnalysis(dealId);
        toast.success("Талдау жаңартылды");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Талдау сәтсіз аяқталды");
      }
    });
  }

  const tempConfig = temperature ? TEMPERATURE_CONFIG[temperature] : null;
  const telLink = clientPhone ? `tel:${clientPhone.replace(/[^\d+]/g, "")}` : null;
  const waLink = buildWhatsAppLink(clientPhone);

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-background p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" />
          AI көмекші
        </p>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={refresh} disabled={pending}>
          <RefreshCw className={cn("size-3.5", pending && "animate-spin")} />
          {pending ? "Талдануда..." : "Жаңарту"}
        </Button>
      </div>

      {!analyzedAt ? (
        <p className="text-sm text-muted-foreground">
          Әзірге талдау жоқ — клиентпен сөйлесу басталған соң немесе «Жаңарту» батырмасын басқанда осы жерде
          қысқаша ой мен кеңес шығады.
        </p>
      ) : (
        <>
          {tempConfig && (
            <AIInsightCard title="Клиенттің жағдайы">
              <Badge className={cn("text-sm", tempConfig.badgeClass)}>
                {tempConfig.dot} {tempConfig.label}
              </Badge>
            </AIInsightCard>
          )}

          {summary && (
            <AIInsightCard icon={MessageSquareText} title="Қысқаша тезис">
              <p className="text-muted-foreground">{summary}</p>
            </AIInsightCard>
          )}

          {signals.length > 0 && (
            <AIInsightCard title="Негізгі сигналдар">
              <ul className="flex flex-col gap-1">
                {signals.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                    <span className="mt-0.5 shrink-0 text-primary">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </AIInsightCard>
          )}

          {nextAction && (
            <AIInsightCard title="AI ұсынысы">
              <p className="text-muted-foreground">{nextAction}</p>
            </AIInsightCard>
          )}

          <p className="text-[11px] text-muted-foreground">
            Жаңартылды: {format(new Date(analyzedAt), "dd.MM.yyyy HH:mm")}
          </p>
        </>
      )}

      <div className="flex flex-col gap-1.5 border-t pt-3">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Келесі әрекет</p>
        <div className="flex flex-wrap gap-1.5">
          {telLink && (
            <Button asChild size="sm" variant="outline">
              <a href={telLink}>
                <Phone className="size-3.5" />
                Қоңырау шалу
              </a>
            </Button>
          )}
          {waLink && (
            <Button asChild size="sm" variant="outline">
              <a href={waLink} target="_blank" rel="noopener noreferrer">
                WhatsApp-та ашу
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setChatOpen(true)}>
            <Sparkles className="size-3.5" />
            AI-мен сөйлесу
          </Button>
        </div>
      </div>

      <AIChatDrawer dealId={dealId} open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}
