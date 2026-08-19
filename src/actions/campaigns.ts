"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { normalizePhone } from "@/lib/phone";
import { createMetaTemplate, fetchMetaTemplateStatus, extractTemplateVariables } from "@/lib/whatsapp-templates";
import { runCampaignSend } from "@/lib/campaign-sender";

export type FormState = { error?: string } | undefined;

export async function createTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const name = String(formData.get("name") ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const language = String(formData.get("language") ?? "kk");
  const category = String(formData.get("category") ?? "MARKETING") as "MARKETING" | "UTILITY";
  const bodyText = String(formData.get("bodyText") ?? "").trim();
  const example = String(formData.get("example") ?? "").trim();

  if (!name) return { error: "Шаблон атын енгізіңіз" };
  if (!bodyText) return { error: "Шаблон мәтінін енгізіңіз" };

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

  try {
    const { metaTemplateId, status } = await createMetaTemplate({
      name,
      language,
      category,
      bodyText,
      examples: variableCount === 1 ? [example] : [],
    });

    await prisma.whatsAppTemplate.create({
      data: {
        name,
        language,
        category,
        bodyText,
        variableCount,
        metaTemplateId,
        status,
        createdById: session.user.id,
      },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Шаблон құрылмады" };
  }

  revalidatePath("/admin/campaigns");
  return undefined;
}

export async function syncTemplateStatus(templateId: string): Promise<void> {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);
  const template = await prisma.whatsAppTemplate.findUnique({ where: { id: templateId } });
  if (!template?.metaTemplateId) return;

  const { status, rejectedReason } = await fetchMetaTemplateStatus(template.metaTemplateId);
  await prisma.whatsAppTemplate.update({ where: { id: templateId }, data: { status, rejectedReason } });
  revalidatePath("/admin/campaigns");
}

type ParsedContact = { phone: string; fullName: string | null };

function parseContactsFile(text: string): { contacts: ParsedContact[]; skipped: number } {
  const contacts: ParsedContact[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split(/[,;\t]/).map((p) => p.trim());
    const phone = normalizePhone(parts[0] ?? "");
    if (!phone) {
      skipped++;
      continue;
    }
    if (seen.has(phone)) continue;
    seen.add(phone);
    contacts.push({ phone, fullName: parts[1] || null });
  }

  return { contacts, skipped };
}

export async function createCampaign(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const name = String(formData.get("name") ?? "").trim();
  const templateId = String(formData.get("templateId") ?? "");
  const pastedContacts = String(formData.get("contactsText") ?? "");
  const file = formData.get("contactsFile");

  if (!name) return { error: "Рассылка атын енгізіңіз" };
  const template = await prisma.whatsAppTemplate.findUnique({ where: { id: templateId } });
  if (!template) return { error: "Шаблонды таңдаңыз" };
  if (template.status !== "APPROVED") return { error: "Шаблон әлі Meta-дан бекітілмеген" };

  let rawText = pastedContacts;
  if (file instanceof File && file.size > 0) {
    rawText += "\n" + (await file.text());
  }
  if (!rawText.trim()) return { error: "Клиенттер базасын жүктеңіз немесе қойыңыз" };

  const { contacts, skipped } = parseContactsFile(rawText);
  if (contacts.length === 0) return { error: "Жарамды телефон нөмірі табылмады" };

  await prisma.campaign.create({
    data: {
      name,
      templateId,
      totalCount: contacts.length,
      createdById: session.user.id,
      recipients: {
        createMany: { data: contacts.map((c) => ({ phone: c.phone, fullName: c.fullName })) },
      },
    },
  });

  revalidatePath("/admin/campaigns");
  return skipped > 0 ? { error: `Жасалды, бірақ ${skipped} жол дұрыс емес нөмір болғандықтан өткізілді` } : undefined;
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

  revalidatePath(`/admin/campaigns/${campaignId}`);
  revalidatePath("/admin/campaigns");
}
