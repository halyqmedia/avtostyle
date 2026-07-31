import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, type PermissionKey } from "@/lib/permissions";

/** Authoritative RBAC check. Call at the top of every protected page/layout and every Server Action. */
export async function requirePermission(permission: PermissionKey) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.permissions, permission)) redirect("/no-access");
  return session;
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}
