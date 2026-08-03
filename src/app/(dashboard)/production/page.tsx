import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { ProductionWorkspace } from "@/components/production/production-workspace";

export default async function ProductionPage() {
  const session = await requirePermission(PERMISSIONS.PRODUCTION_ACCESS);
  const canMove = hasPermission(session.user.permissions, PERMISSIONS.PRODUCTION_ACCESS);

  const [stages, orders] = await Promise.all([
    prisma.pipelineStage.findMany({ where: { pipeline: "PRODUCTION" }, orderBy: { order: "asc" } }),
    prisma.productionOrder.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const kanbanOrders = orders.map((o) => ({
    id: o.id,
    stageId: o.pipelineStageId,
    clientName: o.clientName,
    clientPhone: o.clientPhone,
    carBrand: o.carBrand,
    itemsSummary:
      o.items.length === 1 ? o.items[0].productType : `${o.items.length} өнім түрі`,
  }));

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">Өндіріс конвейері</h1>
        <p className="text-sm text-muted-foreground">
          Заявкаларды карточка ретінде тартып, келесі кезеңге жылжытыңыз.
        </p>
      </div>
      <ProductionWorkspace
        stages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
        initialOrders={kanbanOrders}
        canMove={canMove}
      />
    </div>
  );
}
