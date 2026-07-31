"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { assertDealAccess } from "@/lib/deal-access";

export async function addDealNote(dealId: string, body: string) {
  const { session } = await assertDealAccess(dealId);
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Ескертпе бос болмауы керек");

  await prisma.dealNote.create({
    data: { dealId, authorId: session.user.id, body: trimmed },
  });

  revalidatePath(`/crm/deals/${dealId}`);
}

export async function updateDealNote(noteId: string, body: string) {
  const session = await requireSession();
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Ескертпе бос болмауы керек");

  const note = await prisma.dealNote.findUnique({ where: { id: noteId } });
  if (!note) throw new Error("Ескертпе табылмады");

  const isAuthor = note.authorId === session.user.id;
  const isAdmin = session.user.roleKey === "ADMIN";
  if (!isAuthor && !isAdmin) throw new Error("Бұл ескертпені өзгертуге құқығыңыз жоқ");

  await prisma.dealNote.update({ where: { id: noteId }, data: { body: trimmed } });
  revalidatePath(`/crm/deals/${note.dealId}`);
}
