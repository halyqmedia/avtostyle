import "server-only";
import { prisma } from "@/lib/prisma";
import { toBaileysJid } from "@/lib/baileys/jid";
import { sendPersonalText } from "@/lib/baileys/session-manager";

/**
 * Best-effort ping to every active admin's own connected WhatsApp — same "message yourself"
 * mechanism as the per-manager hot-lead ping, so it works without the Cloud API's 24h-window
 * restriction. Silently skips any admin without a connected personal session.
 */
export async function notifyAllAdmins(text: string): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: { key: "ADMIN" }, isActive: true },
    include: { whatsappSession: true },
  });

  for (const admin of admins) {
    const session = admin.whatsappSession;
    if (!session || session.status !== "CONNECTED" || !session.phoneNumber) continue;
    const ownJid = toBaileysJid(session.phoneNumber);
    if (!ownJid) continue;
    try {
      await sendPersonalText(session.id, ownJid, text);
    } catch (err) {
      console.error("Admin notify failed:", err);
    }
  }
}
