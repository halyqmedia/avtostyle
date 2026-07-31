import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

/** Shared "can this user see/act on this deal" check, reused by notes, stage moves, and field edits. */
export async function assertDealAccess(dealId: string) {
  const session = await requireSession();
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new Error("Сделка табылмады");

  const canViewAll = hasPermission(session.user.permissions, PERMISSIONS.DEALS_VIEW_ALL);
  if (!canViewAll && deal.assignedToId !== session.user.id) {
    throw new Error("Бұл сделкаға қолжетімділігіңіз жоқ");
  }
  return { session, deal };
}
