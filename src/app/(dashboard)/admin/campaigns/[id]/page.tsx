import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SendCampaignButton } from "@/components/admin/send-campaign-button";
import { CampaignAutoRefresh } from "@/components/admin/campaign-auto-refresh";

const RECIPIENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Кезекте",
  SENT: "Жіберілді",
  DELIVERED: "Жеткізілді",
  READ: "Оқылды",
  FAILED: "Қате",
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      template: true,
      recipients: { orderBy: { createdAt: "asc" }, take: 500 },
    },
  });
  if (!campaign) notFound();

  return (
    <div className="grid max-w-3xl gap-4">
      <CampaignAutoRefresh active={campaign.status === "SENDING"} />
      <div>
        <Link
          href="/admin/campaigns"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Артқа
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{campaign.name}</h1>
          <Badge variant={campaign.status === "COMPLETED" ? "default" : "secondary"}>{campaign.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Шаблон: {campaign.template.name} · {campaign.template.bodyText}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Прогресс</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Барлығы</span>
              <span className="text-lg font-semibold">{campaign.totalCount}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Жіберілді</span>
              <span className="text-lg font-semibold text-emerald-600">{campaign.sentCount}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Қате</span>
              <span className="text-lg font-semibold text-destructive">{campaign.failedCount}</span>
            </div>
          </div>
          {campaign.status === "DRAFT" && <SendCampaignButton campaignId={campaign.id} />}
          {campaign.status === "SENDING" && (
            <p className="text-xs text-muted-foreground">Жіберілуде — бет автоматты жаңарып тұрады...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Клиенттер ({campaign.recipients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Телефон</TableHead>
                <TableHead>Аты</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Жіберілген уақыты</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaign.recipients.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.dealId ? (
                      <Link href={`/crm/deals/${r.dealId}`} className="hover:underline">
                        {r.phone}
                      </Link>
                    ) : (
                      r.phone
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.fullName ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Badge variant={r.status === "FAILED" ? "destructive" : "secondary"}>
                        {RECIPIENT_STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                      {r.errorMessage && <span className="text-xs text-destructive">{r.errorMessage}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.sentAt ? format(r.sentAt, "dd.MM.yyyy HH:mm") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
