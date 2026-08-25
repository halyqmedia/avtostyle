"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { continueCampaign } from "@/actions/campaigns";
import { Button } from "@/components/ui/button";

export function ContinueCampaignButton({ campaignId }: { campaignId: string }) {
  const [pending, startTransition] = useTransition();

  function resume() {
    startTransition(async () => {
      try {
        await continueCampaign(campaignId);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Жалғастырылмады");
      }
    });
  }

  return (
    <Button size="sm" disabled={pending} onClick={resume}>
      {pending ? "Жалғастырылуда..." : "Жалғастыру"}
    </Button>
  );
}
