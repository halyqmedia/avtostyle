import "server-only";
import { prisma } from "@/lib/prisma";
import { toBaileysJid } from "@/lib/baileys/jid";
import { sendPersonalText } from "@/lib/baileys/session-manager";

/**
 * Best-effort "message yourself" ping on the assigned manager's own connected WhatsApp
 * (Baileys) the moment a deal's AI-read temperature flips to HOT. Deliberately not routed
 * through the shared Cloud API bot number — Meta would reject a free-form text there outside
 * the 24h customer-service window, while a personal WhatsApp Web session has no such limit.
 * Silently does nothing if the manager has no connected session — the flame badge and the
 * temperature filter on the pipeline board remain the fallback either way.
 */
export async function notifyManagerHotLead(deal: {
  id: string;
  assignedToId: string | null;
  client: { fullName: string; phone: string | null };
}): Promise<void> {
  if (!deal.assignedToId) return;

  const session = await prisma.whatsAppSession.findUnique({ where: { userId: deal.assignedToId } });
  if (!session || session.status !== "CONNECTED" || !session.phoneNumber) return;

  const ownJid = toBaileysJid(session.phoneNumber);
  if (!ownJid) return;

  const appUrl = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "";

  const text = [
    "🔥 Ыстық лид!",
    "",
    `Клиент: ${deal.client.fullName}`,
    deal.client.phone ? `Телефон: ${deal.client.phone}` : null,
    appUrl ? "" : null,
    appUrl ? `${appUrl}/crm/deals/${deal.id}` : null,
    "",
    "Жуырда қоңырау шалыңыз.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  try {
    await sendPersonalText(session.id, ownJid, text);
  } catch (err) {
    console.error("Hot lead notify failed:", err);
  }
}
