import "server-only";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models";

export type ChatTurn = { role: "user" | "model"; text: string };

export interface GeminiReply {
  text: string;
  promptTokens?: number;
  completionTokens?: number;
}

/** Thin REST wrapper — no SDK, matches this project's style of calling external APIs directly. */
export async function callGemini(args: {
  model: string;
  systemPrompt: string;
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
      systemInstruction: { parts: [{ text: args.systemPrompt }] },
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
