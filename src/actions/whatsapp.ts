"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertDealAccess } from "@/lib/deal-access";
import { sendWhatsAppMessage, sendWhatsAppMedia, uploadWhatsAppMedia, toWhatsAppRecipient } from "@/lib/whatsapp-cloud";
import { uploadMedia } from "@/lib/media-storage";
import { remuxWebmOpusToOgg } from "@/lib/audio-transcode";

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

  // Voice recordings come in as browser-native Opus-in-WebM, which Meta's media
  // upload rejects outright (not in its accepted mime list for any message type).
  // Re-mux (not re-encode) the same Opus stream into Ogg — the container Meta wants
  // for voice notes — so it sends as a real playable "audio" message, not a document.
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

  let buffer: Buffer = Buffer.from(await file.arrayBuffer());
  let mimeType = file.type || "application/octet-stream";
  if (isVoiceNote) {
    buffer = await remuxWebmOpusToOgg(buffer);
    mimeType = "audio/ogg";
  }

  const mediaId = await uploadWhatsAppMedia(buffer, mimeType);
  const { idMessage } = await sendWhatsAppMedia(recipient, messageType as "image" | "document" | "audio" | "video", mediaId, {
    filename: file.name,
  });

  const bucketKey = await uploadMedia(`whatsapp/out/${idMessage}`, buffer, mimeType);

  await prisma.whatsAppMessage.create({
    data: {
      dealId,
      direction: "OUT",
      body: "",
      messageType,
      mediaUrl: bucketKey,
      mediaMimeType: mimeType,
      fileName: isVoiceNote ? null : file.name,
      whatsappMessageId: idMessage,
      sentById: session.user.id,
    },
  });

  revalidatePath(`/crm/deals/${dealId}`);
}
