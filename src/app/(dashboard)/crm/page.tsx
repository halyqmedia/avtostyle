import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { CrmWorkspace } from "@/components/crm/crm-workspace";
import { Button } from "@/components/ui/button";

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ funnel?: string }>;
}) {
  const session = await requireSession();
  const canViewAll = hasPermission(session.user.permissions, PERMISSIONS.DEALS_VIEW_ALL);
  const canViewOwn = hasPermission(session.user.permissions, PERMISSIONS.DEALS_VIEW_OWN);
  const canMove = hasPermission(session.user.permissions, PERMISSIONS.DEALS_MOVE);
  const canCreate = hasPermission(session.user.permissions, PERMISSIONS.DEALS_CREATE);
  if (!canViewAll && !canViewOwn) redirect("/no-access");

  const [funnels, { funnel: requestedFunnelKey }] = await Promise.all([
    prisma.funnel.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    searchParams,
  ]);

  // Default to the funnel whose WhatsApp number has this person as its manager (their main work
  // queue), falling back to "SALES" or simply the first active funnel for everyone else.
  const myNumber = !requestedFunnelKey
    ? await prisma.whatsAppNumber.findFirst({ where: { managerId: session.user.id }, include: { funnel: true } })
    : null;
  const selectedFunnel =
    funnels.find((f) => f.key === requestedFunnelKey) ??
    (myNumber ? funnels.find((f) => f.id === myNumber.funnelId) : undefined) ??
    funnels.find((f) => f.key === "SALES") ??
    funnels[0];
  const selectedFunnelKey = selectedFunnel?.key ?? "SALES";

  const [stages, deals, products] = await Promise.all([
    prisma.pipelineStage.findMany({ where: { pipeline: selectedFunnelKey }, orderBy: { order: "asc" } }),
    prisma.deal.findMany({
      where: {
        pipelineStage: { pipeline: selectedFunnelKey },
        ...(canViewAll ? {} : { assignedToId: session.user.id }),
      },
      include: {
        client: true,
        product: true,
        assignedTo: true,
        whatsappMessages: { where: { direction: "IN" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const kanbanDeals = deals.map((d) => ({
    id: d.id,
    stageId: d.pipelineStageId,
    title: d.title,
    clientName: d.client.fullName,
    clientPhone: d.client.phone,
    productId: d.productId,
    productName: d.product?.name ?? null,
    amount: Number(d.amount),
    prepayment: Number(d.prepayment),
    assignedToId: d.assignedToId,
    assigneeName: d.assignedTo?.name ?? null,
    source: d.source,
    aiTemperature: d.aiTemperature,
    // Falls back to the deal's creation time for legacy whatsapp-sourced leads whose very first
    // inbound message predates per-message logging — otherwise the badge would wrongly read "closed".
    lastInboundAt: (d.whatsappMessages[0]?.createdAt ?? (d.source === "whatsapp" ? d.createdAt : null))?.toISOString() ?? null,
  }));

  const assignees = Array.from(
    new Map(
      deals
        .filter((d) => d.assignedTo)
        .map((d) => [d.assignedTo!.id, { id: d.assignedTo!.id, name: d.assignedTo!.name }]),
    ).values(),
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Сату pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {canViewAll ? "Барлық сделкалар" : "Сіздің сделкаларыңыз"}
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/crm/deals/new">+ Жаңа сделка</Link>
          </Button>
        )}
      </div>
      {funnels.length > 1 && (
        <div className="flex gap-1 border-b">
          {funnels.map((f) => (
            <Link
              key={f.id}
              href={`/crm?funnel=${f.key}`}
              className={
                "rounded-t-md px-3 py-2 text-sm font-medium hover:bg-muted " +
                (f.key === selectedFunnelKey ? "border-b-2 border-primary text-foreground" : "text-muted-foreground")
              }
            >
              {f.name}
            </Link>
          ))}
        </div>
      )}
      <CrmWorkspace
        stages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
        initialDeals={kanbanDeals}
        canMove={canMove}
        assignees={assignees}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        showAssigneeFilter={canViewAll}
      />
    </div>
  );
}
