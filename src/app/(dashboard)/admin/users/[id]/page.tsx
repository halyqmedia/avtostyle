import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { getMediaUrl } from "@/lib/media-storage";
import {
  getSalesPerformance,
  getProductionPerformance,
  getEarningsHistory,
  getUserAuditLog,
} from "@/lib/employee-performance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { EmployeePhotoForm } from "@/components/admin/employee-photo-form";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";
import { MonthlyBarChart } from "@/components/admin/monthly-bar-chart";
import { InlineEditText } from "@/components/crm/inline-edit-text";
import { updateUserName, updateUserPhone } from "@/actions/users";

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₸";
}

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.ADMIN_USERS_MANAGE);
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!user) notFound();

  const [roles, photoSrc] = await Promise.all([
    prisma.role.findMany({ orderBy: { label: "asc" } }),
    user.photoUrl ? getMediaUrl(user.photoUrl) : Promise.resolve(null),
  ]);

  const modules = new Set(user.role.permissions.map((rp) => rp.permission.module));
  const isSales = modules.has("sales");
  const isProduction = modules.has("production");

  const [salesPerf, productionPerf, earnings, auditLog] = await Promise.all([
    isSales ? getSalesPerformance(user.id) : Promise.resolve(null),
    isProduction ? getProductionPerformance(user.id) : Promise.resolve(null),
    getEarningsHistory(user.id),
    getUserAuditLog(user.id),
  ]);

  const totalCommission = earnings.reduce((s, m) => s + m.commission, 0);
  const totalSalary = earnings.reduce((s, m) => s + m.salary, 0);

  return (
    <div className="grid max-w-3xl gap-4">
      <div>
        <Link
          href="/admin/users"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Артқа
        </Link>
        <div className="flex items-center gap-4">
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived presigned S3 URL
            <img src={photoSrc} alt={user.name} className="size-16 rounded-full object-cover" />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
              {user.name.slice(0, 1)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold">{user.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary">{user.role.label}</Badge>
              <Badge variant={user.isActive ? "default" : "secondary"}>
                {user.isActive ? "Белсенді" : "Өшірулі"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Логин және қолжетімділік</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <InlineEditText
              label="Аты-жөні"
              value={user.name}
              onSave={updateUserName.bind(null, user.id)}
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground">Логин (email)</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <InlineEditText
              label="Телефон"
              value={user.phone ?? ""}
              displayValue={user.phone ?? "—"}
              onSave={updateUserPhone.bind(null, user.id)}
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground">Тіркелген күні</span>
              <span>{format(user.createdAt, "dd.MM.yyyy")}</span>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">
              Ағымдағы құпия сөзді көрсету мүмкін емес (біржолғы хэш ретінде сақталады) — қажет болса
              жаңасын осы жерден орнатыңыз.
            </p>
            <ResetPasswordForm userId={user.id} />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Рөл, статус, комиссия пайызы</p>
            <UserRowActions
              userId={user.id}
              roleId={user.roleId}
              isActive={user.isActive}
              commissionRate={user.commissionRate ? Number(user.commissionRate) : null}
              roles={roles.map((r) => ({ id: r.id, label: r.label }))}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Фото</p>
            <EmployeePhotoForm userId={user.id} />
          </div>
        </CardContent>
      </Card>

      {isSales && salesPerf && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Сату тиімділігі (соңғы 6 ай)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <MonthlyBarChart
              data={salesPerf.map((m) => ({ label: m.label, value: m.salesTotal }))}
              color="#22C55E"
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ай</TableHead>
                  <TableHead>Оборот</TableHead>
                  <TableHead>Төлем саны</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesPerf
                  .slice()
                  .reverse()
                  .map((m) => (
                    <TableRow key={m.month}>
                      <TableCell>{m.label}</TableCell>
                      <TableCell>{formatMoney(m.salesTotal)}</TableCell>
                      <TableCell className="text-muted-foreground">{m.dealsCount}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {isProduction && productionPerf && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Өндіріс тиімділігі (соңғы 6 ай)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <MonthlyBarChart
              data={productionPerf.map((m) => ({ label: m.label, value: m.completedCount }))}
              color="#8B5CF6"
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ай</TableHead>
                  <TableHead>Статус ауыстыру саны</TableHead>
                  <TableHead>Аяқталған тапсырыс саны</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionPerf
                  .slice()
                  .reverse()
                  .map((m) => (
                    <TableRow key={m.month}>
                      <TableCell>{m.label}</TableCell>
                      <TableCell className="text-muted-foreground">{m.movesCount}</TableCell>
                      <TableCell>{m.completedCount}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Алған жалақылары / комиссия (соңғы 6 ай)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Жиынтық комиссия</span>
              <span className="text-lg font-semibold text-emerald-600">{formatMoney(totalCommission)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Жиынтық жалақы</span>
              <span className="text-lg font-semibold">{formatMoney(totalSalary)}</span>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ай</TableHead>
                <TableHead>Комиссия</TableHead>
                <TableHead>Жалақы</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {earnings
                .slice()
                .reverse()
                .map((m) => (
                  <TableRow key={m.month}>
                    <TableCell>{m.label}</TableCell>
                    <TableCell className="text-emerald-600">{formatMoney(m.commission)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatMoney(m.salary)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Аудит (соңғы әрекеттер)</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Әзірге әрекет тіркелмеген.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {auditLog.map((a) => (
                <li key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p>
                      <span className="font-medium">{a.label}</span>{" "}
                      {a.fromStageName ? (
                        <>
                          «{a.fromStageName}» → «{a.toStageName}»
                        </>
                      ) : (
                        <>«{a.toStageName}» кезеңінде құрды</>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(a.movedAt, "dd.MM.yyyy HH:mm")}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
