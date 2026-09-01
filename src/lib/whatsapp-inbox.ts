import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface ChatConversation {
  dealId: string;
  clientName: string;
  clientPhone: string | null;
  aiTemperature: string | null;
  lastMessage: {
    body: string;
    direction: "IN" | "OUT";
    createdAt: string;
    messageType: string;
  };
}

/**
 * Conversations for the WhatsApp inbox — only deals with at least one real inbound reply.
 * A campaign send alone (outbound-only) doesn't qualify, so the list stays to actual
 * back-and-forth correspondence instead of every recipient a broadcast was sent to.
 */
export async function getChatConversations(opts: { assignedToId?: string }): Promise<ChatConversation[]> {
  const { assignedToId } = opts;

  const where: Prisma.DealWhereInput = {
    ...(assignedToId ? { assignedToId } : {}),
    whatsappMessages: { some: { direction: "IN" } },
  };

  const deals = await prisma.deal.findMany({
    where,
    include: {
      client: true,
      whatsappMessages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return deals
    .filter((d) => d.whatsappMessages.length > 0)
    .map((d) => ({
      dealId: d.id,
      clientName: d.client.fullName,
      clientPhone: d.client.phone,
      aiTemperature: d.aiTemperature,
      lastMessage: {
        body: d.whatsappMessages[0].body,
        direction: d.whatsappMessages[0].direction as "IN" | "OUT",
        createdAt: d.whatsappMessages[0].createdAt.toISOString(),
        messageType: d.whatsappMessages[0].messageType,
      },
    }))
    .sort((a, b) => (a.lastMessage.createdAt < b.lastMessage.createdAt ? 1 : -1));
}
