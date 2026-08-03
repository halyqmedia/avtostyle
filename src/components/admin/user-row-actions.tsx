"use client";

import { useState, useTransition } from "react";
import { updateUserRole, toggleUserActive, updateUserCommissionRate } from "@/actions/users";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UserRowActions({
  userId,
  roleId,
  isActive,
  commissionRate,
  roles,
}: {
  userId: string;
  roleId: string;
  isActive: boolean;
  commissionRate: number | null;
  roles: { id: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [rate, setRate] = useState(commissionRate !== null ? String(commissionRate) : "");

  return (
    <div className="flex items-center gap-2">
      <Select
        defaultValue={roleId}
        disabled={pending}
        onValueChange={(value) => startTransition(() => updateUserRole(userId, value))}
      >
        <SelectTrigger size="sm" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roles.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => toggleUserActive(userId, !isActive))}
      >
        {isActive ? "Белсенді" : "Өшірулі"}
      </Button>
      <Input
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        onBlur={() => {
          const parsed = rate.trim() === "" ? null : Number(rate);
          if (parsed !== null && !Number.isFinite(parsed)) return;
          startTransition(() => updateUserCommissionRate(userId, parsed));
        }}
        placeholder="Комиссия %"
        type="number"
        min={0}
        max={100}
        step="0.1"
        className="h-8 w-24"
        disabled={pending}
      />
    </div>
  );
}
