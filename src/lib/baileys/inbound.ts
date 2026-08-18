import "server-only";
import { downloadMediaMessage, type WAMessage } from "baileys";
import { prisma } from "@/lib/prisma";
import { uploadMedia } from "@/lib/media-storage";
import { normalizePhone } from "@/lib/phone";
import { jidToDigits, isPersonalChatJid } from "@/lib/baileys/jid";

type ParsedMessageType = "text" | "image" | "audio" | "video" | "document";

/**
 * Persists one message coming through a manager's personal WhatsApp (Baileys) socket — both
 * directions: `fromMe` messages sent from the linked phone itself, and inbound client replies.
 * Mirrors `handleInboundMessage` in the Cloud API webhook so both channels land in the same
 * WhatsAppMessage table and show up together on the deal's chat.
 */
export async function handleBaileysMessage(sessionId: string, ownerUserId: string, msg: WAMessage) {
  const jid = msg.key.remoteJid;
  if (!isPersonalChatJid(jid)) return; // skip groups, broadcasts, status updates
  if (!msg.message) return; // protocol-only events (reactions, ephemeral toggles, message deletes)

  const messageId = msg.key.id ?? undefined;
  if (messageId) {
    // A message the CRM itself just sent through this session echoes back here as `fromMe: true`
    // — already persisted by the send action, so skip it to avoid a duplicate row.
    const existing = await prisma.whatsAppMessage.findFirst({ where: { whatsappMessageId: messageId } });
    if (existing) return;
  }

  const fromMe = !!msg.key.fromMe;
  const digits = jidToDigits(jid);
  const phone = normalizePhone(digits) ?? `+${digits}`;

  const content = msg.message;
  const text =
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.imageMessage?.caption ??
    content.videoMessage?.caption ??
    content.documentMessage?.caption ??
    "";

  let messageType: ParsedMessageType = "text";
  let mediaKey: string | undefined;
  let mediaMimeType: string | undefined;
  let fileName: string | undefined;

  const mediaMsg = content.imageMessage || content.videoMessage || content.audioMessage || content.documentMessage;
  if (mediaMsg) {
    messageType = content.imageMessage
      ? "image"
      : content.videoMessage
        ? "video"
        : content.audioMessage
          ? "audio"
          : "document";
    try {
      const buffer = await downloadMediaMessage(msg, "buffer", {});
      mediaMimeType = mediaMsg.mimetype ?? "application/octet-stream";
      mediaKey = await uploadMedia(`whatsapp-personal/${sessionId}/${messageId ?? Date.now()}`, buffer, mediaMimeType);
      fileName = content.documentMessage?.fileName ?? undefined;
    } catch (err) {
      console.error("Baileys media download failed:", err);
    }
  }

  const defaultStage = await prisma.pipelineStage.findFirst({ where: { pipeline: "SALES", isDefault: true } });
  if (!defaultStage) return;

  let client = await prisma.client.findUnique({ where: { phone } });
  if (!client) {
    client = await prisma.client.create({
      data: { fullName: phone, phone, whatsappId: digits, source: "whatsapp" },
    });
  } else if (client.whatsappId !== digits) {
    client = await prisma.client.update({ where: { id: client.id }, data: { whatsappId: digits } });
  }

  const existingActiveDeal = await prisma.deal.findFirst({
    where: { clientId: client.id, pipelineStage: { isFinal: false } },
    orderBy: { createdAt: "desc" },
  });

  let dealId: string;
  if (existingActiveDeal) {
    dealId = existingActiveDeal.id;
    if (!existingActiveDeal.assignedToId) {
      await prisma.deal.update({ where: { id: dealId }, data: { assignedToId: ownerUserId } });
    }
  } else {
    const deal = await prisma.deal.create({
      data: {
        title: client.phone ?? phone,
        clientId: client.id,
        amount: 0,
        pipelineStageId: defaultStage.id,
        createdById: ownerUserId,
        assignedToId: ownerUserId,
        source: "whatsapp",
        comment: text || undefined,
      },
    });
    dealId = deal.id;
  }

  await prisma.whatsAppMessage.create({
    data: {
      dealId,
      direction: fromMe ? "OUT" : "IN",
      body: text,
      messageType,
      mediaUrl: mediaKey,
      mediaMimeType,
      fileName,
      whatsappMessageId: messageId,
      status: fromMe ? "SENT" : "DELIVERED",
      channel: "PERSONAL",
      sessionId,
      sentById: fromMe ? ownerUserId : null,
    },
  });
}
