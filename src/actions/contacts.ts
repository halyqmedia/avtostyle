"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { normalizePhone } from "@/lib/phone";
import { getMediaUrl } from "@/lib/media-storage";

export type FormState = { error?: string } | undefined;

const MAX_CONTACTS_FILE_BYTES = 10 * 1024 * 1024;
const EXCEL_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
]);

type ParsedRow = {
  phone: string;
  fullName: string | null;
  city: string | null;
  profession: string | null;
  category: string | null;
  status: string | null;
  tags: string[];
};

function toParsedRow(cols: string[]): ParsedRow | null {
  const phone = normalizePhone(cols[0] ?? "");
  if (!phone) return null;

  return {
    phone,
    fullName: cols[1] || null,
    city: cols[2] || null,
    profession: cols[3] || null,
    category: cols[4] || null,
    status: cols[5] || null,
    tags: cols[6] ? cols[6].split("|").map((t) => t.trim()).filter(Boolean) : [],
  };
}

/** Position-based columns: телефон, аты, қала, кәсіп, бағыт, статус, тег(лер, "|" арқылы). */
function parseContactsText(text: string): { rows: ParsedRow[]; skipped: number } {
  const rows: ParsedRow[] = [];
  let skipped = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const row = toParsedRow(line.split(/[,;\t]/).map((p) => p.trim()));
    if (!row) skipped++;
    else rows.push(row);
  }

  return { rows, skipped };
}

function excelCellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value) return String(value.text ?? "").trim();
    if ("result" in value) return String(value.result ?? "").trim();
    return "";
  }
  return String(value).trim();
}

/** Same position-based columns as the text format, read from the first sheet's rows. */
async function parseContactsExcel(buffer: Buffer): Promise<{ rows: ParsedRow[]; skipped: number }> {
  const workbook = new ExcelJS.Workbook();
  // exceljs resolves its own nested @types/node, so its Buffer type never structurally matches
  // ours even though it's the same class at runtime — `any` sidesteps the phantom mismatch.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (workbook.xlsx as any).load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { rows: [], skipped: 0 };

  const rows: ParsedRow[] = [];
  let skipped = 0;

  worksheet.eachRow((excelRow) => {
    const values = excelRow.values as ExcelJS.CellValue[];
    const cols = values.slice(1).map(excelCellText); // index 0 is always empty in exceljs

    const row = toParsedRow(cols);
    if (!row) skipped++;
    else rows.push(row);
  });

  return { rows, skipped };
}

export async function uploadContacts(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const pasted = String(formData.get("contactsText") ?? "");
  const file = formData.get("contactsFile");

  let rows: ParsedRow[] = [];
  let skipped = 0;

  if (pasted.trim()) {
    const parsed = parseContactsText(pasted);
    rows = rows.concat(parsed.rows);
    skipped += parsed.skipped;
  }

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_CONTACTS_FILE_BYTES) return { error: "Файл тым үлкен (10MB-тан аспауы керек)" };

    const isExcel = EXCEL_MIME_TYPES.has(file.type) || /\.xlsx?$/i.test(file.name);
    if (isExcel) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await parseContactsExcel(buffer);
      rows = rows.concat(parsed.rows);
      skipped += parsed.skipped;
    } else {
      const parsed = parseContactsText(await file.text());
      rows = rows.concat(parsed.rows);
      skipped += parsed.skipped;
    }
  }

  if (rows.length === 0 && skipped === 0) return { error: "База файлын жүктеңіз немесе қойыңыз" };

  // Dedupe by phone across pasted text + file — keep the first occurrence.
  const seen = new Set<string>();
  rows = rows.filter((r) => (seen.has(r.phone) ? false : (seen.add(r.phone), true)));

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

export type ContactChatMessage = {
  id: string;
  direction: "IN" | "OUT";
  body: string;
  createdAt: string;
  sentByName: string | null;
  status: string | null;
  errorMessage: string | null;
  messageType: string;
  mediaSrc: string | null;
  mediaMimeType: string | null;
  fileName: string | null;
  aiGenerated: boolean;
};

/** Contact only gets a deal (and a chat history) once it replies and findOrCreateLeadForPhone links it to a Client. */
export async function getContactChat(
  contactId: string,
): Promise<{ dealId: string | null; messages: ContactChatMessage[] }> {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: { client: { include: { deals: { orderBy: { createdAt: "desc" }, take: 1 } } } },
  });
  if (!contact) throw new Error("Клиент табылмады");

  const dealId = contact.client?.deals[0]?.id ?? null;
  if (!dealId) return { dealId: null, messages: [] };

  const whatsappMessages = await prisma.whatsAppMessage.findMany({
    where: { dealId },
    include: { sentBy: true },
    orderBy: { createdAt: "asc" },
  });

  const messages = await Promise.all(
    whatsappMessages.map(async (m) => ({
      id: m.id,
      direction: m.direction as "IN" | "OUT",
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      sentByName: m.sentBy?.name ?? null,
      status: m.status,
      errorMessage: m.errorMessage,
      messageType: m.messageType,
      mediaSrc: m.mediaUrl ? await getMediaUrl(m.mediaUrl) : null,
      mediaMimeType: m.mediaMimeType,
      fileName: m.fileName,
      aiGenerated: m.aiGenerated,
    })),
  );

  return { dealId, messages };
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
