import "server-only";

// Kazakh-specific Cyrillic letters that never appear in Russian — their presence is a hard
// signal the text is Kazakh, checked before the broader Cyrillic test below.
const KAZAKH_ONLY_CHARS = /[әғқңөұүһ]/i;
const CYRILLIC_CHARS = /[а-яё]/i;

/**
 * Best-effort language guess for one client message, used to force the AI agent's reply into
 * the same language rather than relying on it to infer this from a rule buried in a 10k+
 * character system prompt. Returns null for text with no Cyrillic signal (numbers, emoji,
 * Latin "ok") — callers should leave the language unconstrained in that case rather than
 * force a guess.
 */
export function detectClientLanguage(text: string): "KK" | "RU" | null {
  if (KAZAKH_ONLY_CHARS.test(text)) return "KK";
  if (CYRILLIC_CHARS.test(text)) return "RU";
  return null;
}
