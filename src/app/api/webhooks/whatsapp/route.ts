import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Green API webhook (https://green-api.com) — configured as the instance's
 * "Webhook URL" in the Green API console. Falls back to a generic
 * provider-agnostic shape ({ clientName, clientPhone, whatsappId, message })
 * for manual testing or a future different provider.
 *
 * Protected by a shared-secret query param since Green API webhooks carry no
 * signature: .../api/webhooks/whatsapp?secret=<WHATSAPP_WEBHOOK_SECRET>
 */

type ParsedMessage = {
  whatsappId: string;
  phone: string;
  senderName: string;
  text: string | undefined;
};

function parseGreenApiPayload(body: Record<string, unknown>): ParsedMessage | null {
  if (body.typeWebhook !== "incomingMessageReceived") return null;

  const senderData = body.senderData as Record<string, unknown> | undefined;
  const messageData = body.messageData as Record<string, unknown> | undefined;
  const chatId = senderData?.chatId;
  if (typeof chatId !== "string" || !chatId.endsWith("@c.us")) return null; // skip groups/broadcasts

  const textMessageData = messageData?.textMessageData as Record<string, unknown> | undefined;
  const extendedTextMessageData = messageData?.extendedTextMessageData as
    | Record<string, unknown>
    | undefined;
  const text =
    (typeof textMessageData?.textMessage === "string" && textMessageData.textMessage) ||
    (typeof extendedTextMessageData?.text === "string" && extendedTextMessageData.text) ||
    undefined;

  const senderName =
    (typeof senderData?.senderContactName === "string" && senderData.senderContactName) ||
    (typeof senderData?.senderName === "string" && senderData.senderName) ||
    "WhatsApp клиент";

  return {
    whatsappId: chatId,
    phone: `+${chatId.replace("@c.us", "")}`,
    senderName,
    text,
  };
}

function parseGenericPayload(body: Record<string, unknown>): ParsedMessage | null {
  const clientPhone = typeof body.clientPhone === "string" ? body.clientPhone : undefined;
  const whatsappId = typeof body.whatsappId === "string" ? body.whatsappId : undefined;
  if (!clientPhone && !whatsappId) return null;

  return {
    whatsappId: whatsappId ?? clientPhone!,
    phone: clientPhone ?? whatsappId!,
    senderName: typeof body.clientName === "string" ? body.clientName : "WhatsApp клиент",
    text: typeof body.message === "string" ? body.message : undefined,
  };
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.WHATSAPP_WEBHOOK_SECRET || secret !== process.env.WHATSAPP_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const event = await prisma.inboundWebhookEvent.create({
    data: { provider: "whatsapp", rawPayload: body as object },
  });

  try {
    const parsed = parseGreenApiPayload(body) ?? parseGenericPayload(body);
    if (!parsed) {
      // Status/service webhooks (outgoingMessageStatus, stateInstanceChanged, etc.) — nothing to do.
      await prisma.inboundWebhookEvent.update({ where: { id: event.id }, data: { processed: true } });
      return NextResponse.json({ ok: true, skipped: true });
    }

    const defaultStage = await prisma.pipelineStage.findFirst({
      where: { pipeline: "SALES", isDefault: true },
    });
    const systemUser = await prisma.user.findFirst({ where: { role: { key: "ADMIN" } } });

    if (!defaultStage || !systemUser) {
      await prisma.inboundWebhookEvent.update({
        where: { id: event.id },
        data: { error: "Pipeline немесе admin қолданушы табылмады" },
      });
      return NextResponse.json({ error: "CRM not fully configured" }, { status: 500 });
    }

    let client = await prisma.client.findFirst({ where: { whatsappId: parsed.whatsappId } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          fullName: parsed.senderName,
          phone: parsed.phone,
          whatsappId: parsed.whatsappId,
          source: "whatsapp",
        },
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
          title: parsed.phone,
          clientId: client.id,
          amount: 0,
          pipelineStageId: defaultStage.id,
          createdById: systemUser.id,
          source: "whatsapp",
          comment: parsed.text,
        },
      });
      dealId = deal.id;
    }

    if (parsed.text) {
      const whatsappMessageId = typeof body.idMessage === "string" ? body.idMessage : undefined;
      await prisma.whatsAppMessage.create({
        data: { dealId, direction: "IN", body: parsed.text, whatsappMessageId },
      });
    }

    await prisma.inboundWebhookEvent.update({
      where: { id: event.id },
      data: { dealId, processed: true },
    });

    return NextResponse.json({ ok: true, dealId }, { status: 201 });
  } catch (err) {
    await prisma.inboundWebhookEvent.update({
      where: { id: event.id },
      data: { error: err instanceof Error ? err.message : "Unknown error" },
    });
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
