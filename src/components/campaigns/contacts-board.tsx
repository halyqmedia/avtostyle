"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadContactsDialog } from "@/components/campaigns/upload-contacts-dialog";
import { EditContactDialog, type ContactRow } from "@/components/campaigns/edit-contact-dialog";
import {
  CreateCampaignFromSelectionDialog,
  type ApprovedTemplateOption,
} from "@/components/campaigns/create-campaign-from-selection-dialog";

const ALL = "__all__";

export type BoardContact = ContactRow & { dealId: string | null };

export function ContactsBoard({
  contacts,
  cities,
  professions,
  categories,
  statuses,
  tags,
  templates,
}: {
  contacts: BoardContact[];
  cities: string[];
  professions: string[];
  categories: string[];
  statuses: string[];
  tags: string[];
  templates: ApprovedTemplateOption[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [profession, setProfession] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (q && !(c.phone.includes(q) || (c.fullName ?? "").toLowerCase().includes(q))) return false;
      if (city && c.city !== city) return false;
      if (profession && c.profession !== profession) return false;
      if (category && c.category !== category) return false;
      if (status && c.status !== status) return false;
      if (tag && !c.tags.includes(tag)) return false;
      return true;
    });
  }, [contacts, search, city, profession, category, status, tag]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const hasActiveFilters = search !== "" || city || profession || category || status || tag;

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((c) => next.delete(c.id));
      } else {
        filtered.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setSearch("");
    setCity(null);
    setProfession(null);
    setCategory(null);
    setStatus(null);
    setTag(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Іздеу: аты, телефон..."
              className="h-8 pl-8"
            />
          </div>
          <FilterSelect label="Қала" value={city} onChange={setCity} options={cities} />
          <FilterSelect label="Кәсіп" value={profession} onChange={setProfession} options={professions} />
          <FilterSelect label="Бағыт" value={category} onChange={setCategory} options={categories} />
          <FilterSelect label="Статус" value={status} onChange={setStatus} options={statuses} />
          <FilterSelect label="Тег" value={tag} onChange={setTag} options={tags} />
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-3.5" />
              Тазалау
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <UploadContactsDialog />
          <Button disabled={selected.size === 0} onClick={() => setCampaignDialogOpen(true)}>
            Рассылка жасау ({selected.size})
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} / {contacts.length} контакт
      </p>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={toggleAllFiltered}
                  disabled={filtered.length === 0}
                />
              </TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Аты</TableHead>
              <TableHead>Қала</TableHead>
              <TableHead>Кәсіп</TableHead>
              <TableHead>Бағыт</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Тегтер</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} />
                </TableCell>
                <TableCell className="font-medium">
                  {c.dealId ? (
                    <Link href={`/crm/deals/${c.dealId}`} className="hover:underline">
                      {c.phone}
                    </Link>
                  ) : (
                    c.phone
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{c.fullName ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.city ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.profession ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.category ?? "—"}</TableCell>
                <TableCell>{c.status && <Badge variant="secondary">{c.status}</Badge>}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <EditContactDialog contact={c} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {contacts.length === 0 && <p className="p-4 text-sm text-muted-foreground">Әзірге контакт жоқ.</p>}
      </div>

      <CreateCampaignFromSelectionDialog
        open={campaignDialogOpen}
        onOpenChange={setCampaignDialogOpen}
        selectedIds={[...selected]}
        templates={templates}
        onCreated={() => {
          setSelected(new Set());
          router.refresh();
        }}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: string[];
}) {
  if (options.length === 0) return null;
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
      <SelectTrigger size="sm" className="w-36">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label} (барлығы)</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
