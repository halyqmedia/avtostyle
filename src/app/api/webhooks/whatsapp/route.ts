import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

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

type CloudMessage = {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
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

async function handleInboundMessage(msg: CloudMessage, contacts: CloudContact[]): Promise<string | undefined> {
  const waId = msg.from; // digits only, e.g. "77475960696"
  const senderName = contacts.find((c) => c.wa_id === waId)?.profile?.name || "WhatsApp клиент";
  // Media types (image/document/audio/...) get a labeled placeholder for now —
  // downloading and re-hosting Cloud API media is a separate follow-up piece of work.
  const text = msg.type === "text" ? msg.text?.body : `[${msg.type} хабарлама]`;

  const defaultStage = await prisma.pipelineStage.findFirst({
    where: { pipeline: "SALES", isDefault: true },
  });
  const systemUser = await prisma.user.findFirst({ where: { role: { key: "ADMIN" } } });
  if (!defaultStage || !systemUser) return undefined;

  let client = await prisma.client.findFirst({ where: { whatsappId: waId } });
  if (!client) {
    client = await prisma.client.create({
      data: { fullName: senderName, phone: `+${waId}`, whatsappId: waId, source: "whatsapp" },
    });
  }

  const existingActiveDeal = await prisma.deal.findFirst({
    where: { clientId: client.id, pipelineStage: { isFinal: false } },
    orderBy: { createdAt: "desc" },
  });

  let dealId: string;
  if (existingActiveDeal) {
    // Repeat message from a client who already has an open lead — just log it, don't spawn a duplicate.
    dealId = existingActiveDeal.id;
  } else {
    const deal = await prisma.deal.create({
      data: {
        // Temporary placeholder — the assigned manager renames it once they've spoken to the client.
        title: client.phone ?? `+${waId}`,
        clientId: client.id,
        amount: 0,
        pipelineStageId: defaultStage.id,
        createdById: systemUser.id,
        source: "whatsapp",
        comment: text,
      },
    });
    dealId = deal.id;
  }

  await prisma.whatsAppMessage.create({
    data: { dealId, direction: "IN", body: text ?? "", whatsappMessageId: msg.id, status: "DELIVERED" },
  });

  return dealId;
}

async function handleStatusUpdate(status: CloudStatus) {
  const message = await prisma.whatsAppMessage.findFirst({ where: { whatsappMessageId: status.id } });
  if (!message) return;

  await prisma.whatsAppMessage.update({
    where: { id: message.id },
    data: {
      status: status.status.toUpperCase(),
      errorMessage: status.errors?.[0]?.title,
    },
  });
}
