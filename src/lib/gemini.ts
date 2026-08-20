import "server-only";
import { createHash } from "node:crypto";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_CACHE_API = "https://generativelanguage.googleapis.com/v1beta/cachedContents";

export type ChatTurn = { role: "user" | "model"; text: string };

export interface GeminiReply {
  text: string;
  promptTokens?: number;
  completionTokens?: number;
}

/** Thin REST wrapper — no SDK, matches this project's style of calling external APIs directly. */
export async function callGemini(args: {
  model: string;
  /** Ignored when `cachedContent` is set — Gemini takes the system instruction from the cache instead. */
  systemPrompt?: string;
  /** Resource name from getOrCreateSystemCache(), e.g. "cachedContents/abc123". */
  cachedContent?: string;
  history: ChatTurn[];
  maxOutputTokens: number;
  /** Forces Gemini to return raw JSON text (no markdown fences) — used for structured analysis calls. */
  jsonMode?: boolean;
}): Promise<GeminiReply> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API кілті бапталмаған (GEMINI_API_KEY жоқ)");

  const res = await fetch(`${GEMINI_API}/${args.model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      ...(args.cachedContent
        ? { cachedContent: args.cachedContent }
        : { systemInstruction: { parts: [{ text: args.systemPrompt ?? "" }] } }),
      contents: args.history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
      generationConfig: {
        maxOutputTokens: args.maxOutputTokens,
        temperature: args.jsonMode ? 0.2 : 0.6,
        ...(args.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API қатесі (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };

  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  return {
    text,
    promptTokens: data.usageMetadata?.promptTokenCount,
    completionTokens: data.usageMetadata?.candidatesTokenCount,
  };
}

/**
 * Transcribes a WhatsApp voice note using Gemini's native audio understanding — no separate
 * speech-to-text service needed. Returns the spoken words as plain text (kazakh or russian,
 * whichever was spoken), or "" if the model produced nothing usable.
 */
export async function transcribeAudio(args: { model: string; audioBuffer: Buffer; mimeType: string }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API кілті бапталмаған (GEMINI_API_KEY жоқ)");

  // WhatsApp reports e.g. "audio/ogg; codecs=opus" — Gemini's inlineData.mimeType wants the bare
  // media type without codec parameters.
  const mimeType = args.mimeType.split(";")[0].trim();

  const res = await fetch(`${GEMINI_API}/${args.model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: args.audioBuffer.toString("base64") } },
            {
              text: "Бұл WhatsApp дауыстық хабарламасы. Онда айтылған сөздерді дәл сол тілде (қазақша немесе орысша, қалай айтылса солай) мәтінге түрлендір. Тек айтылған сөздерді жаз, түсініктеме, тырнақша немесе басқа ешнәрсе қоспа.",
            },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 500, temperature: 0.1 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini дауыс тану қатесі (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

const CACHE_TTL_SECONDS = 3600;
const CACHE_FAILURE_RETRY_MS = 10 * 60 * 1000;

type CacheEntry = { name: string; expiresAt: number } | { failedUntil: number };

// Module-scope: survives across requests within one server instance, which is exactly the
// reuse window that makes caching pay off. Keyed by model+content hash, so an admin editing
// the system prompt in /admin/ai-agent transparently starts a fresh cache — no manual
// invalidation needed, the old entry just goes unused and expires on Google's side.
const cacheRegistry = new Map<string, CacheEntry>();

/**
 * Registers (or reuses) a Gemini context cache for a large, mostly-static system instruction —
 * e.g. the AI agent's system prompt, which is identical across every client's conversation and
 * only changes when an admin edits it. Returns the cache's resource name to pass as
 * `cachedContent` to callGemini(), or null if caching isn't usable right now (no API key, the
 * text is under Gemini's minimum cacheable size for this model, or the API call failed) — callers
 * should fall back to passing `systemPrompt` directly in that case, which behaves exactly as
 * before caching existed.
 */
export async function getOrCreateSystemCache(model: string, systemText: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const key = `${model}::${createHash("sha1").update(systemText).digest("hex")}`;
  const now = Date.now();
  const existing = cacheRegistry.get(key);
  if (existing) {
    if ("name" in existing) {
      if (existing.expiresAt > now) return existing.name;
    } else if (existing.failedUntil > now) {
      return null;
    }
  }

  try {
    const res = await fetch(GEMINI_CACHE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model: `models/${model}`,
        systemInstruction: { parts: [{ text: systemText }] },
        ttl: `${CACHE_TTL_SECONDS}s`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`Gemini context cache skipped (${res.status}): ${errText.slice(0, 200)}`);
      cacheRegistry.set(key, { failedUntil: now + CACHE_FAILURE_RETRY_MS });
      return null;
    }

    const data = (await res.json()) as { name?: string };
    if (!data.name) return null;

    cacheRegistry.set(key, { name: data.name, expiresAt: now + (CACHE_TTL_SECONDS - 120) * 1000 });
    return data.name;
  } catch (err) {
    console.warn("Gemini context cache create failed:", err);
    cacheRegistry.set(key, { failedUntil: now + CACHE_FAILURE_RETRY_MS });
    return null;
  }
}
