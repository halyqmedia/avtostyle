import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { format } from "date-fns";
import { WhatsAppChat } from "@/components/crm/whatsapp-chat";
import { DealNotes } from "@/components/crm/deal-notes";
import { DealSummary } from "@/components/crm/deal-summary";
import { ClientHeader } from "@/components/crm/client-header";
import { AIInsights } from "@/components/crm/ai-insights";
import { getMediaUrl } from "@/lib/media-storage";
import { CreateProductionOrderDialog } from "@/components/crm/create-production-order-dialog";
import { DealAiToggle } from "@/components/crm/deal-ai-toggle";
import { WhatsAppWindowBadge } from "@/components/whatsapp-window-badge";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: { client: true, product: true, assignedTo: true, createdBy: true, pipelineStage: true },
  });
  if (!deal) notFound();

  const canViewAll = hasPermission(session.user.permissions, PERMISSIONS.DEALS_VIEW_ALL);
  if (!canViewAll && deal.assignedToId !== session.user.id) redirect("/no-access");

  const canMove = hasPermission(session.user.permissions, PERMISSIONS.DEALS_MOVE);
  const canAssign = hasPermission(session.user.permissions, PERMISSIONS.DEALS_ASSIGN);
  const canCreateProductionOrder = hasPermission(session.user.permissions, PERMISSIONS.PRODUCTION_ORDER_CREATE);
  const isAdmin = session.user.roleKey === "ADMIN";

  const [history, stages, notes, products, salesUsers, whatsappMessages, quickReplies, productionOrders] =
    await Promise.all([
      prisma.stageHistory.findMany({
        where: { entityType: "DEAL", entityId: deal.id },
        include: { fromStage: true, toStage: true, movedBy: true },
        orderBy: { movedAt: "desc" },
      }),
      prisma.pipelineStage.findMany({ where: { pipeline: "SALES" }, orderBy: { order: "asc" } }),
      prisma.dealNote.findMany({
        where: { dealId: deal.id },
        include: { author: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.user.findMany({ where: { role: { key: "SALES" }, isActive: true }, orderBy: { name: "asc" } }),
      prisma.whatsAppMessage.findMany({
        where: { dealId: deal.id },
        include: { sentBy: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.quickReply.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.productionOrder.findMany({
        where: { dealId: deal.id },
        include: { pipelineStage: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const chatMessages =
    whatsappMessages.length > 0
      ? await Promise.all(
          whatsappMessages.map(async (m) => ({
            id: m.id,
            direction: m.direction as "IN" | "OUT",
            body: m.body,
            createdAt: m.createdAt.toISOString(),
            sentByName: m.sentBy?.name ?? null,
            status: m.status,
            errorMessage: m.errorMessage,
            messageType: m.messageType,
            mediaSrc: m.mediaUrl ? await getMediaUrl(m.mediaUrl) : null,
            mediaMimeType: m.mediaMimeType,
            fileName: m.fileName,
            aiGenerated: m.aiGenerated,
          })),
        )
      : deal.source === "whatsapp" && deal.comment
        ? [
            {
              id: "initial",
              direction: "IN" as const,
              body: deal.comment,
              createdAt: deal.createdAt.toISOString(),
              sentByName: null,
              status: "DELIVERED",
              errorMessage: null,
              messageType: "text",
              mediaSrc: null,
              mediaMimeType: null,
              fileName: null,
              aiGenerated: false,
            },
          ]
        : [];

  const amount = Number(deal.amount);
  const prepayment = Number(deal.prepayment);
  const channel = whatsappMessages[whatsappMessages.length - 1]?.channel ?? "CLOUD_API";
  const channelLabel = channel === "PERSONAL" ? "Жеке WhatsApp арқылы" : "WABA (ортақ нөмір)";
  const lastInbound = [...whatsappMessages].reverse().find((m) => m.direction === "IN");
  const lastInboundAt =
    (lastInbound?.createdAt ?? (deal.source === "whatsapp" ? deal.createdAt : null))?.toISOString() ?? null;

  return (
    <div className="flex flex-col gap-4">
      <ClientHeader
        dealId={deal.id}
        dealTitle={deal.title}
        clientPhone={deal.client.phone}
        clientName={deal.client.fullName}
        source={deal.source}
        currentStageId={deal.pipelineStageId}
        stages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
        assignedToId={deal.assignedToId}
        salesUsers={salesUsers.map((u) => ({ id: u.id, name: u.name }))}
        canMove={canMove}
        canAssign={canAssign}
      />

      {productionOrders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {productionOrders.map((o) => (
            <Link
              key={o.id}
              href={`/production/orders/${o.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: o.pipelineStage.color }} />
              Өндіріс заявкасы: {o.pipelineStage.name}
            </Link>
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-background p-4">
        <DealSummary
          dealId={deal.id}
          clientName={deal.client.fullName}
          clientPhone={deal.client.phone}
          productId={deal.productId}
          productName={deal.product?.name ?? null}
          amount={amount}
          prepayment={prepayment}
          createdByName={deal.createdBy.name}
          source={deal.source}
          products={products.map((p) => ({ id: p.id, name: p.name }))}
          canEdit={canMove}
        />
      </div>

      <div className="grid h-[calc(100dvh-390px)] min-h-[460px] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-0 flex-col rounded-xl border">
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-2.5">
            <div className="flex items-center gap-2">
              <WhatsAppWindowBadge lastInboundAt={lastInboundAt} />
              <div>
                <p className="text-sm font-semibold">WhatsApp</p>
                <p className="text-xs text-muted-foreground">{channelLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canCreateProductionOrder && (
                <CreateProductionOrderDialog
                  dealId={deal.id}
                  defaultClientName={deal.client.fullName}
                  defaultClientPhone={deal.client.phone ?? undefined}
                  defaultPaymentAmount={prepayment}
                  defaultRemainingAmount={Math.max(amount - prepayment, 0)}
                  materials={products
                    .filter((p) => p.category === "material")
                    .map((p) => ({ id: p.id, name: p.name, unit: p.unit }))}
                />
              )}
              {canMove && <DealAiToggle dealId={deal.id} aiEnabled={deal.aiEnabled} />}
            </div>
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

      <div id="notes" className="scroll-mt-4 rounded-xl border bg-background p-4">
        <p className="mb-3 text-sm font-semibold">Ескертпелер</p>
        <DealNotes
          dealId={deal.id}
          currentUserId={session.user.id}
          canEditAll={isAdmin}
          notes={notes.map((n) => ({
            id: n.id,
            body: n.body,
            authorId: n.authorId,
            authorName: n.author.name,
            createdAt: n.createdAt.toISOString(),
            updatedAt: n.updatedAt.toISOString(),
          }))}
        />
      </div>

      <div id="history" className="scroll-mt-4 rounded-xl border bg-background p-4">
        <p className="mb-3 text-sm font-semibold">Кезеңдер тарихы (аудит логы)</p>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Әзірге өзгеріс болған жоқ.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {history.map((h) => (
              <li key={h.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p>
                    <span className="font-medium">{h.movedBy.name}</span>{" "}
                    {h.fromStage ? (
                      <>
                        «{h.fromStage.name}» кезеңінен «{h.toStage.name}» кезеңіне жылжытты
                      </>
                    ) : (
                      <>«{h.toStage.name}» кезеңінде құрды</>
                    )}
                  </p>
                  {h.note && <p className="text-xs italic text-muted-foreground">{h.note}</p>}
                  <p className="text-xs text-muted-foreground">{format(h.movedAt, "dd.MM.yyyy HH:mm")}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
