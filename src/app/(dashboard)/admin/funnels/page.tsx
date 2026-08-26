import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateFunnelForm } from "@/components/admin/create-funnel-form";

export default async function FunnelsPage() {
  await requirePermission(PERMISSIONS.ADMIN_PIPELINE_MANAGE);

  const funnels = await prisma.funnel.findMany({
    orderBy: { createdAt: "asc" },
    include: { whatsappNumbers: { select: { id: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Воронка — бір өнімге/бағытқа арналған бөлек сату pipeline-ы: өз kanban кезеңдері, өз ИИ сату
        скрипті (system prompt, КП/каталог файлдары) және оған бекітілген WhatsApp нөмір(лер)і болады.
        Нөмір мен менеджерді «WhatsApp нөмірлері» бетінен бекітесіз.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Воронкалар</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {funnels.map((f) => (
            <Link
              key={f.id}
              href={`/admin/funnels/${f.id}`}
              className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{f.name}</span>
                <span className="text-xs text-muted-foreground">({f.key})</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={f.aiEnabled ? "default" : "secondary"}>
                  {f.aiEnabled ? "ИИ қосулы" : "ИИ өшірулі"}
                </Badge>
                <Badge variant="outline">{f.whatsappNumbers.length} нөмір</Badge>
              </div>
            </Link>
          ))}
          <CreateFunnelForm />
        </CardContent>
      </Card>
    </div>
  );
}
