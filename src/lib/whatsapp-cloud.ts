import "server-only";

const GRAPH_API = "https://graph.facebook.com/v21.0";

/** Client phone/whatsappId → Cloud API recipient (digits only, no "+", no suffix). */
export function toWhatsAppRecipient(whatsappId: string | null, phone: string | null): string | null {
  const raw = whatsappId ?? phone;
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

function credentials() {
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    throw new Error("WhatsApp провайдері бапталмаған (env айнымалылары жоқ)");
  }
  return { phoneNumberId, token };
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<{ idMessage: string }> {
  const { phoneNumberId, token } = credentials();

  const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: message } }),
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

/**
 * Sends an approved message template — the only Cloud API message type Meta allows outside the
 * 24h customer-service window, so every broadcast/campaign send goes through this, not
 * `sendWhatsAppMessage`. `bodyParams` fill the template's `{{1}}`, `{{2}}`, ... in order.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  language: string,
  bodyParams: string[],
  header?: { format: "IMAGE" | "DOCUMENT"; mediaId: string; fileName?: string },
): Promise<{ idMessage: string }> {
  const { phoneNumberId, token } = credentials();

  const components: Record<string, unknown>[] = [];
  if (header) {
    const mediaKey = header.format === "IMAGE" ? "image" : "document";
    const mediaObject: Record<string, string> = { id: header.mediaId };
    if (header.format === "DOCUMENT" && header.fileName) mediaObject.filename = header.fileName;
    components.push({ type: "header", parameters: [{ type: mediaKey, [mediaKey]: mediaObject }] });
  }
  if (bodyParams.length > 0) {
    components.push({ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) });
  }

  const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        ...(components.length > 0 ? { components } : {}),
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Шаблон хабарламасы жіберілмеді (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { messages?: { id?: string }[] };
  const idMessage = data.messages?.[0]?.id;
  if (!idMessage) throw new Error("Шаблон хабарламасы жіберілмеді (жауап дұрыс емес)");
  return { idMessage };
}

/** Uploads a file to Meta (required before referencing it in a media message) and returns its media id. */
export async function uploadWhatsAppMedia(buffer: Buffer, mimeType: string): Promise<string> {
  const { phoneNumberId, token } = credentials();

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }));

  const res = await fetch(`${GRAPH_API}/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Медиа жүктелмеді (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Медиа жүктелмеді (жауап дұрыс емес)");
  return data.id;
}

type MediaKind = "image" | "document" | "audio" | "video";

export async function sendWhatsAppMedia(
  to: string,
  kind: MediaKind,
  mediaId: string,
  opts: { filename?: string; caption?: string } = {},
): Promise<{ idMessage: string }> {
  const { phoneNumberId, token } = credentials();

  const mediaObject: Record<string, string> = { id: mediaId };
  if (opts.caption && kind !== "audio") mediaObject.caption = opts.caption;
  if (opts.filename && kind === "document") mediaObject.filename = opts.filename;

  const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: kind, [kind]: mediaObject }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WhatsApp медиасы жіберілмеді (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { messages?: { id?: string }[] };
  const idMessage = data.messages?.[0]?.id;
  if (!idMessage) throw new Error("WhatsApp медиасы жіберілмеді (жауап дұрыс емес)");
  return { idMessage };
}

/** Downloads a media file Meta told us about via webhook (media id → temporary CDN URL → bytes). */
export async function downloadWhatsAppMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const { token } = credentials();

  const metaRes = await fetch(`${GRAPH_API}/${mediaId}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!metaRes.ok) throw new Error(`Медиа сілтемесі табылмады (${metaRes.status})`);
  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!meta.url) throw new Error("Медиа сілтемесі табылмады");

  const fileRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } });
  if (!fileRes.ok) throw new Error(`Медиа жүктелмеді (${fileRes.status})`);

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  return { buffer, mimeType: meta.mime_type ?? "application/octet-stream" };
}
