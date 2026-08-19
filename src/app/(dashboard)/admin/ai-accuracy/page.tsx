import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AI_NOTE_PREFIX = "🤖";

function pct(n: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((n / total) * 100)}%`;
}

export default async function AiAccuracyPage() {
  const aiMoves = await prisma.stageHistory.findMany({
    where: { entityType: "DEAL", note: { startsWith: AI_NOTE_PREFIX } },
    orderBy: { movedAt: "asc" },
    include: { toStage: true },
  });

  if (aiMoves.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ИИ-дің автоматты кезең ауыстыруларының дәлдігі</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Әзірге ИИ автоматты түрде ешбір сделканы ауыстырған жоқ.
          </p>
        </CardContent>
      </Card>
    );
  }

  const dealIds = [...new Set(aiMoves.map((m) => m.entityId))];
  const [timeline, deals] = await Promise.all([
    prisma.stageHistory.findMany({
      where: { entityType: "DEAL", entityId: { in: dealIds } },
      orderBy: { movedAt: "asc" },
      include: { toStage: true, movedBy: true },
    }),
    prisma.deal.findMany({ where: { id: { in: dealIds } }, include: { client: true } }),
  ]);
  const dealById = new Map(deals.map((d) => [d.id, d]));

  const byDeal = new Map<string, typeof timeline>();
  for (const h of timeline) {
    const arr = byDeal.get(h.entityId) ?? [];
    arr.push(h);
    byDeal.set(h.entityId, arr);
  }

  type Corrected = {
    dealId: string;
    aiStageName: string;
    humanStageName: string;
    aiAt: Date;
    humanAt: Date;
    humanName: string;
  };
  const corrections: Corrected[] = [];
  let kept = 0;

  for (const move of aiMoves) {
    const dealTimeline = byDeal.get(move.entityId) ?? [];
    const idx = dealTimeline.findIndex((h) => h.id === move.id);
    const next = dealTimeline[idx + 1];
    const nextIsHuman = next && !next.note?.startsWith(AI_NOTE_PREFIX);

    if (nextIsHuman && next.toStageId !== move.toStageId) {
      corrections.push({
        dealId: move.entityId,
        aiStageName: move.toStage.name,
        humanStageName: next.toStage.name,
        aiAt: move.movedAt,
        humanAt: next.movedAt,
        humanName: next.movedBy.name,
      });
    } else {
      kept++;
    }
  }

  const total = aiMoves.length;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ИИ-дің автоматты кезең ауыстыруларының дәлдігі</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center sm:max-w-md">
            <div className="rounded-lg border p-3">
              <p className="text-2xl font-semibold">{total}</p>
              <p className="text-xs text-muted-foreground">Барлық авто ауыстыру</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-2xl font-semibold">{kept}</p>
              <p className="text-xs text-muted-foreground">Түзетілмеген</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-2xl font-semibold">{corrections.length}</p>
              <p className="text-xs text-muted-foreground">Менеджер түзеткен</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Дәлдік: <span className="font-medium text-foreground">{pct(kept, total)}</span> — ИИ ауыстырған
            сделканың менеджер кейін басқа кезеңге қолмен жылжытпаған үлесі.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Түзетілген жағдайлар ({corrections.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {corrections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Әзірге ИИ түзетілген жоқ.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сделка</TableHead>
                  <TableHead>ИИ ауыстырды</TableHead>
                  <TableHead>Менеджер түзетті</TableHead>
                  <TableHead>Кім</TableHead>
                  <TableHead>Қашан</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {corrections.map((c, i) => {
                  const deal = dealById.get(c.dealId);
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {deal ? (
                          <Link href={`/crm/deals/${deal.id}`} className="hover:underline">
                            {deal.client.fullName}
                          </Link>
                        ) : (
                          c.dealId
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.aiStageName}</TableCell>
                      <TableCell className="text-muted-foreground">{c.humanStageName}</TableCell>
                      <TableCell className="text-muted-foreground">{c.humanName}</TableCell>
                      <TableCell className="text-muted-foreground">{format(c.humanAt, "dd.MM.yyyy HH:mm")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
