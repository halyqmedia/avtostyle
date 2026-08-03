import Link from "next/link";
import { format } from "date-fns";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getMediaUrl } from "@/lib/media-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductionStageControl } from "@/components/production/production-stage-control";

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Қолма-қол",
  card: "Карта",
  transfer: "Аударым",
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₸";
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default async function ProductionOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const order = await prisma.productionOrder.findUnique({
    where: { id },
    include: { items: true, createdBy: true, pipelineStage: true, deal: true },
  });
  if (!order) notFound();

  const canAccessProduction = hasPermission(session.user.permissions, PERMISSIONS.PRODUCTION_ACCESS);
  const canViewAllDeals = hasPermission(session.user.permissions, PERMISSIONS.DEALS_VIEW_ALL);
  const isCreator = order.createdById === session.user.id;
  if (!canAccessProduction && !isCreator && !canViewAllDeals) redirect("/no-access");

  const [stages, history] = await Promise.all([
    prisma.pipelineStage.findMany({ where: { pipeline: "PRODUCTION" }, orderBy: { order: "asc" } }),
    prisma.stageHistory.findMany({
      where: { entityType: "PRODUCTION_ORDER", entityId: order.id },
      include: { fromStage: true, toStage: true, movedBy: true },
      orderBy: { movedAt: "desc" },
    }),
  ]);

  const itemsWithPhotos = await Promise.all(
    order.items.map(async (it) => ({
      id: it.id,
      productType: it.productType,
      photoSrc: it.materialPhotoUrl ? await getMediaUrl(it.materialPhotoUrl) : null,
    })),
  );

  const historyWithPhotos = await Promise.all(
    history.map(async (h) => ({
      id: h.id,
      movedByName: h.movedBy.name,
      fromStageName: h.fromStage?.name ?? null,
      toStageName: h.toStage.name,
      movedAt: h.movedAt,
      photoSrc: h.photoUrl ? await getMediaUrl(h.photoUrl) : null,
    })),
  );

  const paymentAmount = Number(order.paymentAmount);
  const remainingAmount = Number(order.remainingAmount);

  return (
    <div className="grid max-w-3xl gap-4">
      <div>
        <Link
          href="/production"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Артқа
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{order.clientName}</h1>
          {canAccessProduction ? (
            <ProductionStageControl
              orderId={order.id}
              currentStageId={order.pipelineStageId}
              stages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
            />
          ) : (
            <span
              className="rounded-full border px-2.5 py-1 text-xs"
              style={{ borderColor: `${order.pipelineStage.color}55`, backgroundColor: `${order.pipelineStage.color}22` }}
            >
              {order.pipelineStage.name}
            </span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Клиент және көлік ақпараты</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Аты-жөні" value={order.clientName} />
          <Field label="Телефон" value={order.clientPhone} />
          <Field label="Қаласы" value={order.city} />
          <Field label="Адресі" value={order.address} />
          <Field label="Машина маркасы" value={order.carBrand} />
          <Field label="Жылы" value={order.carYear} />
          <Field label="Поколение" value={order.carGeneration} />
          <Field label="Менеджер" value={order.createdBy.name} />
          {order.deal && (
            <Field
              label="Сделка"
              value={
                <Link href={`/crm/deals/${order.dealId}`} className="text-primary hover:underline">
                  {order.deal.title}
                </Link>
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Төлем</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 text-sm">
          <Field label="Төлем сомасы" value={formatMoney(paymentAmount)} />
          <Field label="Төлем түрі" value={order.paymentType ? (PAYMENT_LABEL[order.paymentType] ?? order.paymentType) : null} />
          <Field label="Қалған сома" value={formatMoney(remainingAmount)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Таңдаған өнім түрлері</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {itemsWithPhotos.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-lg border p-2">
              {it.photoSrc && (
                <a href={it.photoSrc} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned S3 URL */}
                  <img src={it.photoSrc} alt={it.productType} className="size-16 rounded-md object-cover" />
                </a>
              )}
              <p className="text-sm">{it.productType}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {order.note && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ескертпе</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{order.note}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Кезеңдер тарихы (аудит логы)</CardTitle>
        </CardHeader>
        <CardContent>
          {historyWithPhotos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Әзірге өзгеріс болған жоқ.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {historyWithPhotos.map((h) => (
                <li key={h.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p>
                      <span className="font-medium">{h.movedByName}</span>{" "}
                      {h.fromStageName ? (
                        <>
                          «{h.fromStageName}» кезеңінен «{h.toStageName}» кезеңіне жылжытты
                        </>
                      ) : (
                        <>«{h.toStageName}» кезеңінде құрды</>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(h.movedAt, "dd.MM.yyyy HH:mm")}</p>
                    {h.photoSrc && (
                      <a href={h.photoSrc} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned S3 URL */}
                        <img src={h.photoSrc} alt="" className="mt-1 h-20 rounded-md object-cover" />
                      </a>
                    )}
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
