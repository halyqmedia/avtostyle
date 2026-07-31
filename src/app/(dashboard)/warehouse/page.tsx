import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { ComingSoon } from "@/components/layout/coming-soon";

export default async function WarehousePage() {
  await requirePermission(PERMISSIONS.WAREHOUSE_ACCESS);
  return (
    <ComingSoon
      title="Склад / Опт материалдар"
      description="Материал қозғалысы, менеджер үлесі, бонус/штраф есебі осы жерде болады."
    />
  );
}
