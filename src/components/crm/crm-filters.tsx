"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  manual: "Қолмен",
  instagram: "Instagram",
  referral: "Ұсыныс",
};

export type CrmFiltersState = {
  search: string;
  assignedToId: string | null;
  productId: string | null;
  source: string | null;
  temperature: string | null;
};

const TEMPERATURE_LABELS: Record<string, string> = {
  HOT: "🔥 Қызып тұр",
  WARM: "Қызығушылық бар",
  COLD: "Салқын",
};

export function CrmFilters({
  value,
  onChange,
  assignees,
  products,
  sources,
  showAssigneeFilter,
  visibleCount,
  totalCount,
}: {
  value: CrmFiltersState;
  onChange: (next: CrmFiltersState) => void;
  assignees: { id: string; name: string }[];
  products: { id: string; name: string }[];
  sources: string[];
  showAssigneeFilter: boolean;
  visibleCount: number;
  totalCount: number;
}) {
  const hasActiveFilters =
    value.search !== "" ||
    value.assignedToId !== null ||
    value.productId !== null ||
    value.source !== null ||
    value.temperature !== null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            placeholder="Іздеу: атауы, клиент, телефон, өнім..."
            className="h-8 pl-8"
          />
        </div>

        {showAssigneeFilter && (
          <Select
            value={value.assignedToId ?? "all"}
            onValueChange={(v) => onChange({ ...value, assignedToId: v === "all" ? null : v })}
          >
            <SelectTrigger size="sm" className="w-44">
              <SelectValue placeholder="Маман" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Барлық мамандар</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={value.productId ?? "all"}
          onValueChange={(v) => onChange({ ...value, productId: v === "all" ? null : v })}
        >
          <SelectTrigger size="sm" className="w-48">
            <SelectValue placeholder="Өнім" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Барлық өнімдер</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {sources.length > 0 && (
          <Select
            value={value.source ?? "all"}
            onValueChange={(v) => onChange({ ...value, source: v === "all" ? null : v })}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="Қайнар көзі" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Барлық көздер</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>
                  {SOURCE_LABELS[s] ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={value.temperature ?? "all"}
          onValueChange={(v) => onChange({ ...value, temperature: v === "all" ? null : v })}
        >
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="Жылу" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Барлық жылу</SelectItem>
            {Object.entries(TEMPERATURE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ search: "", assignedToId: null, productId: null, source: null, temperature: null })}
          >
            <X className="size-3.5" />
            Тазалау
          </Button>
        )}
      </div>
      <p className="whitespace-nowrap text-xs text-muted-foreground">
        {visibleCount} / {totalCount} сделка
      </p>
    </div>
  );
}
