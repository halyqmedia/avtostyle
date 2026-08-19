"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { normalizePhone } from "@/lib/phone";

export type FormState = { error?: string } | undefined;

type ParsedRow = {
  phone: string;
  fullName: string | null;
  city: string | null;
  profession: string | null;
  category: string | null;
  status: string | null;
  tags: string[];
};

/** Position-based columns: телефон, аты, қала, кәсіп, бағыт, статус, тег(лер, "|" арқылы). */
function parseContactsText(text: string): { rows: ParsedRow[]; skipped: number } {
  const rows: ParsedRow[] = [];
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

    rows.push({
      phone,
      fullName: parts[1] || null,
      city: parts[2] || null,
      profession: parts[3] || null,
      category: parts[4] || null,
      status: parts[5] || null,
      tags: parts[6] ? parts[6].split("|").map((t) => t.trim()).filter(Boolean) : [],
    });
  }

  return { rows, skipped };
}

export async function uploadContacts(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const pasted = String(formData.get("contactsText") ?? "");
  const file = formData.get("contactsFile");

  let rawText = pasted;
  if (file instanceof File && file.size > 0) {
    rawText += "\n" + (await file.text());
  }
  if (!rawText.trim()) return { error: "База файлын жүктеңіз немесе қойыңыз" };

  const { rows, skipped } = parseContactsText(rawText);
  if (rows.length === 0) return { error: "Жарамды телефон нөмірі табылмады" };

  // Upsert one at a time by phone — a re-upload refreshes an existing contact's fields instead
  // of erroring on the unique constraint or creating a duplicate.
  for (const row of rows) {
    await prisma.contact.upsert({
      where: { phone: row.phone },
      update: {
        ...(row.fullName ? { fullName: row.fullName } : {}),
        ...(row.city ? { city: row.city } : {}),
        ...(row.profession ? { profession: row.profession } : {}),
        ...(row.category ? { category: row.category } : {}),
        ...(row.status ? { status: row.status } : {}),
        ...(row.tags.length > 0 ? { tags: row.tags } : {}),
      },
      create: {
        phone: row.phone,
        fullName: row.fullName,
        city: row.city,
        profession: row.profession,
        category: row.category,
        status: row.status ?? "Жаңа",
        tags: row.tags,
        createdById: session.user.id,
      },
    });
  }

  revalidatePath("/campaigns");
  return skipped > 0 ? { error: `Жүктелді, бірақ ${skipped} жол дұрыс емес нөмір болғандықтан өткізілді` } : undefined;
}

export async function updateContact(contactId: string, formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const fullName = String(formData.get("fullName") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const profession = String(formData.get("profession") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      fullName: fullName || null,
      city: city || null,
      profession: profession || null,
      category: category || null,
      status: status || null,
      tags: tagsRaw
        ? tagsRaw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      notes: notes || null,
    },
  });

  revalidatePath("/campaigns");
}
