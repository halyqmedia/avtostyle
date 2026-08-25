import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Дайын тұр",
  SENDING: "Жіберілуде",
  COMPLETED: "Аяқталды",
  FAILED: "Қате",
  STOPPED: "Тоқтатылды",
};

export default async function CampaignsPage() {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const campaigns = await prisma.campaign.findMany({
    include: { template: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Рассылкалар</CardTitle>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/campaigns/quality">Базаның сапасы</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/campaigns/analytics">Воронка аналитикасы</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/campaigns/contacts">+ Жаңа рассылка</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Әзірге рассылка жасалмаған. Жаңа рассылка жасау үшін «База» бетінен клиенттерді таңдап, «Рассылка жасау»
            батырмасын басыңыз.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Аты</TableHead>
                <TableHead>Шаблон</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Прогресс</TableHead>
                <TableHead>Құрылды</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/campaigns/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.template.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.status === "COMPLETED"
                          ? "default"
                          : c.status === "FAILED" || c.status === "STOPPED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {CAMPAIGN_STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.sentCount + c.failedCount}/{c.totalCount}
                    {c.failedCount > 0 && <span className="text-destructive"> ({c.failedCount} қате)</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{format(c.createdAt, "dd.MM.yyyy HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
