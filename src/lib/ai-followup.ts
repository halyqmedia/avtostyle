import "server-only";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, toWhatsAppRecipient, type WhatsAppCredentials } from "@/lib/whatsapp-cloud";
import { callGemini, type ChatTurn } from "@/lib/gemini";

const FOLLOWUP_HOURS = 4; // hours of client silence after our last message before nudging
const MAX_FOLLOWUPS = 2; // caps nudges per silence streak — matches the script's "no more than 3 outbound in a row" rule (1 reply + 2 follow-ups)
const CLOUD_API_WINDOW_MS = 24 * 60 * 60 * 1000; // Meta only allows free-form sends within 24h of the customer's last inbound message — outside it only an approved template can reach them
const SCAN_LIMIT = 300; // candidates scanned per poll tick

const FOLLOWUP_INSTRUCTION = `

Клиент соңғы хабарламаңа әлі жауап берген жоқ — біраз уақыт үнсіз тұр. Қысқа, табиғи, бір сөйлемдік еске салу хабарламасы жаз: бұрын айтылғанды қайталама, жаңа ақпарат қоспа, тек назарын қайта аудар (мыс. "Осы сұрақ бойынша не дейсіз?" немесе қалада орын әлі ашық екенін еске салу). Клиент қай тілде жазған болса, сол тілде жаз. Тек хабарлама мәтінін қайтар, басқа ешнәрсе жазба (JSON емес, тырнақшасыз, түсініктемесіз).`;

/**
 * Polled periodically (see instrumentation.ts). Finds AI-managed deals whose most recent
 * WhatsApp message is ours (the client went silent) and it's been FOLLOWUP_HOURS since —
 * then asks Gemini for one short natural nudge and sends it, same voice as the main AI agent.
 *
 * Only nudges deals with at least one inbound message still inside Meta's 24h free-form
 * window (anchored to the client's last inbound message) — a lead who never replied at all
 * needs an approved WhatsApp template to be re-contacted (see Sequence/Campaign), not a plain
 * text send, which Meta would reject outside that window.
 */
export async function processAiFollowUps(): Promise<void> {
  const cutoff = new Date(Date.now() - FOLLOWUP_HOURS * 60 * 60 * 1000);

  const candidates = await prisma.deal.findMany({
    where: {
      aiEnabled: true,
      pipelineStage: { isFinal: false },
      whatsappMessages: { some: {} },
    },
    include: {
      client: true,
      pipelineStage: true,
      whatsappNumber: true,
      whatsappMessages: { orderBy: { createdAt: "desc" }, take: 30 },
    },
    take: SCAN_LIMIT,
  });

  for (const deal of candidates) {
    const messages = deal.whatsappMessages; // newest first
    const lastMessage = messages[0];
    if (!lastMessage || lastMessage.direction !== "OUT") continue; // client already has the last word
    if (lastMessage.createdAt > cutoff) continue; // not silent long enough yet

    // Count the run of outbound messages since the client's last inbound one — the first of
    // that run is our original reply, everything after it is a previously-sent nudge.
    let trailingOutCount = 0;
    let lastInboundAt: Date | null = null;
    for (const m of messages) {
      if (m.direction === "OUT") trailingOutCount++;
      else {
        lastInboundAt = m.createdAt;
        break;
      }
    }
    if (trailingOutCount - 1 >= MAX_FOLLOWUPS) continue; // already nudged the max number of times this streak
    if (!lastInboundAt || Date.now() - lastInboundAt.getTime() > CLOUD_API_WINDOW_MS) continue;

    const settings = await prisma.funnel.findUnique({ where: { key: deal.pipelineStage.pipeline } });
    if (!settings?.aiEnabled) continue;

    const recipient = toWhatsAppRecipient(deal.client.whatsappId, deal.client.phone);
    if (!recipient) continue;

    const credentials: WhatsAppCredentials | undefined =
      deal.whatsappNumber?.accessToken
        ? { phoneNumberId: deal.whatsappNumber.phoneNumberId, token: deal.whatsappNumber.accessToken }
        : undefined;

    const history: ChatTurn[] = messages
      .slice()
      .reverse()
      .filter((m) => m.messageType === "text" || m.messageType === "audio")
      .filter((m) => m.body !== "")
      .map((m) => ({ role: m.direction === "IN" ? "user" : "model", text: m.body }));
    if (history.length === 0) continue;

    try {
      const reply = await callGemini({
        model: settings.model,
        systemPrompt: [settings.systemPrompt, FOLLOWUP_INSTRUCTION].join("\n"),
        history,
        maxOutputTokens: 120,
      });
      const text = reply.text?.trim();
      if (!text) continue;

      const { idMessage } = await sendWhatsAppMessage(recipient, text, credentials);

      await prisma.whatsAppMessage.create({
        data: {
          dealId: deal.id,
          direction: "OUT",
          body: text,
          whatsappMessageId: idMessage,
          aiGenerated: true,
          promptTokens: reply.promptTokens,
          completionTokens: reply.completionTokens,
        },
      });
    } catch (err) {
      console.error("AI follow-up send failed:", deal.id, err);
    }
  }
}
