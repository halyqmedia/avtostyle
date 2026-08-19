import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateTemplateDialog } from "@/components/admin/create-template-dialog";
import { SyncTemplateButton } from "@/components/admin/sync-template-button";
import { CreateCampaignDialog } from "@/components/admin/create-campaign-dialog";

const TEMPLATE_STATUS_LABEL: Record<string, string> = {
  PENDING: "Тексерілуде",
  APPROVED: "Бекітілді",
  REJECTED: "Қабылданбады",
  PAUSED: "Тоқтатылды",
  DISABLED: "Өшірілді",
};

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Дайын тұр",
  SENDING: "Жіберілуде",
  COMPLETED: "Аяқталды",
  FAILED: "Қате",
};

export default async function CampaignsPage() {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const [templates, campaigns] = await Promise.all([
    prisma.whatsAppTemplate.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.campaign.findMany({ include: { template: true }, orderBy: { createdAt: "desc" } }),
  ]);

  const approvedTemplates = templates.filter((t) => t.status === "APPROVED");

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">WhatsApp шаблондары</CardTitle>
          <CreateTemplateDialog />
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Әзірге шаблон жоқ. Рассылка жіберу үшін алдымен Meta-дан бекітілген шаблон керек.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Аты</TableHead>
                  <TableHead>Мәтін</TableHead>
                  <TableHead>Санат</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.name}
                      {t.headerType && (
                        <Badge variant="outline" className="ml-2">
                          {t.headerType === "IMAGE" ? "Сурет" : "Файл"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{t.bodyText}</TableCell>
                    <TableCell className="text-muted-foreground">{t.category}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={t.status === "APPROVED" ? "default" : "secondary"}>
                          {TEMPLATE_STATUS_LABEL[t.status] ?? t.status}
                        </Badge>
                        {t.rejectedReason && <span className="text-xs text-destructive">{t.rejectedReason}</span>}
                      </div>
                    </TableCell>
                    <TableCell>{t.status === "PENDING" && <SyncTemplateButton templateId={t.id} />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Рассылкалар</CardTitle>
          <CreateCampaignDialog templates={approvedTemplates.map((t) => ({ id: t.id, name: t.name, bodyText: t.bodyText }))} />
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Әзірге рассылка жасалмаған.</p>
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
                      <Link href={`/admin/campaigns/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.template.name}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "COMPLETED" ? "default" : "secondary"}>
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
    </div>
  );
}
