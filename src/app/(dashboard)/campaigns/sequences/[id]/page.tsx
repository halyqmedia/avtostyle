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
import { ReactivationToggle } from "@/components/campaigns/reactivation-toggle";

const ENROLLMENT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Жүруде",
  REPLIED: "Жауап берді",
  COMPLETED: "Аяқталды",
  STOPPED: "Тоқтатылды",
  FAILED: "Қате",
};

export default async function SequenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);
  const { id } = await params;

  const sequence = await prisma.sequence.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { order: "asc" }, include: { template: true } },
      enrollments: {
        include: { contact: true },
        orderBy: { enrolledAt: "desc" },
        take: 500,
      },
    },
  });
  if (!sequence) notFound();

  const counts = sequence.enrollments.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid max-w-3xl gap-4">
      <div>
        <Link
          href="/campaigns"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Артқа
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{sequence.name}</h1>
          <Badge variant={sequence.status === "ACTIVE" ? "default" : "secondary"}>{sequence.status}</Badge>
          <ReactivationToggle sequenceId={sequence.id} isDefault={sequence.isReactivationDefault} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Автоматты жандандыру: ИИ «суық» (COLD) деп бағалаған, соңғы хатымыздан кейін 14 күн үнсіз қалған клиенттер
          осы тізбекке өздігінен қосылады — тек осы белгі қосулы тұрса.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Қадамдар</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-2">
            {sequence.steps.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {s.order}
                </span>
                <span className="font-medium">{s.template.name}</span>
                <span className="text-muted-foreground">
                  — {s.order === 1 ? "тіркелгеннен" : "алдыңғы хаттан"} кейін {s.delayDays} күн
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Қосылған клиенттер ({sequence.enrollments.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {Object.entries(counts).map(([status, count]) => (
              <span key={status}>
                {ENROLLMENT_STATUS_LABEL[status] ?? status}: {count}
              </span>
            ))}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Телефон</TableHead>
                <TableHead>Аты</TableHead>
                <TableHead>Қадам</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Келесі жіберу</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sequence.enrollments.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    {e.dealId ? (
                      <Link href={`/crm/deals/${e.dealId}`} className="hover:underline">
                        {e.contact.phone}
                      </Link>
                    ) : (
                      e.contact.phone
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.contact.fullName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.currentStep}/{sequence.steps.length}
                  </TableCell>
                  <TableCell>
                    <Badge variant={e.status === "FAILED" ? "destructive" : "secondary"}>
                      {ENROLLMENT_STATUS_LABEL[e.status] ?? e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.nextSendAt ? format(e.nextSendAt, "dd.MM.yyyy HH:mm") : "—"}
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
