/** Client phone/whatsappId → Cloud API recipient (digits only, no "+", no suffix). */
export function toWhatsAppRecipient(whatsappId: string | null, phone: string | null): string | null {
  const raw = whatsappId ?? phone;
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<{ idMessage: string }> {
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;

  if (!phoneNumberId || !token) {
    throw new Error("WhatsApp провайдері бапталмаған (env айнымалылары жоқ)");
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WhatsApp хабарламасы жіберілмеді (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { messages?: { id?: string }[] };
  const idMessage = data.messages?.[0]?.id;
  if (!idMessage) throw new Error("WhatsApp хабарламасы жіберілмеді (жауап дұрыс емес)");
  return { idMessage };
}
