import "server-only";

const GRAPH_API = "https://graph.facebook.com/v21.0";

function wabaCredentials() {
  const wabaId = process.env.WHATSAPP_CLOUD_WABA_ID;
  const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
  if (!wabaId || !token) throw new Error("WhatsApp WABA бапталмаған (env айнымалылары жоқ)");
  return { wabaId, token };
}

/** Pulls the `{{1}}`, `{{2}}`, ... placeholders out of a template body, in order. */
export function extractTemplateVariables(bodyText: string): number[] {
  const matches = [...bodyText.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  return matches;
}

let cachedAppId: string | null = null;

/** The Meta App ID behind our access token — the Resumable Upload API needs it, but we don't store it directly. */
async function resolveAppId(): Promise<string> {
  if (cachedAppId) return cachedAppId;
  const { token } = wabaCredentials();

  const res = await fetch(`${GRAPH_API}/debug_token?input_token=${token}&access_token=${token}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`App ID анықталмады (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { data?: { app_id?: string } };
  if (!data.data?.app_id) throw new Error("App ID анықталмады (жауап дұрыс емес)");
  cachedAppId = data.data.app_id;
  return cachedAppId;
}

/**
 * Uploads a file via Meta's Resumable Upload API and returns a `header_handle` — the format a
 * template's HEADER example (and only the example) needs at creation time. Two-step handshake:
 * open a session sized for the file, then push the bytes into it.
 */
export async function uploadResumableExample(buffer: Buffer, mimeType: string): Promise<string> {
  const { token } = wabaCredentials();
  const appId = await resolveAppId();

  const startRes = await fetch(
    `${GRAPH_API}/${appId}/uploads?file_length=${buffer.length}&file_type=${encodeURIComponent(mimeType)}&access_token=${token}`,
    { method: "POST" },
  );
  if (!startRes.ok) {
    const text = await startRes.text().catch(() => "");
    throw new Error(`Мысал файл жүктеу сессиясы ашылмады (${startRes.status}): ${text.slice(0, 300)}`);
  }
  const startData = (await startRes.json()) as { id?: string };
  if (!startData.id) throw new Error("Мысал файл жүктеу сессиясы ашылмады (жауап дұрыс емес)");

  const pushRes = await fetch(`${GRAPH_API}/${startData.id}`, {
    method: "POST",
    headers: { Authorization: `OAuth ${token}`, file_offset: "0" },
    body: new Uint8Array(buffer),
  });
  if (!pushRes.ok) {
    const text = await pushRes.text().catch(() => "");
    throw new Error(`Мысал файл жүктелмеді (${pushRes.status}): ${text.slice(0, 300)}`);
  }
  const pushData = (await pushRes.json()) as { h?: string };
  if (!pushData.h) throw new Error("Мысал файл жүктелмеді (handle қайтпады)");
  return pushData.h;
}

/**
 * Submits a message template to Meta for review. Returns immediately with a PENDING status —
 * approval (or rejection) happens asynchronously on Meta's side, checked later via
 * `fetchMetaTemplateStatus`. `examples` must have one realistic value per `{{n}}` placeholder,
 * in order — Meta requires them to review the template. `header` is optional — an approved
 * example image/document, already uploaded via `uploadResumableExample`.
 */
export async function createMetaTemplate(opts: {
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY";
  bodyText: string;
  examples: string[];
  header?: { format: "IMAGE" | "DOCUMENT"; handle: string };
  footerText?: string;
  buttons?: string[]; // quick-reply labels, ≤25 chars each, max 3
}): Promise<{ metaTemplateId: string; status: string }> {
  const { wabaId, token } = wabaCredentials();

  const components: Record<string, unknown>[] = [];
  if (opts.header) {
    components.push({
      type: "HEADER",
      format: opts.header.format,
      example: { header_handle: [opts.header.handle] },
    });
  }
  components.push({
    type: "BODY",
    text: opts.bodyText,
    ...(opts.examples.length > 0 ? { example: { body_text: [opts.examples] } } : {}),
  });
  if (opts.footerText) {
    components.push({ type: "FOOTER", text: opts.footerText });
  }
  if (opts.buttons && opts.buttons.length > 0) {
    components.push({
      type: "BUTTONS",
      buttons: opts.buttons.map((text) => ({ type: "QUICK_REPLY", text })),
    });
  }

  const res = await fetch(`${GRAPH_API}/${wabaId}/message_templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: opts.name,
      language: opts.language,
      category: opts.category,
      components,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Шаблон құрылмады (${res.status}): ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as { id?: string; status?: string };
  if (!data.id) throw new Error("Шаблон құрылмады (жауап дұрыс емес)");
  return { metaTemplateId: data.id, status: data.status ?? "PENDING" };
}

/** Fetches a template's current review status straight from Meta. */
export async function fetchMetaTemplateStatus(
  metaTemplateId: string,
): Promise<{ status: string; rejectedReason: string | null }> {
  const { token } = wabaCredentials();

  const res = await fetch(`${GRAPH_API}/${metaTemplateId}?fields=status,rejected_reason`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Шаблон статусы алынбады (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { status?: string; rejected_reason?: string };
  return { status: data.status ?? "PENDING", rejectedReason: data.rejected_reason ?? null };
}
