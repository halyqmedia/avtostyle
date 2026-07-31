"use client";

import {
  updateDealClientName,
  updateDealClientPhone,
  updateDealProduct,
  updateDealAmount,
  updateDealPrepayment,
  assignDeal,
} from "@/actions/deals";
import { InlineEditText } from "@/components/crm/inline-edit-text";
import { InlineEditSelect } from "@/components/crm/inline-edit-select";

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₸";
}

export function DealInfoCard({
  dealId,
  clientName,
  clientPhone,
  productId,
  productName,
  assignedToId,
  assigneeName,
  amount,
  prepayment,
  createdByName,
  source,
  products,
  salesUsers,
  canEdit,
  canAssign,
}: {
  dealId: string;
  clientName: string;
  clientPhone: string | null;
  productId: string | null;
  productName: string | null;
  assignedToId: string | null;
  assigneeName: string | null;
  amount: number;
  prepayment: number;
  createdByName: string;
  source: string | null;
  products: { id: string; name: string }[];
  salesUsers: { id: string; name: string }[];
  canEdit: boolean;
  canAssign: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <InlineEditText
        label="Клиент"
        value={clientName}
        disabled={!canEdit}
        onSave={(v) => updateDealClientName(dealId, v)}
      />
      <InlineEditText
        label="Телефон"
        value={clientPhone ?? ""}
        disabled={!canEdit}
        onSave={(v) => updateDealClientPhone(dealId, v)}
      />
      <InlineEditSelect
        label="Өнім"
        value={productId}
        displayValue={productName ?? "—"}
        options={products.map((p) => ({ value: p.id, label: p.name }))}
        allowEmpty
        emptyLabel="Өнім көрсетілмеген"
        disabled={!canEdit}
        onSave={(v) => updateDealProduct(dealId, v)}
      />
      <InlineEditSelect
        label="Жауапты маман"
        value={assignedToId}
        displayValue={assigneeName ?? "Бөлінбеген"}
        options={salesUsers.map((u) => ({ value: u.id, label: u.name }))}
        allowEmpty
        emptyLabel="Бөлінбеген"
        disabled={!canAssign}
        onSave={(v) => assignDeal(dealId, v)}
      />
      <InlineEditText
        label="Сома"
        type="number"
        value={String(amount)}
        displayValue={formatMoney(amount)}
        disabled={!canEdit}
        onSave={(v) => updateDealAmount(dealId, Number(v))}
      />
      <InlineEditText
        label="Алдын ала төлем"
        type="number"
        value={String(prepayment)}
        displayValue={formatMoney(prepayment)}
        disabled={!canEdit}
        onSave={(v) => updateDealPrepayment(dealId, Number(v))}
      />
      <div>
        <p className="text-muted-foreground">Қалдық</p>
        <p className="font-medium">{formatMoney(amount - prepayment)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Құрған</p>
        <p className="font-medium">{createdByName}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Қайнар көзі</p>
        <p className="font-medium">{source ?? "—"}</p>
      </div>
    </div>
  );
}
