import "server-only";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, sendWhatsAppMedia, uploadWhatsAppMedia, toWhatsAppRecipient } from "@/lib/whatsapp-cloud";
import { downloadMedia } from "@/lib/media-storage";
import { callGemini, getOrCreateSystemCache, type ChatTurn } from "@/lib/gemini";

type RawReply = {
  reply?: string;
  sendDocument?: string | null;
  language?: string;
};

const DOCUMENT_FORMAT_INSTRUCTIONS = `

Жауапты МІНДЕТТІ түрде тек мына өрістері бар JSON объект түрінде қайтар, басқа мәтін жазба:
{"reply": "клиентке жіберілетін хабарлама мәтіні (жоғарыдағы ережелерге сай, WhatsApp-қа сай қысқа)", "sendDocument": "KP" | "CATALOG" | null, "language": "KK" | "RU"}

sendDocument ережелері:
- Клиент коммерциялық ұсыныс/КП/баға парағы/шарттар туралы толық құжат сұраса — "KP".
- Клиент каталог/тауар тізімі/фото/модельдер тізімі туралы сұраса — "CATALOG".
- Басқа жағдайда — null.
- Бір сөйлесуде бұрын жіберілген құжатты клиент нақты қайта сұрамаса, қайта-қайта жібермеу.
language: осы жауап қай тілде жазылғанын көрсет ("KK" — қазақша, "RU" — орысша) — файл сол тілде таңдалады.`;

async function sendAiDocument(
  dealId: string,
  recipient: string,
  kind: "KP" | "CATALOG",
  language: "KK" | "RU",
): Promise<void> {
  const settings = await prisma.aiSettings.findUnique({ where: { id: "default" } });
  if (!settings) return;

  const mediaKey =
    kind === "KP"
      ? language === "RU"
        ? settings.kpMediaKeyRu
        : settings.kpMediaKeyKk
      : language === "RU"
        ? settings.catalogMediaKeyRu
        : settings.catalogMediaKeyKk;
  if (!mediaKey) return; // admin hasn't uploaded this file yet — skip quietly, text reply already sent

  const fileName =
    kind === "KP"
      ? language === "RU"
        ? "AVTOSTYLE_KP.pdf"
        : "AVTOSTYLE_KP_kaz.pdf"
      : language === "RU"
        ? "AVTOSTYLE_katalog.pdf"
        : "AVTOSTYLE_katalog_kaz.pdf";

  try {
    const buffer = await downloadMedia(mediaKey);
    const mediaId = await uploadWhatsAppMedia(buffer, "application/pdf");
    const { idMessage } = await sendWhatsAppMedia(recipient, "document", mediaId, { filename: fileName });

    await prisma.whatsAppMessage.create({
      data: {
        dealId,
        direction: "OUT",
        body: "",
        messageType: "document",
        mediaUrl: mediaKey,
        mediaMimeType: "application/pdf",
        fileName,
        whatsappMessageId: idMessage,
        aiGenerated: true,
      },
    });
  } catch (err) {
    console.error("AI document send failed:", dealId, kind, language, err);
  }
}

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
    // "audio" messages carry their Gemini-transcribed text in `body`, same as a typed message —
    // included here so the agent can react to voice notes, not just text.
    where: { dealId, messageType: { in: ["text", "audio"] }, body: { not: "" } },
    orderBy: { createdAt: "desc" },
    take: settings.maxHistoryMessages,
  });
  if (recentMessages.length === 0) return;
  recentMessages.reverse();

  // Only reply if the newest message is inbound — stops the agent replying to its own
  // last message again, or talking over a manager who just answered manually.
  if (recentMessages[recentMessages.length - 1].direction !== "IN") return;

  // No product-catalog injection here on purpose: the agent's offer (dealer program, pricing
  // tiers, terms) lives entirely in settings.systemPrompt now — the old per-unit retail Product
  // table is B2C EVA/3D pricing, unrelated to (and actively confusable with) that offer.
  //
  // This block (settings.systemPrompt + DOCUMENT_FORMAT_INSTRUCTIONS) is identical across every
  // client's conversation and only changes when an admin edits it in /admin/ai-agent — the ideal
  // shape for a Gemini context cache, since this is the highest-volume call site (runs on every
  // inbound WhatsApp message). Per-client detail (the name) can't live in the cached text, so it
  // rides along as a small priming turn in `contents` instead.
  const cacheableSystemPrompt = [settings.systemPrompt, DOCUMENT_FORMAT_INSTRUCTIONS].join("\n");
  const cachedContent = await getOrCreateSystemCache(settings.model, cacheableSystemPrompt);

  const conversationHistory: ChatTurn[] = recentMessages.map((m) => ({
    role: m.direction === "IN" ? "user" : "model",
    text: m.body,
  }));

  const history: ChatTurn[] = cachedContent
    ? [
        { role: "user", text: `[Контекст: клиенттің аты — ${deal.client.fullName}]` },
        { role: "model", text: "Түсінікті." },
        ...conversationHistory,
      ]
    : conversationHistory;

  const reply = await callGemini({
    model: settings.model,
    ...(cachedContent
      ? { cachedContent }
      : {
          systemPrompt: [
            settings.systemPrompt,
            "",
            `Клиенттің аты: ${deal.client.fullName}.`,
            DOCUMENT_FORMAT_INSTRUCTIONS,
          ].join("\n"),
        }),
    history,
    maxOutputTokens: settings.maxOutputTokens + 60, // JSON envelope overhead on top of the reply itself
    jsonMode: true,
  });
  if (!reply.text) return;

  let parsed: RawReply;
  try {
    parsed = JSON.parse(reply.text) as RawReply;
  } catch {
    // Model didn't follow the JSON envelope — fall back to treating the raw text as the reply
    // rather than dropping it silently.
    parsed = { reply: reply.text, sendDocument: null, language: "KK" };
  }

  const replyText = parsed.reply?.trim();
  if (!replyText) return;

  const recipient = toWhatsAppRecipient(deal.client.whatsappId, deal.client.phone);
  if (!recipient) return;

  const { idMessage } = await sendWhatsAppMessage(recipient, replyText);

  await prisma.whatsAppMessage.create({
    data: {
      dealId,
      direction: "OUT",
      body: replyText,
      whatsappMessageId: idMessage,
      aiGenerated: true,
      promptTokens: reply.promptTokens,
      completionTokens: reply.completionTokens,
    },
  });

  if (parsed.sendDocument === "KP" || parsed.sendDocument === "CATALOG") {
    const language = parsed.language === "RU" ? "RU" : "KK";
    await sendAiDocument(dealId, recipient, parsed.sendDocument, language);
  }
}
