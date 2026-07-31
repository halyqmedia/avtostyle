"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

const createStageSchema = z.object({
  name: z.string().min(2, "Атауы кемінде 2 таңба"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Түс дұрыс емес"),
  pipeline: z.string().min(1),
});

export type FormState = { error?: string } | undefined;

export async function createStage(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePermission(PERMISSIONS.ADMIN_PIPELINE_MANAGE);

  const parsed = createStageSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    pipeline: formData.get("pipeline"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };

  const maxOrder = await prisma.pipelineStage.aggregate({
    where: { pipeline: parsed.data.pipeline },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;
  const key = `${parsed.data.name.toUpperCase().replace(/[^A-ZА-Я0-9]+/gi, "_")}_${nextOrder}`;

  await prisma.pipelineStage.create({
    data: {
      pipeline: parsed.data.pipeline,
      key,
      name: parsed.data.name,
      color: parsed.data.color,
      order: nextOrder,
    },
  });

  revalidatePath("/admin/pipeline-stages");
}

export async function updateStageColor(stageId: string, color: string) {
  await requirePermission(PERMISSIONS.ADMIN_PIPELINE_MANAGE);
  await prisma.pipelineStage.update({ where: { id: stageId }, data: { color } });
  revalidatePath("/admin/pipeline-stages");
  revalidatePath("/crm");
}

export async function updateStageName(stageId: string, name: string) {
  await requirePermission(PERMISSIONS.ADMIN_PIPELINE_MANAGE);
  await prisma.pipelineStage.update({ where: { id: stageId }, data: { name } });
  revalidatePath("/admin/pipeline-stages");
  revalidatePath("/crm");
}

export async function reorderStage(pipeline: string, stageId: string, direction: "up" | "down") {
  await requirePermission(PERMISSIONS.ADMIN_PIPELINE_MANAGE);

  const stages = await prisma.pipelineStage.findMany({
    where: { pipeline },
    orderBy: { order: "asc" },
  });
  const idx = stages.findIndex((s) => s.id === stageId);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= stages.length) return;

  const a = stages[idx];
  const b = stages[swapWith];

  await prisma.$transaction([
    prisma.pipelineStage.update({ where: { id: a.id }, data: { order: -1 } }),
    prisma.pipelineStage.update({ where: { id: b.id }, data: { order: a.order } }),
    prisma.pipelineStage.update({ where: { id: a.id }, data: { order: b.order } }),
  ]);

  revalidatePath("/admin/pipeline-stages");
  revalidatePath("/crm");
}
