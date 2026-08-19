"use client";

import { updateDealClientName, updateDealClientPhone, updateDealProduct, updateDealAmount, updateDealPrepayment } from "@/actions/deals";
import { InlineEditText } from "@/components/crm/inline-edit-text";
import { InlineEditSelect } from "@/components/crm/inline-edit-select";

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₸";
}

export function DealSummary({
  dealId,
  clientName,
  clientPhone,
  productId,
  productName,
  amount,
  prepayment,
  createdByName,
  source,
  products,
  canEdit,
}: {
  dealId: string;
  clientName: string;
  clientPhone: string | null;
  productId: string | null;
  productName: string | null;
  amount: number;
  prepayment: number;
  createdByName: string;
  source: string | null;
  products: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const remainder = amount - prepayment;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
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
      <div>
        <p className="text-muted-foreground">Қайнар көзі</p>
        <p className="font-medium">{source ?? "—"}</p>
      </div>

      <InlineEditText
        label="Сома"
        type="number"
        value={String(amount)}
        displayValue={<span className="text-base font-semibold">{formatMoney(amount)}</span>}
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
        <p className="text-base font-semibold">{formatMoney(remainder)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Құрған</p>
        <p className="font-medium">{createdByName}</p>
      </div>
    </div>
  );
}
