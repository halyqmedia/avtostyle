import "server-only";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, toWhatsAppRecipient } from "@/lib/whatsapp-cloud";
import { callGemini } from "@/lib/gemini";

/**
 * Runs after a new inbound WhatsApp message is stored. Generates and sends a reply via
 * Gemini if the AI agent is globally enabled, this specific deal is AI-managed, and the
 * deal isn't already closed. Failures are the caller's responsibility to catch — this
 * must never take down webhook processing (a manager can always take over manually).
 */
export async function maybeSendAiReply(dealId: string): Promise<void> {
  const settings = await prisma.aiSettings.findUnique({ where: { id: "default" } });
  if (!settings?.enabled) return;

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { client: true, pipelineStage: true },
  });
  if (!deal || !deal.aiEnabled || deal.pipelineStage.isFinal) return;

  const recentMessages = await prisma.whatsAppMessage.findMany({
    where: { dealId, messageType: "text" },
    orderBy: { createdAt: "desc" },
    take: settings.maxHistoryMessages,
  });
  if (recentMessages.length === 0) return;
  recentMessages.reverse();

  // Only reply if the newest message is inbound — stops the agent replying to its own
  // last message again, or talking over a manager who just answered manually.
  if (recentMessages[recentMessages.length - 1].direction !== "IN") return;

  const products = await prisma.product.findMany({
    where: { isActive: true, category: "finished" },
    orderBy: { name: "asc" },
    take: 30,
  });
  const catalogLine = products.map((p) => `${p.name} — ${Number(p.price)}₸`).join("; ");

  const systemPrompt = [
    settings.systemPrompt,
    "",
    `Тауар каталогы: ${catalogLine || "каталог бос"}.`,
    `Клиенттің аты: ${deal.client.fullName}.`,
  ].join("\n");

  const history = recentMessages.map((m) => ({
    role: (m.direction === "IN" ? "user" : "model") as "user" | "model",
    text: m.body,
  }));

  const reply = await callGemini({
    model: settings.model,
    systemPrompt,
    history,
    maxOutputTokens: settings.maxOutputTokens,
  });
  if (!reply.text) return;

  const recipient = toWhatsAppRecipient(deal.client.whatsappId, deal.client.phone);
  if (!recipient) return;

  const { idMessage } = await sendWhatsAppMessage(recipient, reply.text);

  await prisma.whatsAppMessage.create({
    data: {
      dealId,
      direction: "OUT",
      body: reply.text,
      whatsappMessageId: idMessage,
      aiGenerated: true,
      promptTokens: reply.promptTokens,
      completionTokens: reply.completionTokens,
    },
  });
}
