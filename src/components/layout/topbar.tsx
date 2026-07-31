import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import type { Session } from "next-auth";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar({ session }: { session: Session }) {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div className="md:hidden text-sm font-semibold">Avtostyle CRM</div>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium">{session.user.name}</p>
          <p className="text-xs text-muted-foreground">{session.user.roleLabel}</p>
        </div>
        <Avatar className="size-8">
          <AvatarFallback>{initials(session.user.name ?? "?")}</AvatarFallback>
        </Avatar>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="outline" size="sm">
            Шығу
          </Button>
        </form>
      </div>
    </header>
  );
}
