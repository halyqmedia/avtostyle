/** Cosmetic-only visibility gate. The real check is always requirePermission() server-side. */
export function RoleGate({ allowed, children }: { allowed: boolean; children: React.ReactNode }) {
  if (!allowed) return null;
  return <>{children}</>;
}
