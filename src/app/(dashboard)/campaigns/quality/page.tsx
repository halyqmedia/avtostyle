import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ContactsQualityPage() {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const contacts = await prisma.contact.findMany({
    select: { id: true, phone: true, fullName: true, city: true, category: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const noName = contacts.filter((c) => !c.fullName?.trim());
  const noCity = contacts.filter((c) => !c.city?.trim());
  const noCategory = contacts.filter((c) => !c.category?.trim());

  const byName = new Map<string, typeof contacts>();
  for (const c of contacts) {
    const key = c.fullName?.trim().toLowerCase();
    if (!key) continue;
    const arr = byName.get(key) ?? [];
    arr.push(c);
    byName.set(key, arr);
  }
  const duplicateGroups = [...byName.entries()]
    .filter(([, group]) => group.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/campaigns"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Артқа
        </Link>
        <h1 className="text-xl font-semibold">Клиенттер базасының сапасы</h1>
        <p className="text-sm text-muted-foreground">
          {contacts.length} контакттан анықталған мүмкін дубликат пен толтырылмаған өрістер
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Аты жоқ" value={noName.length} total={contacts.length} />
        <StatCard label="Қаласы жоқ" value={noCity.length} total={contacts.length} />
        <StatCard label="Бағыты жоқ" value={noCategory.length} total={contacts.length} />
        <StatCard label="Аты бойынша дубликат топтары" value={duplicateGroups.length} total={contacts.length} noPct />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Аты бойынша мүмкін дубликаттар ({duplicateGroups.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {duplicateGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Бір аты қайталанатын контакт табылмады.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Аты</TableHead>
                  <TableHead>Телефондар</TableHead>
                  <TableHead>Саны</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duplicateGroups.map(([name, group]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{group[0].fullName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {group.map((c) => (
                          <Link key={c.id} href={`/campaigns?search=${encodeURIComponent(c.phone)}`}>
                            <Badge variant="outline" className="hover:bg-muted">
                              {c.phone}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{group.length}</TableCell>
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

function StatCard({
  label,
  value,
  total,
  noPct,
}: {
  label: string;
  value: number;
  total: number;
  noPct?: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-lg border bg-background p-3 text-center">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {!noPct && <p className="text-xs text-muted-foreground">{pct}%</p>}
    </div>
  );
}
