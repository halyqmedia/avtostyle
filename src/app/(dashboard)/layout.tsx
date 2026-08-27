import { requireSession } from "@/lib/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <MobileNavProvider>
      <div className="flex flex-1">
        <Sidebar session={session} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar session={session} />
          <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
