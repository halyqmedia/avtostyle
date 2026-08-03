"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertDealAccess } from "@/lib/deal-access";
import { sendWhatsAppMessage, sendWhatsAppMedia, uploadWhatsAppMedia, toWhatsAppRecipient } from "@/lib/whatsapp-cloud";
import { uploadMedia } from "@/lib/media-storage";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const META_AUDIO_TYPES = new Set(["audio/aac", "audio/mp4", "audio/mpeg", "audio/amr", "audio/ogg"]);
const META_VIDEO_TYPES = new Set(["video/mp4", "video/3gpp"]);
const MAX_FILE_BYTES = 16 * 1024 * 1024;

export async function sendDealWhatsAppMessage(dealId: string, body: string) {
  const { session, deal } = await assertDealAccess(dealId);
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Хабарлама бос болмауы керек");

  const client = await prisma.client.findUnique({ where: { id: deal.clientId } });
  const recipient = toWhatsAppRecipient(client?.whatsappId ?? null, client?.phone ?? null);
  if (!recipient) throw new Error("Клиенттің WhatsApp/телефон нөмірі көрсетілмеген");

  const { idMessage } = await sendWhatsAppMessage(recipient, trimmed);

  await prisma.whatsAppMessage.create({
    data: {
      dealId,
      direction: "OUT",
      body: trimmed,
      whatsappMessageId: idMessage,
      sentById: session.user.id,
    },
  });

  revalidatePath(`/crm/deals/${dealId}`);
}

export async function sendDealWhatsAppFile(dealId: string, formData: FormData) {
  const { session, deal } = await assertDealAccess(dealId);

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Файл табылмады");
  if (file.size > MAX_FILE_BYTES) throw new Error("Файл тым үлкен (16MB-тан аспауы керек)");

  const client = await prisma.client.findUnique({ where: { id: deal.clientId } });
  const recipient = toWhatsAppRecipient(client?.whatsappId ?? null, client?.phone ?? null);
  if (!recipient) throw new Error("Клиенттің WhatsApp/телефон нөмірі көрсетілмеген");

  // Voice recordings come in as browser-native webm/opus, which Meta's "audio" message
  // type doesn't accept — sent as a document instead so delivery is reliable, but we still
  // label it "audio" in our own UI so the chat renders it with a player, not a file icon.
  const isVoiceNote = formData.get("isVoiceNote") === "1";
  const messageType = isVoiceNote
    ? "audio"
    : IMAGE_TYPES.has(file.type)
      ? "image"
      : META_AUDIO_TYPES.has(file.type)
        ? "audio"
        : META_VIDEO_TYPES.has(file.type)
          ? "video"
          : "document";
  const sendKind = isVoiceNote ? "document" : (messageType as "image" | "document" | "audio" | "video");

  const buffer = Buffer.from(await file.arrayBuffer());
  const mediaId = await uploadWhatsAppMedia(buffer, file.type || "application/octet-stream");
  const { idMessage } = await sendWhatsAppMedia(recipient, sendKind, mediaId, { filename: file.name });

  const bucketKey = await uploadMedia(`whatsapp/out/${idMessage}`, buffer, file.type || "application/octet-stream");

  await prisma.whatsAppMessage.create({
    data: {
      dealId,
      direction: "OUT",
      body: "",
      messageType,
      mediaUrl: bucketKey,
      mediaMimeType: file.type || null,
      fileName: isVoiceNote ? null : file.name,
      whatsappMessageId: idMessage,
      sentById: session.user.id,
    },
  });

  revalidatePath(`/crm/deals/${dealId}`);
}
