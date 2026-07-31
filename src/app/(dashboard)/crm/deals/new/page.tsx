import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { CreateDealForm } from "@/components/crm/create-deal-form";

export default async function NewDealPage() {
  const session = await requirePermission(PERMISSIONS.DEALS_CREATE);
  const canAssign = hasPermission(session.user.permissions, PERMISSIONS.DEALS_ASSIGN);

  const [products, salesUsers] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    canAssign
      ? prisma.user.findMany({
          where: { role: { key: "SALES" }, isActive: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Жаңа сделка</h1>
      <CreateDealForm
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        salesUsers={salesUsers?.map((u) => ({ id: u.id, name: u.name })) ?? null}
      />
    </div>
  );
}
