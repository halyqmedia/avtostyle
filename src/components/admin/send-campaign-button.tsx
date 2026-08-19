"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { sendCampaign } from "@/actions/campaigns";
import { Button } from "@/components/ui/button";

export function SendCampaignButton({ campaignId }: { campaignId: string }) {
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      try {
        await sendCampaign(campaignId);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Жіберілмеді");
      }
    });
  }

  return (
    <Button disabled={pending} onClick={send}>
      {pending ? "Басталуда..." : "Рассылканы бастау"}
    </Button>
  );
}
