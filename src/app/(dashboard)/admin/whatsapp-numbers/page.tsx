import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WhatsAppNumberRow } from "@/components/admin/whatsapp-number-row";
import { CreateWhatsAppNumberForm } from "@/components/admin/create-whatsapp-number-form";

export default async function WhatsAppNumbersPage() {
  await requirePermission(PERMISSIONS.ADMIN_PIPELINE_MANAGE);

  const [numbers, funnels, managers] = await Promise.all([
    prisma.whatsAppNumber.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.funnel.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Әр WhatsApp нөмір белгілі бір воронкаға және (міндетті емес) сол нөмірмен жұмыс істейтін
        менеджерге бекітіледі. Сол нөмірге келген жаңа лидтер осы воронкаға түсіп, бекітілген
        менеджерге автоматты тағайындалады.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">WhatsApp нөмірлері</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {numbers.map((n) => (
            <WhatsAppNumberRow
              key={n.id}
              number={n}
              funnels={funnels.map((f) => ({ id: f.id, name: f.name }))}
              managers={managers.map((m) => ({ id: m.id, name: m.name }))}
            />
          ))}
          <CreateWhatsAppNumberForm
            funnels={funnels.map((f) => ({ id: f.id, name: f.name }))}
            managers={managers.map((m) => ({ id: m.id, name: m.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
