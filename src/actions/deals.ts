"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { writeStageHistory } from "@/lib/stage-history";
import { assertDealAccess } from "@/lib/deal-access";

const createDealSchema = z.object({
  title: z.string().min(2, "Атауын енгізіңіз"),
  clientFullName: z.string().min(2, "Клиент атын енгізіңіз"),
  clientPhone: z.string().min(5, "Телефон нөмірін енгізіңіз"),
  productId: z.string().optional(),
  amount: z.coerce.number().min(0, "Сома дұрыс емес"),
  prepayment: z.coerce.number().min(0, "Сома дұрыс емес").default(0),
  assignedToId: z.string().optional(),
});

export type FormState = { error?: string } | undefined;

export async function createDeal(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePermission(PERMISSIONS.DEALS_CREATE);

  const parsed = createDealSchema.safeParse({
    title: formData.get("title"),
    clientFullName: formData.get("clientFullName"),
    clientPhone: formData.get("clientPhone"),
    productId: formData.get("productId") || undefined,
    amount: formData.get("amount"),
    prepayment: formData.get("prepayment") || 0,
    assignedToId: formData.get("assignedToId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };

  const canAssign = session.user.permissions.includes(PERMISSIONS.DEALS_ASSIGN);
  const assignedToId = canAssign ? parsed.data.assignedToId : session.user.id;

  const defaultStage = await prisma.pipelineStage.findFirst({
    where: { pipeline: "SALES", isDefault: true },
  });
  if (!defaultStage) return { error: "Pipeline кезеңдері бапталмаған" };

  const client = await prisma.client.create({
    data: {
      fullName: parsed.data.clientFullName,
      phone: parsed.data.clientPhone,
      source: "manual",
    },
  });

  await prisma.deal.create({
    data: {
      title: parsed.data.title,
      clientId: client.id,
      productId: parsed.data.productId || null,
      amount: parsed.data.amount,
      prepayment: parsed.data.prepayment,
      pipelineStageId: defaultStage.id,
      assignedToId: assignedToId || null,
      createdById: session.user.id,
      source: "manual",
    },
  });

  revalidatePath("/crm");
  revalidatePath("/crm/unassigned");
  return undefined;
}

export async function moveDealStage(dealId: string, toStageId: string) {
  const session = await requirePermission(PERMISSIONS.DEALS_MOVE);

  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new Error("Сделка табылмады");

  const canViewAll = session.user.permissions.includes(PERMISSIONS.DEALS_VIEW_ALL);
  if (!canViewAll && deal.assignedToId !== session.user.id) {
    throw new Error("Бұл сделканы жылжытуға құқығыңыз жоқ");
  }

  if (deal.pipelineStageId === toStageId) return;

  await prisma.$transaction(async (tx) => {
    await tx.deal.update({ where: { id: dealId }, data: { pipelineStageId: toStageId } });
    await writeStageHistory(tx, {
      entityType: "DEAL",
      entityId: dealId,
      fromStageId: deal.pipelineStageId,
      toStageId,
      movedById: session.user.id,
    });
  });

  revalidatePath("/crm");
  revalidatePath(`/crm/deals/${dealId}`);
}

export async function assignDeal(dealId: string, assignedToId: string | null) {
  await requirePermission(PERMISSIONS.DEALS_ASSIGN);
  await prisma.deal.update({ where: { id: dealId }, data: { assignedToId } });
  revalidatePath("/crm");
  revalidatePath("/crm/unassigned");
  revalidatePath(`/crm/deals/${dealId}`);
}

async function assertDealEditAccess(dealId: string) {
  const { session, deal } = await assertDealAccess(dealId);
  if (!session.user.permissions.includes(PERMISSIONS.DEALS_MOVE)) {
    throw new Error("Бұл сделканы өзгертуге құқығыңыз жоқ");
  }
  return { session, deal };
}

export async function updateDealClientName(dealId: string, fullName: string) {
  const { deal } = await assertDealEditAccess(dealId);
  const trimmed = fullName.trim();
  if (!trimmed) throw new Error("Клиент атын енгізіңіз");
  await prisma.client.update({ where: { id: deal.clientId }, data: { fullName: trimmed } });
  revalidatePath(`/crm/deals/${dealId}`);
  revalidatePath("/crm");
}

export async function updateDealClientPhone(dealId: string, phone: string) {
  const { deal } = await assertDealEditAccess(dealId);
  const trimmed = phone.trim();
  if (!trimmed) throw new Error("Телефон нөмірін енгізіңіз");
  await prisma.client.update({ where: { id: deal.clientId }, data: { phone: trimmed } });
  revalidatePath(`/crm/deals/${dealId}`);
  revalidatePath("/crm");
}

export async function updateDealProduct(dealId: string, productId: string | null) {
  await assertDealEditAccess(dealId);
  await prisma.deal.update({ where: { id: dealId }, data: { productId } });
  revalidatePath(`/crm/deals/${dealId}`);
  revalidatePath("/crm");
}

export async function updateDealAmount(dealId: string, amount: number) {
  await assertDealEditAccess(dealId);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Сома дұрыс емес");
  await prisma.deal.update({ where: { id: dealId }, data: { amount } });
  revalidatePath(`/crm/deals/${dealId}`);
  revalidatePath("/crm");
}

export async function updateDealPrepayment(dealId: string, prepayment: number) {
  await assertDealEditAccess(dealId);
  if (!Number.isFinite(prepayment) || prepayment < 0) throw new Error("Сома дұрыс емес");
  await prisma.deal.update({ where: { id: dealId }, data: { prepayment } });
  revalidatePath(`/crm/deals/${dealId}`);
  revalidatePath("/crm");
}
