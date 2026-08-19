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

/**
 * Submits a BODY-only message template to Meta for review. Returns immediately with a PENDING
 * status — approval (or rejection) happens asynchronously on Meta's side, checked later via
 * `syncTemplateStatus`. `examples` must have one realistic value per `{{n}}` placeholder,
 * in order — Meta requires them to review the template.
 */
export async function createMetaTemplate(opts: {
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY";
  bodyText: string;
  examples: string[];
}): Promise<{ metaTemplateId: string; status: string }> {
  const { wabaId, token } = wabaCredentials();

  const components: Record<string, unknown>[] = [
    {
      type: "BODY",
      text: opts.bodyText,
      ...(opts.examples.length > 0 ? { example: { body_text: [opts.examples] } } : {}),
    },
  ];

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
