import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { CrmWorkspace } from "@/components/crm/crm-workspace";
import { Button } from "@/components/ui/button";

export default async function CrmPage() {
  const session = await requireSession();
  const canViewAll = hasPermission(session.user.permissions, PERMISSIONS.DEALS_VIEW_ALL);
  const canViewOwn = hasPermission(session.user.permissions, PERMISSIONS.DEALS_VIEW_OWN);
  const canMove = hasPermission(session.user.permissions, PERMISSIONS.DEALS_MOVE);
  const canCreate = hasPermission(session.user.permissions, PERMISSIONS.DEALS_CREATE);
  if (!canViewAll && !canViewOwn) redirect("/no-access");

  const [stages, deals, products] = await Promise.all([
    prisma.pipelineStage.findMany({ where: { pipeline: "SALES" }, orderBy: { order: "asc" } }),
    prisma.deal.findMany({
      where: canViewAll ? {} : { assignedToId: session.user.id },
      include: { client: true, product: true, assignedTo: true },
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
