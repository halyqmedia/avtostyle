"use client";

import { useTransition } from "react";
import { Flame } from "lucide-react";
import { toast } from "sonner";
import { setReactivationDefault } from "@/actions/sequences";
import { Button } from "@/components/ui/button";

export function ReactivationToggle({ sequenceId, isDefault }: { sequenceId: string; isDefault: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={isDefault ? "secondary" : "outline"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await setReactivationDefault(sequenceId, !isDefault);
            toast.success(
              isDefault
                ? "Автоматты жандандыру өшірілді"
                : "Бұл тізбек автоматты жандандыру үшін белгіленді — басқа тізбектен алынды",
            );
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Қате шықты");
          }
        })
      }
    >
      <Flame className="size-4" />
      {isDefault ? "Автоматты жандандыру тізбегі" : "Жандандыру тізбегі етіп белгілеу"}
    </Button>
  );
}
