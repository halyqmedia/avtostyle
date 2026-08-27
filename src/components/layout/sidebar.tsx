"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Factory,
  Wallet,
  Warehouse,
  ShieldCheck,
  Inbox,
  MessageCircle,
  Megaphone,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { HotLeadsBadge } from "@/components/layout/hot-leads-badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMobileNav } from "@/components/layout/mobile-nav-context";
import type { Session } from "next-auth";

export const NAV_ITEMS = [
  { href: "/crm", label: "Сату (CRM)", icon: LayoutDashboard, permission: null },
  { href: "/crm/unassigned", label: "Бөлінбеген лидтер", icon: Inbox, permission: PERMISSIONS.DEALS_ASSIGN },
  { href: "/production", label: "Өндіріс", icon: Factory, permission: PERMISSIONS.PRODUCTION_ACCESS },
  { href: "/finance", label: "Қаржы", icon: Wallet, permission: PERMISSIONS.FINANCE_ACCESS },
  { href: "/warehouse", label: "Склад", icon: Warehouse, permission: PERMISSIONS.WAREHOUSE_ACCESS },
  { href: "/settings/whatsapp", label: "Менің WhatsApp-ым", icon: MessageCircle, permission: null },
  { href: "/campaigns", label: "Рассылка", icon: Megaphone, permission: PERMISSIONS.CAMPAIGNS_MANAGE },
  { href: "/admin", label: "Әкімшілік", icon: ShieldCheck, permission: PERMISSIONS.ADMIN_ACCESS },
] as const;

const COLLAPSE_STORAGE_KEY = "avtostyle-sidebar-collapsed";

function Logo({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
        A
      </div>
    );
  }
  return (
    <div className="leading-none">
      <p className="text-lg font-bold tracking-tight">AVTO</p>
      <p className="text-lg font-bold tracking-tight text-sidebar-primary">STYLE.</p>
      <p className="mt-0.5 text-[10px] tracking-widest text-sidebar-foreground/50">CRM</p>
    </div>
  );
}

function NavList({ permissions, collapsed, onNavigate }: { permissions: string[]; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
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
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-lg border-l-[3px] border-transparent px-2.5 py-2 text-sm font-medium text-sidebar-foreground/65 transition-all duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              active &&
                "border-sidebar-primary bg-gradient-to-r from-brand-soft to-transparent text-sidebar-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon className={cn("size-4 shrink-0 transition-colors", active && "text-sidebar-primary drop-shadow-[0_0_6px_var(--brand-glow)]")} />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {!collapsed && item.href === "/crm" && <HotLeadsBadge />}
            {collapsed && item.href === "/crm" && (
              <span className="absolute top-0.5 right-0.5">
                <HotLeadsBadge />
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ session }: { session: Session }) {
  const permissions = session.user.permissions;
  const { open, setOpen } = useMobileNav();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar/95 p-4 text-sidebar-foreground backdrop-blur-xl transition-[width] duration-200 md:flex",
          collapsed ? "w-[72px] items-center px-2" : "w-[260px]",
        )}
      >
        <div className={cn("mb-6 flex w-full items-center", collapsed ? "justify-center" : "justify-between px-1")}>
          <Logo collapsed={collapsed} />
        </div>
        <NavList permissions={permissions} collapsed={collapsed} />
        <button
          type="button"
          onClick={toggleCollapsed}
          className="mt-2 flex items-center justify-center gap-2 rounded-lg py-2 text-xs text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          {collapsed ? <ChevronsRight className="size-4" /> : (
            <>
              <ChevronsLeft className="size-4" />
              Жию
            </>
          )}
        </button>
      </aside>

      {/* Mobile */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex flex-col gap-0 bg-sidebar p-4 text-sidebar-foreground">
          <SheetHeader className="mb-4 p-0">
            <SheetTitle className="sr-only">Навигация</SheetTitle>
            <Logo collapsed={false} />
          </SheetHeader>
          <NavList permissions={permissions} collapsed={false} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
