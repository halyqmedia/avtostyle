"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { assignDeal } from "@/actions/deals";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DealStageSelect } from "@/components/crm/deal-stage-select";
import { ActionMenu } from "@/components/crm/action-menu";

const UNASSIGNED = "__unassigned__";

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  campaign: "Рассылка",
  sequence: "Тізбек",
  manual: "Қолмен",
  instagram: "Instagram",
  referral: "Ұсыныс",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ClientHeader({
  dealId,
  dealTitle,
  clientPhone,
  clientName,
  source,
  currentStageId,
  stages,
  assignedToId,
  salesUsers,
  canMove,
  canAssign,
}: {
  dealId: string;
  dealTitle: string;
  clientPhone: string | null;
  clientName: string;
  source: string | null;
  currentStageId: string;
  stages: { id: string; name: string; color: string }[];
  assignedToId: string | null;
  salesUsers: { id: string; name: string }[];
  canMove: boolean;
  canAssign: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const primary = clientPhone || dealTitle;
  const showDealTitle = dealTitle && dealTitle !== clientPhone && dealTitle !== primary;

  function handleAssign(value: string) {
    startTransition(async () => {
      try {
        await assignDeal(dealId, value === UNASSIGNED ? null : value);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Жауапты маманды өзгерту сәтсіз аяқталды");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/crm"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Клиенттер
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-11 shrink-0">
            <AvatarFallback className="text-sm">{initials(clientName || primary)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg leading-tight font-semibold">{primary}</p>
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              {clientName && clientName !== primary && <span>{clientName}</span>}
              {source && (
                <Badge variant="outline" className="text-[11px]">
                  {SOURCE_LABELS[source] ?? source}
                </Badge>
              )}
            </div>
            {showDealTitle && <p className="mt-0.5 text-xs text-muted-foreground">{dealTitle}</p>}
          </div>
        </div>
        <ActionMenu dealId={dealId} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DealStageSelect dealId={dealId} currentStageId={currentStageId} stages={stages} disabled={!canMove} />
        <Select
          value={assignedToId ?? UNASSIGNED}
          onValueChange={handleAssign}
          disabled={!canAssign || pending}
        >
          <SelectTrigger size="sm" className="w-auto min-w-40 border-0 bg-muted font-medium">
            <SelectValue placeholder="Жауапты маман" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Бөлінбеген</SelectItem>
            {salesUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
