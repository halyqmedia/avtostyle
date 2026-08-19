import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { DealStageSelect } from "@/components/crm/deal-stage-select";
import { WhatsAppChat } from "@/components/crm/whatsapp-chat";
import { DealNotes } from "@/components/crm/deal-notes";
import { DealInfoCard } from "@/components/crm/deal-info-card";
import { getMediaUrl } from "@/lib/media-storage";
import { CreateProductionOrderDialog } from "@/components/crm/create-production-order-dialog";
import { DealAiToggle } from "@/components/crm/deal-ai-toggle";
import { DealAiPanel } from "@/components/crm/deal-ai-panel";

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

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,48rem)_320px] lg:items-start">
      <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/crm"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Артқа
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{deal.title}</h1>
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
            <DealStageSelect
              dealId={deal.id}
              currentStageId={deal.pipelineStageId}
              stages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
              disabled={!canMove}
            />
          </div>
        </div>
        {productionOrders.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Сделка ақпараты</CardTitle>
        </CardHeader>
        <CardContent>
          <DealInfoCard
            dealId={deal.id}
            clientName={deal.client.fullName}
            clientPhone={deal.client.phone}
            productId={deal.productId}
            productName={deal.product?.name ?? null}
            assignedToId={deal.assignedToId}
            assigneeName={deal.assignedTo?.name ?? null}
            amount={amount}
            prepayment={prepayment}
            createdByName={deal.createdBy.name}
            source={deal.source}
            products={products.map((p) => ({ id: p.id, name: p.name }))}
            salesUsers={salesUsers.map((u) => ({ id: u.id, name: u.name }))}
            canEdit={canMove}
            canAssign={canAssign}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">WhatsApp</CardTitle>
          {canMove && <DealAiToggle dealId={deal.id} aiEnabled={deal.aiEnabled} />}
        </CardHeader>
        <CardContent>
          <WhatsAppChat
            dealId={deal.id}
            clientName={deal.client.fullName}
            phone={deal.client.phone}
            messages={chatMessages}
            canSend={canMove && Boolean(deal.client.whatsappId || deal.client.phone)}
            quickReplies={quickReplies.map((q) => ({ id: q.id, title: q.title, body: q.body }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ескертпелер</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Кезеңдер тарихы (аудит логы)</CardTitle>
        </CardHeader>
        <CardContent>
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
                    <p className="text-xs text-muted-foreground">
                      {format(h.movedAt, "dd.MM.yyyy HH:mm")}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
      </div>

      <div className="lg:sticky lg:top-4">
        <DealAiPanel
          dealId={deal.id}
          temperature={deal.aiTemperature}
          summary={deal.aiSummary}
          nextAction={deal.aiNextAction}
          analyzedAt={deal.aiAnalyzedAt?.toISOString() ?? null}
        />
      </div>
    </div>
  );
}
