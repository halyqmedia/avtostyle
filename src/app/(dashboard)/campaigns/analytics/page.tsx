import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SegmentRow = { sent: number; delivered: number; replied: number; won: number };

function pct(n: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((n / total) * 100)}%`;
}

function emptyRow(): SegmentRow {
  return { sent: 0, delivered: 0, replied: 0, won: 0 };
}

export default async function CampaignsAnalyticsPage() {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const recipients = await prisma.campaignRecipient.findMany({
    include: { contact: true },
    orderBy: { createdAt: "desc" },
  });

  const dealIds = [...new Set(recipients.map((r) => r.dealId).filter((id): id is string => !!id))];

  const [repliedRows, wonRows] = await Promise.all([
    dealIds.length > 0
      ? prisma.whatsAppMessage.findMany({
          where: { dealId: { in: dealIds }, direction: "IN" },
          select: { dealId: true },
          distinct: ["dealId"],
        })
      : Promise.resolve([]),
    dealIds.length > 0
      ? prisma.transaction.findMany({
          where: { dealId: { in: dealIds }, category: "sales_payment" },
          select: { dealId: true },
          distinct: ["dealId"],
        })
      : Promise.resolve([]),
  ]);
  const repliedDealIds = new Set(repliedRows.map((r) => r.dealId));
  const wonDealIds = new Set(wonRows.map((r) => r.dealId));

  const overall = emptyRow();
  const byCity = new Map<string, SegmentRow>();
  const byCategory = new Map<string, SegmentRow>();

  for (const r of recipients) {
    if (r.status === "PENDING" || r.status === "FAILED") continue; // never actually reached the client

    const isDelivered = r.status === "DELIVERED" || r.status === "READ";
    const isReplied = Boolean(r.dealId && repliedDealIds.has(r.dealId));
    const isWon = Boolean(r.dealId && wonDealIds.has(r.dealId));

    overall.sent++;
    if (isDelivered) overall.delivered++;
    if (isReplied) overall.replied++;
    if (isWon) overall.won++;

    for (const [map, key] of [
      [byCity, r.contact.city || "Белгісіз"],
      [byCategory, r.contact.category || "Белгісіз"],
    ] as const) {
      const row = map.get(key) ?? emptyRow();
      row.sent++;
      if (isDelivered) row.delivered++;
      if (isReplied) row.replied++;
      if (isWon) row.won++;
      map.set(key, row);
    }
  }

  const cityRows = [...byCity.entries()].sort((a, b) => b[1].sent - a[1].sent);
  const categoryRows = [...byCategory.entries()].sort((a, b) => b[1].sent - a[1].sent);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Воронка аналитикасы</h1>
        <p className="text-sm text-muted-foreground">Жіберілді → жеткізілді → жауап берді → сатылды (сатылым — «sales_payment» транзакциясы бар сделка)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Жалпы воронка</CardTitle>
        </CardHeader>
        <CardContent>
          {overall.sent === 0 ? (
            <p className="text-sm text-muted-foreground">Әзірге аяқталған рассылка жоқ.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FunnelStep label="Жіберілді" value={overall.sent} of={overall.sent} />
              <FunnelStep label="Жеткізілді" value={overall.delivered} of={overall.sent} />
              <FunnelStep label="Жауап берді" value={overall.replied} of={overall.sent} />
              <FunnelStep label="Сатылды" value={overall.won} of={overall.sent} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Қала бойынша конверсия</CardTitle>
        </CardHeader>
        <CardContent>
          <SegmentTable rows={cityRows} labelHeader="Қала" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Бағыт бойынша конверсия</CardTitle>
        </CardHeader>
        <CardContent>
          <SegmentTable rows={categoryRows} labelHeader="Бағыт" />
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelStep({ label, value, of }: { label: string; value: number; of: number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{pct(value, of)}</p>
    </div>
  );
}

function SegmentTable({ rows, labelHeader }: { rows: [string, SegmentRow][]; labelHeader: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Әзірге дерек жоқ.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labelHeader}</TableHead>
          <TableHead>Жіберілді</TableHead>
          <TableHead>Жеткізілді</TableHead>
          <TableHead>Жауап берді</TableHead>
          <TableHead>Сатылды</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(([key, row]) => (
          <TableRow key={key}>
            <TableCell className="font-medium">{key}</TableCell>
            <TableCell>{row.sent}</TableCell>
            <TableCell className="text-muted-foreground">
              {row.delivered} ({pct(row.delivered, row.sent)})
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.replied} ({pct(row.replied, row.sent)})
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.won} ({pct(row.won, row.sent)})
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
