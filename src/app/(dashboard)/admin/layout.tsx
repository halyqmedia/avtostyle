import Link from "next/link";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

const TABS = [
  { href: "/admin/users", label: "Қызметкерлер" },
  { href: "/admin/roles", label: "Рөлдер мен доступ" },
  { href: "/admin/pipeline-stages", label: "Pipeline кезеңдері" },
  { href: "/admin/quick-replies", label: "Жылдам жауаптар" },
  { href: "/admin/ai-agent", label: "ИИ агент" },
  { href: "/admin/ai-accuracy", label: "ИИ дәлдігі" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(PERMISSIONS.ADMIN_ACCESS);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Әкімшілік панель</h1>
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
