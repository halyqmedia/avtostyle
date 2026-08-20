"use server";

import { prisma } from "@/lib/prisma";
import { assertDealAccess } from "@/lib/deal-access";
import { callGemini, type ChatTurn } from "@/lib/gemini";

/**
 * Manager-facing Q&A about one deal — completely separate from the client-facing WhatsApp
 * thread. Nothing asked or answered here is ever sent to the client; it's an internal sounding
 * board built from the same conversation context the AI copilot panel already reads.
 */
export async function askAiAboutDeal(dealId: string, question: string, history: ChatTurn[]): Promise<string> {
  await assertDealAccess(dealId);

  const settings = await prisma.aiSettings.findUnique({ where: { id: "default" } });
  if (!settings?.enabled) throw new Error("ИИ агент өшірулі");

  const trimmed = question.trim();
  if (!trimmed) throw new Error("Сұрақ бос болмауы керек");

  const deal = await prisma.deal.findUniqueOrThrow({
    where: { id: dealId },
    include: { client: true, pipelineStage: true },
  });

  const recentMessages = await prisma.whatsAppMessage.findMany({
    where: { dealId, messageType: { in: ["text", "audio"] }, body: { not: "" } },
    orderBy: { createdAt: "desc" },
    take: settings.maxHistoryMessages,
  });
  recentMessages.reverse();
  const transcript =
    recentMessages.map((m) => `${m.direction === "IN" ? "Клиент" : "Менеджер/ИИ"}: ${m.body}`).join("\n") ||
    "(хат-хабар әлі жоқ)";

  const systemPrompt = [
    "Сен менеджерге көмектесетін ішкі CRM көмекшісісің. Клиентпен ЕШҚАШАН тікелей сөйлеспейсің — тек " +
      "менеджердің осы сделка бойынша сұрағына жауап бересің, ол жауап клиентке жіберілмейді.",
    "",
    `Клиент: ${deal.client.fullName}`,
    `Кезең: ${deal.pipelineStage.name}`,
    deal.aiSummary ? `Соңғы ИИ қорытындысы: ${deal.aiSummary}` : null,
    "",
    "WhatsApp хат-хабары:",
    transcript,
    "",
    "Менеджердің сұрағына қысқа әрі нақты жауап бер.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const reply = await callGemini({
    model: settings.model,
    systemPrompt,
    history: [...history, { role: "user", text: trimmed }],
    maxOutputTokens: 400,
  });

  return reply.text || "Жауап алынбады, қайталап көріңіз.";
}
