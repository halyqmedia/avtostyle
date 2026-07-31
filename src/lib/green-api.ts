/** Client name/phone → Green API chatId, e.g. "77011234567@c.us". */
export function toWhatsAppChatId(whatsappId: string | null, phone: string | null): string | null {
  if (whatsappId) return whatsappId;
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `${digits}@c.us`;
}

export async function sendWhatsAppMessage(chatId: string, message: string): Promise<{ idMessage: string }> {
  const baseUrl = process.env.WHATSAPP_API_BASE_URL;
  const instanceId = process.env.WHATSAPP_INSTANCE_ID;
  const token = process.env.WHATSAPP_API_TOKEN;

  if (!baseUrl || !instanceId || !token) {
    throw new Error("WhatsApp провайдері бапталмаған (env айнымалылары жоқ)");
  }

  const res = await fetch(`${baseUrl}/waInstance${instanceId}/sendMessage/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WhatsApp хабарламасы жіберілмеді (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { idMessage?: string };
  if (!data.idMessage) throw new Error("WhatsApp хабарламасы жіберілмеді (жауап дұрыс емес)");
  return { idMessage: data.idMessage };
}
