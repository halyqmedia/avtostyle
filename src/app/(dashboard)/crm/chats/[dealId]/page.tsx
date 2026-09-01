import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { assertDealAccess } from "@/lib/deal-access";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getDealChatMessages } from "@/lib/deal-chat";
import { WhatsAppChat } from "@/components/crm/whatsapp-chat";
import { AIInsights } from "@/components/crm/ai-insights";

export default async function ChatDetailPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const { session } = await assertDealAccess(dealId);

  const deal = await prisma.deal.findUnique({ where: { id: dealId }, include: { client: true } });
  if (!deal) notFound();

  const canMove = hasPermission(session.user.permissions, PERMISSIONS.DEALS_MOVE);

  const [chatMessages, quickReplies] = await Promise.all([
    getDealChatMessages(deal),
    prisma.quickReply.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-h-0 flex-col border-r">
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-2.5">
          <div>
            <p className="text-sm font-semibold">{deal.client.fullName}</p>
            <p className="text-xs text-muted-foreground">{deal.client.phone ?? "Телефон көрсетілмеген"}</p>
          </div>
          <Link
            href={`/crm/deals/${deal.id}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Мәміле бетіне
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <WhatsAppChat
          dealId={deal.id}
          clientName={deal.client.fullName}
          phone={deal.client.phone}
          messages={chatMessages}
          canSend={canMove && Boolean(deal.client.whatsappId || deal.client.phone)}
          quickReplies={quickReplies.map((q) => ({ id: q.id, title: q.title, body: q.body }))}
        />
      </div>

      <div className="min-h-0 overflow-y-auto">
        <AIInsights
          dealId={deal.id}
          clientPhone={deal.client.phone}
          temperature={deal.aiTemperature}
          summary={deal.aiSummary}
          signals={deal.aiSignals}
          nextAction={deal.aiNextAction}
          analyzedAt={deal.aiAnalyzedAt?.toISOString() ?? null}
        />
      </div>
    </div>
  );
}
