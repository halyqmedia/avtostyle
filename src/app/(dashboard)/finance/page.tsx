import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { ComingSoon } from "@/components/layout/coming-soon";

export default async function FinancePage() {
  await requirePermission(PERMISSIONS.FINANCE_ACCESS);
  return (
    <ComingSoon
      title="Қаржы модулі"
      description="ОПиУ, ДДС есептері, өнім маржасы мен себестоимость визуалы осы жерде болады."
    />
  );
}
