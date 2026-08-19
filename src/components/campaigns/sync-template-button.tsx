"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { syncTemplateStatus } from "@/actions/campaigns";
import { Button } from "@/components/ui/button";

export function SyncTemplateButton({ templateId }: { templateId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(() => syncTemplateStatus(templateId))}
    >
      <RefreshCw className={pending ? "size-3.5 animate-spin" : "size-3.5"} />
      Тексеру
    </Button>
  );
}
