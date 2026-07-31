"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Factory,
  Wallet,
  Warehouse,
  ShieldCheck,
  Inbox,
} from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Session } from "next-auth";

const NAV_ITEMS = [
  { href: "/crm", label: "Сату (CRM)", icon: LayoutDashboard, permission: null },
  { href: "/crm/unassigned", label: "Бөлінбеген лидтер", icon: Inbox, permission: PERMISSIONS.DEALS_ASSIGN },
  { href: "/production", label: "Өндіріс", icon: Factory, permission: PERMISSIONS.PRODUCTION_ACCESS },
  { href: "/finance", label: "Қаржы", icon: Wallet, permission: PERMISSIONS.FINANCE_ACCESS },
  { href: "/warehouse", label: "Склад", icon: Warehouse, permission: PERMISSIONS.WAREHOUSE_ACCESS },
  { href: "/admin", label: "Әкімшілік", icon: ShieldCheck, permission: PERMISSIONS.ADMIN_ACCESS },
] as const;

export function Sidebar({ session }: { session: Session }) {
  const permissions = session.user.permissions;
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground md:flex">
      <div className="mb-6 px-2">
        <p className="text-lg font-semibold leading-tight">
          Avtostyle<span className="text-primary">.</span>
        </p>
        <p className="text-xs text-sidebar-foreground/60">CRM</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const allowed = item.permission === null || hasPermission(permissions, item.permission);
          if (!allowed) return null;
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md border-l-2 border-transparent px-2.5 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                active && "border-primary bg-sidebar-accent text-sidebar-foreground",
              )}
            >
              <Icon className={cn("size-4", active && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
