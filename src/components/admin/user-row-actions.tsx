"use client";

import { useTransition } from "react";
import { updateUserRole, toggleUserActive } from "@/actions/users";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function UserRowActions({
  userId,
  roleId,
  isActive,
  roles,
}: {
  userId: string;
  roleId: string;
  isActive: boolean;
  roles: { id: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();

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
    </div>
  );
}
