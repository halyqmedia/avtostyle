import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateSequenceDialog } from "@/components/campaigns/create-sequence-dialog";

const SEQUENCE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Дайын тұр",
  ACTIVE: "Белсенді",
  PAUSED: "Тоқтатылды",
};

export default async function CampaignSequencesPage() {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const [sequences, approvedTemplates] = await Promise.all([
    prisma.sequence.findMany({
      include: { steps: true, _count: { select: { enrollments: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.whatsAppTemplate.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, bodyText: true },
    }),
  ]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Автоматты тізбектер</CardTitle>
        <CreateSequenceDialog templates={approvedTemplates} />
      </CardHeader>
      <CardContent>
        {sequences.length === 0 ? (
          <p className="text-sm text-muted-foreground">Әзірге тізбек жасалмаған.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Аты</TableHead>
                <TableHead>Қадам саны</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Қосылған клиент</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sequences.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <Link href={`/campaigns/sequences/${s.id}`} className="hover:underline">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.steps.length}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "ACTIVE" ? "default" : "secondary"}>
                      {SEQUENCE_STATUS_LABEL[s.status] ?? s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s._count.enrollments}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
