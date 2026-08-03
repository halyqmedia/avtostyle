import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReceivePurchaseOrderForm } from "@/components/warehouse/receive-purchase-order-form";
import { PurchaseOrderActions } from "@/components/warehouse/purchase-order-actions";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Жасалды",
  ORDERED: "Тапсырыс берілді",
  PARTIALLY_RECEIVED: "Ішінара қабылданды",
  RECEIVED: "Қабылданды",
  CANCELLED: "Болдырылмады",
};

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const canManage = hasPermission(session.user.permissions, PERMISSIONS.WAREHOUSE_MANAGE);

  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, warehouse: true, createdBy: true, items: { include: { product: true } } },
  });
  if (!order) notFound();

  const total = order.items.reduce((s, it) => s + Number(it.quantity) * Number(it.price), 0);
  const isFinal = order.status === "RECEIVED" || order.status === "CANCELLED";

  return (
    <div className="grid max-w-3xl gap-4">
      <div>
        <Link
          href="/warehouse/purchase-orders"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Артқа
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Заказ №{order.number}</h1>
          <Badge>{STATUS_LABEL[order.status] ?? order.status}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Жалпы ақпарат</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Жабдықтаушы</span>
            <span>{order.supplier.name}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Склад</span>
            <span>{order.warehouse.name}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Жалпы сома</span>
            <span>{new Intl.NumberFormat("ru-RU").format(total)} ₸</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Құрылған күні</span>
            <span>{format(order.createdAt, "dd.MM.yyyy HH:mm")}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Кім құрды</span>
            <span>{order.createdBy.name}</span>
          </div>
          {order.comment && (
            <div className="col-span-2 flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Ескертпе</span>
              <span className="whitespace-pre-wrap">{order.comment}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardContent className="pt-6">
            <PurchaseOrderActions orderId={order.id} isPaid={order.isPaid} canCancel={!isFinal} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Тауарлар / қабылдау</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceivePurchaseOrderForm
            orderId={order.id}
            disabled={!canManage || isFinal}
            items={order.items.map((it) => ({
              id: it.id,
              productName: it.product.name,
              unit: it.product.unit,
              quantity: Number(it.quantity),
              receivedQty: Number(it.receivedQty),
              price: Number(it.price),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
