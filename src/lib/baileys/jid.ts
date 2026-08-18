/** Client phone/whatsappId → a Baileys individual-chat JID ("77471234567@s.whatsapp.net"). */
export function toBaileysJid(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? `${digits}@s.whatsapp.net` : null;
}

/** Baileys JID → bare digits (drops the "@s.whatsapp.net"/"@lid" suffix and any device id). */
export function jidToDigits(jid: string): string {
  return jid.split("@")[0].split(":")[0].replace(/\D/g, "");
}

export function isPersonalChatJid(jid: string | null | undefined): jid is string {
  if (!jid) return false;
  return jid.endsWith("@s.whatsapp.net") && jid !== "status@broadcast";
}
