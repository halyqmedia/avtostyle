import Link from "next/link";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

const TABS = [
  { href: "/finance", label: "ОПиУ (P&L)" },
  { href: "/finance/employees", label: "Қызметкерлер есебі" },
  { href: "/finance/balance", label: "Баланс" },
  { href: "/finance/transactions", label: "Транзакциялар" },
];

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(PERMISSIONS.FINANCE_ACCESS);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Қаржы</h1>
        <nav className="mt-3 flex gap-1 border-b">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-t-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
