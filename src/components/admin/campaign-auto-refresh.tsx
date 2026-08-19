"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches the (server-rendered) page every few seconds while a campaign is actively sending. */
export function CampaignAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [active, router]);

  return null;
}
