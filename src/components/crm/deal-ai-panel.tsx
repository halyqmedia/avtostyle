"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { runAiAnalysis } from "@/actions/deals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TEMPERATURE_LABEL: Record<string, string> = {
  HOT: "Қызып тұр",
  WARM: "Қызығушылық бар",
  COLD: "Салқын",
};

export function DealAiPanel({
  dealId,
  temperature,
  summary,
  nextAction,
  analyzedAt,
}: {
  dealId: string;
  temperature: string | null;
  summary: string | null;
  nextAction: string | null;
  analyzedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      try {
        await runAiAnalysis(dealId);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Талдау сәтсіз аяқталды");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Sparkles className="size-4 text-primary" />
          ИИ көмекші
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={refresh} disabled={pending}>
          {pending ? "Талдануда..." : "Жаңарту"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!analyzedAt ? (
          <p className="text-sm text-muted-foreground">
            Әзірге талдау жоқ — клиентпен сөйлесу басталған соң немесе «Жаңарту» батырмасын басқанда осы жерде
            қысқаша ой және кеңес шығады.
          </p>
        ) : (
          <>
            {temperature && (
              <Badge
                className={
                  temperature === "HOT"
                    ? "bg-destructive/10 text-destructive"
                    : temperature === "WARM"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                }
              >
                {TEMPERATURE_LABEL[temperature] ?? temperature}
              </Badge>
            )}
            {summary && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Жағдай</p>
                <p className="text-sm">{summary}</p>
              </div>
            )}
            {nextAction && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Кеңес</p>
                <p className="text-sm">{nextAction}</p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Жаңартылды: {format(new Date(analyzedAt), "dd.MM.yyyy HH:mm")}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
