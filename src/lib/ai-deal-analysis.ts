import "server-only";
import { prisma } from "@/lib/prisma";
import { callGemini } from "@/lib/gemini";
import { writeStageHistory } from "@/lib/stage-history";
import { notifyManagerHotLead } from "@/lib/manager-notify";

const TEMPERATURES = new Set(["HOT", "WARM", "COLD"]);

type RawAnalysis = {
  temperature?: string;
  summary?: string;
  signals?: string[];
  nextAction?: string;
  stageKey?: string;
};

/**
 * Runs after an AI (or manual) reply on a deal's WhatsApp thread. Reads the conversation so far
 * and asks Gemini for a manager-facing read: how hot the lead is, a short status summary, a
 * concrete next step, and — conservatively — whether the deal should move to a different
 * non-final pipeline stage. Never moves a deal into (or out of) a final stage: marking a deal
 * won/lost is a human call, not something the agent decides on its own.
 */
export async function analyzeDeal(dealId: string): Promise<void> {
  const settings = await prisma.aiSettings.findUnique({ where: { id: "default" } });
  if (!settings?.enabled) return;

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { client: true, pipelineStage: true },
  });
  if (!deal || !deal.aiEnabled || deal.pipelineStage.isFinal) return;

  const stages = await prisma.pipelineStage.findMany({
    where: { pipeline: "SALES", isFinal: false },
    orderBy: { order: "asc" },
  });

  const recentMessages = await prisma.whatsAppMessage.findMany({
    where: { dealId, messageType: { in: ["text", "audio"] }, body: { not: "" } },
    orderBy: { createdAt: "desc" },
    take: settings.maxHistoryMessages,
  });
  if (recentMessages.length === 0) return;
  recentMessages.reverse();

  const transcript = recentMessages
    .map((m) => `${m.direction === "IN" ? "Клиент" : "Менеджер/ИИ"}: ${m.body}`)
    .join("\n");
  const stageList = stages.map((s) => `- "${s.key}" — ${s.name}`).join("\n");

  const prompt = [
    "Сен CRM ішіндегі сату аналитигісің. Төмендегі WhatsApp хат-хабарын оқып, менеджерге арналған қысқа талдау жаса.",
    "",
    `Клиент: ${deal.client.fullName}`,
    `Ағымдағы кезең: "${deal.pipelineStage.key}" (${deal.pipelineStage.name})`,
    "",
    "Ауыстыруға болатын кезеңдер (тек осы тізімнен таңда, өзгертпеу керек болса ағымдағы key-ді қайтар):",
    stageList,
    "",
    "Хат-хабар (ескіден жаңаға қарай):",
    transcript,
    "",
    "Тек мына өрістері бар JSON объект қайтар, басқа мәтін жазба:",
    '{"temperature": "HOT" | "WARM" | "COLD", "summary": "қазақша, 2-3 сөйлем", "signals": ["хат-хабардан алынған қысқа, нақты факт", "..."], "nextAction": "менеджерге нақты кеңес, қазақша, 1-2 сөйлем", "stageKey": "жоғарыдағы тізімнен key"}',
    "",
    'temperature: HOT — сатып алуға дайын/бағаны талқылап жатыр, WARM — қызығушылық бар бірақ шешім жоқ, COLD — қызықпаған/жауап бермей жатыр.',
    "signals: 2-4 қысқа факт (әрқайсысы 4-6 сөзден аспасын), тек хат-хабарда нақты айтылған нәрселер, болжам емес.",
  ].join("\n");

  let parsed: RawAnalysis;
  try {
    const reply = await callGemini({
      model: settings.model,
      systemPrompt: "Сен тек сұралған форматта валидты JSON қайтаратын сату аналитигісің.",
      history: [{ role: "user", text: prompt }],
      maxOutputTokens: 400,
      jsonMode: true,
    });
    if (!reply.text) return;
    parsed = JSON.parse(reply.text) as RawAnalysis;
  } catch (err) {
    console.error("AI deal analysis failed:", err);
    return;
  }

  const temperature = TEMPERATURES.has(parsed.temperature ?? "") ? parsed.temperature! : null;
  const summary = parsed.summary?.trim() || null;
  const nextAction = parsed.nextAction?.trim() || null;
  const signals = Array.isArray(parsed.signals)
    ? parsed.signals.map((s) => String(s).trim()).filter(Boolean).slice(0, 6)
    : [];
  if (!temperature && !summary && !nextAction) return;

  const targetStage = stages.find((s) => s.key === parsed.stageKey);
  const shouldMoveStage = Boolean(targetStage && targetStage.id !== deal.pipelineStageId);

  const becameHot = temperature === "HOT" && deal.aiTemperature !== "HOT";
  const cooledDown = temperature !== "HOT" && deal.aiTemperature === "HOT";

  await prisma.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: dealId },
      data: {
        aiTemperature: temperature,
        aiSummary: summary,
        aiSignals: signals,
        aiNextAction: nextAction,
        aiAnalyzedAt: new Date(),
        // Restarts the 2-hour escalation clock on a fresh HOT read; clears it once the lead
        // cools back down so a stale escalation flag doesn't linger into the next hot streak.
        ...(becameHot ? { aiHotSince: new Date(), aiEscalatedAt: null } : {}),
        ...(cooledDown ? { aiHotSince: null, aiEscalatedAt: null } : {}),
        ...(shouldMoveStage ? { pipelineStageId: targetStage!.id } : {}),
      },
    });

    if (shouldMoveStage) {
      await writeStageHistory(tx, {
        entityType: "DEAL",
        entityId: dealId,
        fromStageId: deal.pipelineStageId,
        toStageId: targetStage!.id,
        movedById: deal.assignedToId ?? deal.createdById,
        note: `🤖 ИИ агент автоматты ауыстырды: ${summary ?? "сөйлесу барысы негізінде"}`,
      });
    }
  });

  if (becameHot) {
    await notifyManagerHotLead(deal).catch((err) => console.error("Hot lead notify failed:", err));
  }
}
