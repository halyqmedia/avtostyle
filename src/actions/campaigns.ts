"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createMetaTemplate,
  fetchMetaTemplateStatus,
  extractTemplateVariables,
  uploadResumableExample,
} from "@/lib/whatsapp-templates";
import { runCampaignSend } from "@/lib/campaign-sender";
import { uploadMedia } from "@/lib/media-storage";

export type FormState = { error?: string } | undefined;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_HEADER_FILE_BYTES = 16 * 1024 * 1024;

export async function createTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const name = String(formData.get("name") ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const language = String(formData.get("language") ?? "kk");
  const category = String(formData.get("category") ?? "MARKETING") as "MARKETING" | "UTILITY";
  const bodyText = String(formData.get("bodyText") ?? "").trim();
  const example = String(formData.get("example") ?? "").trim();
  const footerText = String(formData.get("footerText") ?? "").trim();
  const buttons = String(formData.get("buttons") ?? "")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, 3);
  const headerFile = formData.get("headerFile");

  if (!name) return { error: "Шаблон атын енгізіңіз" };
  if (!bodyText) return { error: "Шаблон мәтінін енгізіңіз" };
  if (buttons.some((b) => b.length > 25)) return { error: "Түйме мәтіні 25 таңбадан аспауы керек" };

  const variables = extractTemplateVariables(bodyText);
  const variableCount = new Set(variables).size;
  if (variableCount > 1) {
    return { error: "Қазір бір ғана айнымалы ({{1}}) қолдау көрсетіледі — клиенттің аты үшін" };
  }
  if (variableCount === 1 && !example) {
    return { error: "{{1}} үшін мысал мән керек (Meta тексеру үшін талап етеді)" };
  }

  const existing = await prisma.whatsAppTemplate.findUnique({ where: { name } });
  if (existing) return { error: "Бұл атпен шаблон бар болып тұр" };

  let headerType: "IMAGE" | "DOCUMENT" | null = null;
  let headerMediaKey: string | null = null;
  let headerMimeType: string | null = null;
  let headerFileName: string | null = null;
  let headerHandle: string | undefined;

  if (headerFile instanceof File && headerFile.size > 0) {
    if (headerFile.size > MAX_HEADER_FILE_BYTES) return { error: "Файл тым үлкен (16MB-тан аспауы керек)" };

    headerType = IMAGE_TYPES.has(headerFile.type) ? "IMAGE" : "DOCUMENT";
    headerMimeType = headerFile.type || "application/octet-stream";
    headerFileName = headerType === "DOCUMENT" ? headerFile.name : null;

    const buffer = Buffer.from(await headerFile.arrayBuffer());
    try {
      headerMediaKey = await uploadMedia(`whatsapp-templates/${randomUUID()}`, buffer, headerMimeType);
      headerHandle = await uploadResumableExample(buffer, headerMimeType);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Файл жүктелмеді" };
    }
  }

  try {
    const { metaTemplateId, status } = await createMetaTemplate({
      name,
      language,
      category,
      bodyText,
      examples: variableCount === 1 ? [example] : [],
      header: headerType && headerHandle ? { format: headerType, handle: headerHandle } : undefined,
      footerText: footerText || undefined,
      buttons: buttons.length > 0 ? buttons : undefined,
    });

    await prisma.whatsAppTemplate.create({
      data: {
        name,
        language,
        category,
        bodyText,
        variableCount,
        headerType,
        headerMediaKey,
        headerMimeType,
        headerFileName,
        footerText: footerText || null,
        buttons,
        metaTemplateId,
        status,
        createdById: session.user.id,
      },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Шаблон құрылмады" };
  }

  revalidatePath("/campaigns");
  return undefined;
}

export async function syncTemplateStatus(templateId: string): Promise<void> {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);
  const template = await prisma.whatsAppTemplate.findUnique({ where: { id: templateId } });
  if (!template?.metaTemplateId) return;

  const { status, rejectedReason } = await fetchMetaTemplateStatus(template.metaTemplateId);
  await prisma.whatsAppTemplate.update({ where: { id: templateId }, data: { status, rejectedReason } });
  revalidatePath("/campaigns");
}

/** Creates a broadcast from an already-selected set of Contact rows (filtered/picked on the Contacts board). */
export async function createCampaign(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const name = String(formData.get("name") ?? "").trim();
  const templateId = String(formData.get("templateId") ?? "");
  const contactIds = String(formData.get("contactIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!name) return { error: "Рассылка атын енгізіңіз" };
  const template = await prisma.whatsAppTemplate.findUnique({ where: { id: templateId } });
  if (!template) return { error: "Шаблонды таңдаңыз" };
  if (template.status !== "APPROVED") return { error: "Шаблон әлі Meta-дан бекітілмеген" };
  if (contactIds.length === 0) return { error: "Кемінде бір клиентті таңдаңыз" };

  await prisma.campaign.create({
    data: {
      name,
      templateId,
      totalCount: contactIds.length,
      createdById: session.user.id,
      recipients: {
        createMany: { data: contactIds.map((contactId) => ({ contactId })) },
      },
    },
  });

  revalidatePath("/campaigns");
  return undefined;
}

export async function sendCampaign(campaignId: string): Promise<void> {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, include: { template: true } });
  if (!campaign) throw new Error("Рассылка табылмады");
  if (campaign.status !== "DRAFT") throw new Error("Бұл рассылка бұрын жіберілген немесе жіберілуде");
  if (campaign.template.status !== "APPROVED") throw new Error("Шаблон әлі Meta-дан бекітілмеген");

  // Fire-and-forget: this container stays alive after the action returns (same pattern as the
  // Baileys sessions), so the paced send loop keeps running in the background.
  runCampaignSend(campaignId).catch((err) => console.error("Campaign send failed:", campaignId, err));

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}

/**
 * Stops a running campaign — the active send loop notices within one pacing interval (see
 * runCampaignSendInner's status check) and exits, and the resume poller skips STOPPED campaigns,
 * so it never picks back up on its own. Whatever's left PENDING just stays that way.
 */
export async function stopCampaign(campaignId: string): Promise<void> {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Рассылка табылмады");
  if (campaign.status !== "SENDING") throw new Error("Бұл рассылка қазір жіберілмей тұр");

  await prisma.campaign.update({ where: { id: campaignId }, data: { status: "STOPPED" } });

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}
