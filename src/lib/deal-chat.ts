import "server-only";
import { prisma } from "@/lib/prisma";
import { getMediaUrl } from "@/lib/media-storage";
import type { WhatsAppMessageItem } from "@/components/crm/whatsapp-chat";

/**
 * Loads and maps one deal's WhatsApp history into the shape `WhatsAppChat` expects. Falls back to
 * the deal's own `comment` as a synthetic first inbound message for whatsapp-sourced leads that
 * haven't had a real `WhatsAppMessage` row created yet.
 */
export async function getDealChatMessages(deal: {
  id: string;
  source: string | null;
  comment: string | null;
  createdAt: Date;
}): Promise<WhatsAppMessageItem[]> {
  const whatsappMessages = await prisma.whatsAppMessage.findMany({
    where: { dealId: deal.id },
    include: { sentBy: true },
    orderBy: { createdAt: "asc" },
  });

  if (whatsappMessages.length === 0) {
    return deal.source === "whatsapp" && deal.comment
      ? [
          {
            id: "initial",
            direction: "IN" as const,
            body: deal.comment,
            createdAt: deal.createdAt.toISOString(),
            sentByName: null,
            status: "DELIVERED",
            errorMessage: null,
            messageType: "text",
            mediaSrc: null,
            mediaMimeType: null,
            fileName: null,
            aiGenerated: false,
          },
        ]
      : [];
  }

  return Promise.all(
    whatsappMessages.map(async (m) => ({
      id: m.id,
      direction: m.direction as "IN" | "OUT",
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      sentByName: m.sentBy?.name ?? null,
      status: m.status,
      errorMessage: m.errorMessage,
      messageType: m.messageType,
      mediaSrc: m.mediaUrl ? await getMediaUrl(m.mediaUrl) : null,
      mediaMimeType: m.mediaMimeType,
      fileName: m.fileName,
      aiGenerated: m.aiGenerated,
    })),
  );
}
