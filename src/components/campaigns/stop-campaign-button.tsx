"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { stopCampaign } from "@/actions/campaigns";
import { Button } from "@/components/ui/button";

export function StopCampaignButton({ campaignId }: { campaignId: string }) {
  const [pending, startTransition] = useTransition();

  function stop() {
    startTransition(async () => {
      try {
        await stopCampaign(campaignId);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Тоқтатылмады");
      }
    });
  }

  return (
    <Button size="sm" variant="destructive" disabled={pending} onClick={stop}>
      {pending ? "Тоқтатылуда..." : "Тоқтату"}
    </Button>
  );
}
