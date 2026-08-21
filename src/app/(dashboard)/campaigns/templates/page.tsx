import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateTemplateDialog } from "@/components/campaigns/create-template-dialog";
import { TemplateDetailsDialog } from "@/components/campaigns/template-details-dialog";
import { SyncTemplateButton } from "@/components/campaigns/sync-template-button";

const TEMPLATE_STATUS_LABEL: Record<string, string> = {
  PENDING: "Тексерілуде",
  APPROVED: "Бекітілді",
  REJECTED: "Қабылданбады",
  PAUSED: "Тоқтатылды",
  DISABLED: "Өшірілді",
};

export default async function CampaignTemplatesPage() {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const templates = await prisma.whatsAppTemplate.findMany({ orderBy: { createdAt: "desc" } });

  return (
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
                    <TemplateDetailsDialog template={t}>
                      <button type="button" className="text-left hover:underline">
                        {t.name}
                      </button>
                    </TemplateDetailsDialog>
                    {t.headerType && (
                      <Badge variant="outline" className="ml-2">
                        {t.headerType === "IMAGE" ? "Сурет" : "Файл"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    <TemplateDetailsDialog template={t}>
                      <button type="button" className="block max-w-xs truncate text-left hover:underline">
                        {t.bodyText}
                      </button>
                    </TemplateDetailsDialog>
                  </TableCell>
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
  );
}
