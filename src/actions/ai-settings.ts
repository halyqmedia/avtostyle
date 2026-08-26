"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { assertDealAccess } from "@/lib/deal-access";
import { PERMISSIONS } from "@/lib/permissions";
import { uploadMedia } from "@/lib/media-storage";
import { extensionForMimeType } from "@/lib/document-mime";

// Starting point for every newly created funnel — admins tailor it from /admin/funnels/[id].
const DEFAULT_SYSTEM_PROMPT = `Сен Avtostyle компаниясының сату менеджерісің.
Клиентпен WhatsApp арқылы қазақша/орысша сөйлес, қысқа әрі нақты жауап бер.
Бағаны нақты айт, көлеңкелі уәде берме. Егер клиент күрделі/арнайы сұрақ қойса немесе
ашуланса, "қазір маманға қосамын" деп жауап беріп, адам менеджерге жеткізетінімізді айт.`;

export type FormState = { error?: string } | undefined;

/** Creates a new sales funnel and clones the "SALES" pipeline's current stages under its own key. */
export async function createFunnel(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePermission(PERMISSIONS.ADMIN_PIPELINE_MANAGE);

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Атауы кемінде 2 таңба" };

  const baseKey = name.toUpperCase().replace(/[^A-ZА-Я0-9]+/gi, "_").slice(0, 40) || "FUNNEL";
  let key = baseKey;
  let suffix = 1;
  while (await prisma.funnel.findUnique({ where: { key } })) {
    key = `${baseKey}_${++suffix}`;
  }

  const templateStages = await prisma.pipelineStage.findMany({
    where: { pipeline: "SALES" },
    orderBy: { order: "asc" },
  });

  await prisma.$transaction(async (tx) => {
    await tx.funnel.create({ data: { key, name, systemPrompt: DEFAULT_SYSTEM_PROMPT } });
    if (templateStages.length > 0) {
      await tx.pipelineStage.createMany({
        data: templateStages.map((s) => ({
          pipeline: key,
          key: s.key,
          name: s.name,
          color: s.color,
          order: s.order,
          isDefault: s.isDefault,
          isFinal: s.isFinal,
        })),
      });
    }
  });

  revalidatePath("/admin/funnels");
  revalidatePath("/admin/pipeline-stages");
}

const updateSettingsSchema = z.object({
  funnelId: z.string().min(1),
  aiEnabled: z.boolean(),
  systemPrompt: z.string().min(10, "Нұсқаулық тым қысқа"),
  model: z.string().min(1),
  maxHistoryMessages: z.coerce.number().int().min(2).max(40),
  maxOutputTokens: z.coerce.number().int().min(50).max(2000),
});

export async function updateAiSettings(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePermission(PERMISSIONS.ADMIN_AI_MANAGE);

  const parsed = updateSettingsSchema.safeParse({
    funnelId: formData.get("funnelId"),
    aiEnabled: formData.get("aiEnabled") === "on",
    systemPrompt: formData.get("systemPrompt"),
    model: formData.get("model"),
    maxHistoryMessages: formData.get("maxHistoryMessages"),
    maxOutputTokens: formData.get("maxOutputTokens"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };

  const { funnelId, ...data } = parsed.data;
  await prisma.funnel.update({ where: { id: funnelId }, data: { ...data, updatedById: session.user.id } });

  revalidatePath(`/admin/funnels/${funnelId}`);
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

/** Uploads the KP/catalog file a funnel's AI agent attaches when a client asks for one — one of 4 slots (doc × language). */
export async function uploadAiDocument(funnelId: string, slot: string, formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.ADMIN_AI_MANAGE);

  const field = DOCUMENT_FIELD[slot];
  if (!field) throw new Error("Белгісіз файл слоты");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Файл таңдалмады");
  const ext = extensionForMimeType(file.type);
  if (!ext) throw new Error("Тек PDF немесе Word (.doc/.docx) файл жүктеуге болады");
  if (file.size > 20 * 1024 * 1024) throw new Error("Файл тым үлкен (20MB-тан аспауы керек)");

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await uploadMedia(`ai-agent/${funnelId}/${slot}.${ext}`, buffer, file.type);

  await prisma.funnel.update({ where: { id: funnelId }, data: { [field]: key } });

  revalidatePath(`/admin/funnels/${funnelId}`);
}
