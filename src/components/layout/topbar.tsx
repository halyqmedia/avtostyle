"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { Menu, Bell, Moon, Sun, ChevronRight, LogOut } from "lucide-react";
import { getHotLeadsCount } from "@/actions/deals";
import { signOutAction } from "@/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMobileNav } from "@/components/layout/mobile-nav-context";
import { NAV_ITEMS } from "@/components/layout/sidebar";
import type { Session } from "next-auth";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Breadcrumb() {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (!current) return <span className="text-sm font-medium text-foreground">Avtostyle CRM</span>;

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">CRM</span>
      <ChevronRight className="size-3.5 text-muted-foreground/50" />
      <span className="font-medium text-foreground">{current.label}</span>
    </div>
  );
}

export function Topbar({ session }: { session: Session }) {
  const { setOpen } = useMobileNav();
  const { theme, setTheme } = useTheme();
  const { data: hotLeadsCount } = useQuery({
    queryKey: ["hot-leads-count"],
    queryFn: () => getHotLeadsCount(),
    refetchInterval: 60_000,
  });

  return (
    <header className="flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => setOpen(true)}>
          <Menu className="size-4" />
        </Button>
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative">
          <Button variant="ghost" size="icon-sm">
            <Bell className="size-4" />
          </Button>
          {Boolean(hotLeadsCount) && (
            <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground">
              {hotLeadsCount! > 9 ? "9+" : hotLeadsCount}
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-lg py-1 pr-1 pl-1.5 transition-colors hover:bg-muted">
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs text-muted-foreground">{session.user.roleLabel}</p>
              </div>
              <Avatar className="size-8 ring-2 ring-background">
                <AvatarFallback className="bg-primary/10 text-primary">{initials(session.user.name ?? "?")}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{session.user.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{session.user.roleLabel}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {theme === "dark" ? "Ашық тема" : "Қараңғы тема"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => signOutAction()}>
              <LogOut className="size-4" />
              Шығу
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
