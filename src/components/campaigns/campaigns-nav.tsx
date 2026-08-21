"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/campaigns", label: "Рассылка" },
  { href: "/campaigns/contacts", label: "База" },
  { href: "/campaigns/templates", label: "Шаблондар" },
  { href: "/campaigns/sequences", label: "Тізбектер" },
  { href: "/campaigns/analytics", label: "Аналитика" },
  { href: "/campaigns/quality", label: "Сапа" },
] as const;

export function CampaignsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b">
      {TABS.map((tab) => {
        const active = tab.href === "/campaigns" ? pathname === "/campaigns" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "border-primary text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
