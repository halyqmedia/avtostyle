import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { downloadWhatsAppMedia } from "@/lib/whatsapp-cloud";
import { uploadMedia } from "@/lib/media-storage";
import { normalizePhone } from "@/lib/phone";
import { maybeSendAiReply } from "@/lib/ai-agent";
import { transcribeAudio } from "@/lib/gemini";
import { analyzeDeal } from "@/lib/ai-deal-analysis";
import { findOrCreateLeadForPhone } from "@/lib/lead-intake";
import { markEnrollmentsReplied } from "@/lib/sequence-sender";

/**
 * Meta WhatsApp Cloud API webhook (https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks).
 *
 * GET  — one-time subscription verification: echoes hub.challenge back if
 *        hub.verify_token matches WHATSAPP_CLOUD_VERIFY_TOKEN.
 * POST — incoming messages + delivery status updates. Signed with
 *        X-Hub-Signature-256 (HMAC-SHA256 over the raw body, keyed with
 *        WHATSAPP_CLOUD_APP_SECRET) — Meta gives no other way to verify
 *        the sender, so an unverifiable request is rejected outright.
 */

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === process.env.WHATSAPP_CLOUD_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_CLOUD_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;

  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

type CloudContact = { profile?: { name?: string }; wa_id?: string };

type CloudMedia = { id: string; mime_type?: string; caption?: string; filename?: string };

type CloudMessage = {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  image?: CloudMedia;
  document?: CloudMedia;
  audio?: CloudMedia;
  video?: CloudMedia;
  button?: { text: string; payload: string }; // quick-reply tap on a template message
};

type CloudStatus = {
  id: string;
  status: string; // sent | delivered | read | failed
  errors?: { title?: string }[];
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!isValidSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = await prisma.inboundWebhookEvent.create({
    data: { provider: "whatsapp", rawPayload: payload as object },
  });

  try {
    const body = payload as {
      entry?: { changes?: { value?: Record<string, unknown> }[] }[];
    };
    const changes = body.entry?.flatMap((e) => e.changes ?? []) ?? [];

    let lastDealId: string | undefined;

    for (const change of changes) {
      const value = change.value ?? {};
      const contacts = (value.contacts as CloudContact[]) ?? [];
      const messages = (value.messages as CloudMessage[]) ?? [];
      const statuses = (value.statuses as CloudStatus[]) ?? [];

      for (const msg of messages) {
        const dealId = await handleInboundMessage(msg, contacts);
        if (dealId) lastDealId = dealId;
      }
      for (const status of statuses) {
        await handleStatusUpdate(status);
      }
    }

    await prisma.inboundWebhookEvent.update({
      where: { id: event.id },
      data: { dealId: lastDealId, processed: true },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    await prisma.inboundWebhookEvent.update({
      where: { id: event.id },
      data: { error: err instanceof Error ? err.message : "Unknown error" },
    });
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}

const MEDIA_KINDS = ["image", "document", "audio", "video"] as const;

async function handleInboundMessage(msg: CloudMessage, contacts: CloudContact[]): Promise<string | undefined> {
  const waId = msg.from; // digits only, e.g. "77475960696"
  const senderName = contacts.find((c) => c.wa_id === waId)?.profile?.name || "WhatsApp клиент";

  const isMedia = (MEDIA_KINDS as readonly string[]).includes(msg.type);
  const media = isMedia ? (msg[msg.type as (typeof MEDIA_KINDS)[number]] as CloudMedia | undefined) : undefined;

  let mediaKey: string | undefined;
  let mediaMimeType: string | undefined;
  let audioTranscript: string | undefined;
  if (media) {
    const { buffer, mimeType } = await downloadWhatsAppMedia(media.id);
    mediaKey = await uploadMedia(`whatsapp/in/${msg.id}`, buffer, mimeType);
    mediaMimeType = mimeType;

    if (msg.type === "audio") {
      try {
        const settings = await prisma.aiSettings.findUnique({ where: { id: "default" } });
        if (settings?.enabled) {
          audioTranscript = await transcribeAudio({ model: settings.model, audioBuffer: buffer, mimeType });
        }
      } catch (err) {
        console.error("Audio transcription failed:", msg.id, err);
      }
    }
  }

  const text =
    msg.type === "text"
      ? msg.text?.body
      : msg.type === "button"
        ? msg.button?.text
        : msg.type === "audio"
          ? audioTranscript || media?.caption
          : media?.caption;

  const systemUser = await prisma.user.findFirst({ where: { role: { key: "ADMIN" } } });
  if (!systemUser) return undefined;

  const phone = normalizePhone(waId) ?? `+${waId}`;
  // wa_id format can change between providers (e.g. Green API "xxx@c.us" -> Cloud API "xxx") —
  // findOrCreateLeadForPhone heals whatsappId so this client keeps matching by phone regardless.
  const { dealId } = await findOrCreateLeadForPhone({
    phone,
    whatsappDigits: waId,
    fallbackName: senderName,
    source: "whatsapp",
    createdById: systemUser.id,
    // Temporary placeholder title — the assigned manager renames it once they've spoken to the client.
    dealTitle: phone,
    dealComment: text,
  });

  await prisma.whatsAppMessage.create({
    data: {
      dealId,
      direction: "IN",
      body: text ?? "",
      messageType: msg.type,
      mediaUrl: mediaKey,
      mediaMimeType,
      fileName: media?.filename,
      whatsappMessageId: msg.id,
      status: "DELIVERED",
    },
  });

  // Any reply — including a quick-reply button tap — stops a running drip sequence for this
  // contact; the whole point of a sequence is to back off once the person actually responds.
  await markEnrollmentsReplied(phone).catch((err) => console.error("markEnrollmentsReplied failed:", err));

  if (msg.type === "text" || msg.type === "button" || (msg.type === "audio" && audioTranscript)) {
    // Best-effort: an AI/WhatsApp-send failure here must not mark this inbound message
    // (already safely stored above) as a failed webhook event.
    try {
      await maybeSendAiReply(dealId);
    } catch (err) {
      console.error("AI agent reply failed:", err);
    }
    try {
      await analyzeDeal(dealId);
    } catch (err) {
      console.error("AI deal analysis failed:", err);
    }
  }

  return dealId;
}

async function handleStatusUpdate(status: CloudStatus) {
  const normalizedStatus = status.status.toUpperCase();
  const errorMessage = status.errors?.[0]?.title;

  const message = await prisma.whatsAppMessage.findFirst({ where: { whatsappMessageId: status.id } });
  if (message) {
    await prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: { status: normalizedStatus, errorMessage },
    });
  }

  // Mirror delivery status onto the campaign recipient row, if this message was a broadcast send.
  await prisma.campaignRecipient
    .updateMany({ where: { whatsappMessageId: status.id }, data: { status: normalizedStatus, errorMessage } })
    .catch(() => {});
}
