"use client";

import { useState, useTransition } from "react";
import { assignDeal } from "@/actions/deals";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AssignDealRow({
  dealId,
  salesUsers,
}: {
  dealId: string;
  salesUsers: { id: string; name: string }[];
}) {
  const [selected, setSelected] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleAssign() {
    if (!selected) return;
    startTransition(async () => {
      await assignDeal(dealId, selected);
      toast.success("Тағайындалды");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger size="sm" className="w-48">
          <SelectValue placeholder="Маманды таңдаңыз" />
        </SelectTrigger>
        <SelectContent>
          {salesUsers.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" disabled={!selected || pending} onClick={handleAssign}>
        {pending ? "..." : "Тағайындау"}
      </Button>
    </div>
  );
}
