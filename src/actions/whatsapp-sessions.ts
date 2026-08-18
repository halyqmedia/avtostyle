"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { startSession, stopSession } from "@/lib/baileys/session-manager";

export type WhatsAppSessionStatus = {
  status: "NOT_CONNECTED" | "PENDING" | "CONNECTED" | "DISCONNECTED" | "LOGGED_OUT";
  qr: string | null;
  phoneNumber: string | null;
  lastError: string | null;
};

/** Starts (or resumes) the current user's own WhatsApp connection and issues a fresh QR code. */
export async function connectMyWhatsApp(): Promise<void> {
  const session = await requireSession();

  const record = await prisma.whatsAppSession.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, status: "PENDING" },
    update: { status: "PENDING", qr: null, lastError: null },
  });

  await startSession(record.id, session.user.id);
  revalidatePath("/settings/whatsapp");
}

/** Polled by the connect page while a QR is on screen / a session is (re)connecting. */
export async function getMyWhatsAppStatus(): Promise<WhatsAppSessionStatus> {
  const session = await requireSession();

  const record = await prisma.whatsAppSession.findUnique({ where: { userId: session.user.id } });
  if (!record) return { status: "NOT_CONNECTED", qr: null, phoneNumber: null, lastError: null };

  return {
    status: record.status as WhatsAppSessionStatus["status"],
    qr: record.qr,
    phoneNumber: record.phoneNumber,
    lastError: record.lastError,
  };
}

export async function disconnectMyWhatsApp(): Promise<void> {
  const session = await requireSession();
  const record = await prisma.whatsAppSession.findUnique({ where: { userId: session.user.id } });
  if (!record) return;
  await stopSession(record.id);
  revalidatePath("/settings/whatsapp");
}

export type WhatsAppAccountRow = {
  userId: string;
  userName: string;
  status: string;
  phoneNumber: string | null;
  connectedAt: Date | null;
};

/** Admin-only read-only roster of every manager's personal WhatsApp connection. */
export async function listWhatsAppAccounts(): Promise<WhatsAppAccountRow[]> {
  await requirePermission(PERMISSIONS.ADMIN_USERS_MANAGE);

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: { whatsappSession: true },
  });

  return users.map((u) => ({
    userId: u.id,
    userName: u.name,
    status: u.whatsappSession?.status ?? "NOT_CONNECTED",
    phoneNumber: u.whatsappSession?.phoneNumber ?? null,
    connectedAt: u.whatsappSession?.connectedAt ?? null,
  }));
}
