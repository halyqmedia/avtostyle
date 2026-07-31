import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignDealRow } from "@/components/crm/assign-deal-row";

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₸";
}

export default async function UnassignedDealsPage() {
  await requirePermission(PERMISSIONS.DEALS_ASSIGN);

  const [deals, salesUsers] = await Promise.all([
    prisma.deal.findMany({
      where: { assignedToId: null },
      include: { client: true, product: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { role: { key: "SALES" }, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Бөлінбеген лидтер</h1>
        <p className="text-sm text-muted-foreground">
          WhatsApp-тан немесе қолмен түскен, әлі маманға бөлінбеген өтінімдер.
        </p>
      </div>

      {deals.length === 0 ? (
        <p className="text-sm text-muted-foreground">Бөлінбеген лидтер жоқ.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {deals.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <Link href={`/crm/deals/${d.id}`} className="hover:underline">
                    {d.title}
                  </Link>
                  <span className="text-muted-foreground">{formatMoney(Number(d.amount))}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  {d.client.fullName} · {d.client.phone} · {d.product?.name ?? "өнім көрсетілмеген"}
                </p>
                <AssignDealRow
                  dealId={d.id}
                  salesUsers={salesUsers.map((u) => ({ id: u.id, name: u.name }))}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
