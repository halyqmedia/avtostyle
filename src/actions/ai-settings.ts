"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { assertDealAccess } from "@/lib/deal-access";
import { PERMISSIONS } from "@/lib/permissions";
import { uploadMedia } from "@/lib/media-storage";

// Seed default for a fresh install only — the live prompt actually driving the agent is
// whatever's stored in the ai_settings row, edited from /admin/ai-agent (or by an operator
// directly, e.g. when "training" it on a new commercial offer — see AVTOSTYLE TPE 7D dealer
// program, 2026-08-19).
const DEFAULT_SYSTEM_PROMPT = `Сен Avtostyle компаниясының сату менеджерісің.
Клиентпен WhatsApp арқылы қазақша/орысша сөйлес, қысқа әрі нақты жауап бер.
Бағаны нақты айт, көлеңкелі уәде берме. Егер клиент күрделі/арнайы сұрақ қойса немесе
ашуланса, "қазір маманға қосамын" деп жауап беріп, адам менеджерге жеткізетінімізді айт.`;

const updateSettingsSchema = z.object({
  enabled: z.boolean(),
  systemPrompt: z.string().min(10, "Нұсқаулық тым қысқа"),
  model: z.string().min(1),
  maxHistoryMessages: z.coerce.number().int().min(2).max(40),
  maxOutputTokens: z.coerce.number().int().min(50).max(2000),
});

export type FormState = { error?: string } | undefined;

export async function getOrCreateAiSettings() {
  const existing = await prisma.aiSettings.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  return prisma.aiSettings.create({ data: { id: "default", systemPrompt: DEFAULT_SYSTEM_PROMPT } });
}

export async function updateAiSettings(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePermission(PERMISSIONS.ADMIN_AI_MANAGE);

  const parsed = updateSettingsSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    systemPrompt: formData.get("systemPrompt"),
    model: formData.get("model"),
    maxHistoryMessages: formData.get("maxHistoryMessages"),
    maxOutputTokens: formData.get("maxOutputTokens"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };

  await prisma.aiSettings.upsert({
    where: { id: "default" },
    update: { ...parsed.data, updatedById: session.user.id },
    create: { id: "default", ...parsed.data, updatedById: session.user.id },
  });

  revalidatePath("/admin/ai-agent");
}

export async function toggleDealAi(dealId: string, aiEnabled: boolean) {
  await assertDealAccess(dealId);
  await prisma.deal.update({ where: { id: dealId }, data: { aiEnabled } });
  revalidatePath(`/crm/deals/${dealId}`);
}

const DOCUMENT_FIELD: Record<string, "kpMediaKeyKk" | "kpMediaKeyRu" | "catalogMediaKeyKk" | "catalogMediaKeyRu"> = {
  "kp-kk": "kpMediaKeyKk",
  "kp-ru": "kpMediaKeyRu",
  "catalog-kk": "catalogMediaKeyKk",
  "catalog-ru": "catalogMediaKeyRu",
};

/** Uploads the KP/catalog PDF the AI agent attaches when a client asks for one — one of 4 slots (doc × language). */
export async function uploadAiDocument(slot: string, formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.ADMIN_AI_MANAGE);

  const field = DOCUMENT_FIELD[slot];
  if (!field) throw new Error("Белгісіз файл слоты");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Файл таңдалмады");
  if (file.type !== "application/pdf") throw new Error("Тек PDF файл жүктеуге болады");
  if (file.size > 20 * 1024 * 1024) throw new Error("Файл тым үлкен (20MB-тан аспауы керек)");

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await uploadMedia(`ai-agent/${slot}.pdf`, buffer, "application/pdf");

  await prisma.aiSettings.upsert({
    where: { id: "default" },
    update: { [field]: key },
    create: { id: "default", systemPrompt: DEFAULT_SYSTEM_PROMPT, [field]: key },
  });

  revalidatePath("/admin/ai-agent");
}
