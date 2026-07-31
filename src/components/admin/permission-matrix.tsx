"use client";

import { useState, useTransition } from "react";
import { updateRolePermissions } from "@/actions/roles";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const MODULE_LABELS: Record<string, string> = {
  admin: "Әкімшілік",
  sales: "Сату (CRM)",
  production: "Өндіріс",
  finance: "Қаржы",
  warehouse: "Склад",
};

export function PermissionMatrix({
  roleId,
  permissionsByModule,
  initialChecked,
}: {
  roleId: string;
  permissionsByModule: Record<string, { key: string; label: string }[]>;
  initialChecked: string[];
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(initialChecked));
  const [pending, startTransition] = useTransition();

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      await updateRolePermissions(roleId, Array.from(checked));
      toast.success("Сақталды");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(permissionsByModule).map(([module, perms]) => (
        <div key={module} className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{MODULE_LABELS[module] ?? module}</p>
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            {perms.map((p) => (
              <div key={p.key} className="flex items-center gap-2">
                <Checkbox
                  id={p.key}
                  checked={checked.has(p.key)}
                  onCheckedChange={() => toggle(p.key)}
                />
                <Label htmlFor={p.key} className="font-normal">
                  {p.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button onClick={save} disabled={pending} className="self-start">
        {pending ? "Сақталуда..." : "Сақтау"}
      </Button>
    </div>
  );
}
