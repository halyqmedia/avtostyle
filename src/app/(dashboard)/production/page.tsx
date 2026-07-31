import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { ComingSoon } from "@/components/layout/coming-soon";

export default async function ProductionPage() {
  await requirePermission(PERMISSIONS.PRODUCTION_ACCESS);
  return (
    <ComingSoon
      title="Өндіріс конвейері"
      description="Тапсырыстың өндіріс этаптары, жауапты маман және аудит логы осы жерде болады."
    />
  );
}
