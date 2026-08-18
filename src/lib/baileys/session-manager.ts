import "server-only";
import makeWASocket, { DisconnectReason, Browsers, fetchLatestBaileysVersion, type WASocket } from "baileys";
import pino from "pino";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { loadPrismaAuthState, clearAuthState } from "@/lib/baileys/auth-state";
import { handleBaileysMessage } from "@/lib/baileys/inbound";
import { throttleSend, resetThrottle } from "@/lib/baileys/throttle";

// One long-lived socket per manager, held in this module's memory for the life of the Node
// process (this app runs as a single persistent Railway container, not serverless functions —
// see instrumentation.ts, which reconnects every previously-connected session on boot).
const sockets = new Map<string, WASocket>();
const logger = pino({ level: "error" });

export function getSocket(sessionId: string): WASocket | null {
  return sockets.get(sessionId) ?? null;
}

export function isConnected(sessionId: string): boolean {
  return sockets.has(sessionId);
}

export async function startSession(sessionId: string, userId: string): Promise<void> {
  if (sockets.has(sessionId)) return; // already connecting/connected

  const { state, saveCreds } = await loadPrismaAuthState(sessionId);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: Browsers.appropriate("Chrome"),
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
  });

  sockets.set(sessionId, sock);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrDataUrl = await QRCode.toDataURL(qr);
      await prisma.whatsAppSession
        .update({ where: { id: sessionId }, data: { status: "PENDING", qr: qrDataUrl, lastError: null } })
        .catch(() => {});
    }

    if (connection === "open") {
      const jid = sock.user?.id;
      const phoneNumber = jid ? `+${jid.split(":")[0].split("@")[0]}` : null;
      await prisma.whatsAppSession
        .update({ where: { id: sessionId }, data: { status: "CONNECTED", qr: null, phoneNumber, lastError: null } })
        .catch(() => {});
      // connectedAt marks the *first* successful link — throttle.ts uses it as the start of the
      // new-number warm-up window, so a later reconnect (network blip) must not push it forward.
      await prisma.whatsAppSession
        .updateMany({ where: { id: sessionId, connectedAt: null }, data: { connectedAt: new Date() } })
        .catch(() => {});
    }

    if (connection === "close") {
      sockets.delete(sessionId);
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output
        ?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        resetThrottle(sessionId);
        await clearAuthState(sessionId);
        await prisma.whatsAppSession
          .update({ where: { id: sessionId }, data: { status: "LOGGED_OUT", qr: null, phoneNumber: null } })
          .catch(() => {});
      } else {
        await prisma.whatsAppSession
          .update({
            where: { id: sessionId },
            data: { status: "DISCONNECTED", lastError: statusCode ? String(statusCode) : "connection closed" },
          })
          .catch(() => {});
        // Transient drop (network blip, phone restart) — reconnect automatically.
        startSession(sessionId, userId).catch((err) => console.error("WhatsApp reconnect failed:", err));
      }
    }
  });

  sock.ev.on("messages.upsert", ({ messages, type }) => {
    for (const m of messages) {
      console.log(
        `[baileys ${sessionId}] upsert type=${type} jid=${m.key.remoteJid} fromMe=${m.key.fromMe} stub=${m.messageStubType ?? "-"} keys=${m.message ? Object.keys(m.message).join(",") : "none"}`,
      );
    }
    if (type !== "notify") return; // skip bulk history backfill, only handle live traffic
    for (const msg of messages) {
      handleBaileysMessage(sessionId, userId, msg).catch((err) => console.error("Baileys inbound handling failed:", err));
    }
  });
}

export async function stopSession(sessionId: string): Promise<void> {
  const sock = sockets.get(sessionId);
  sockets.delete(sessionId);
  resetThrottle(sessionId);
  if (sock) {
    try {
      await sock.logout();
    } catch {
      sock.end(undefined);
    }
  }
  await clearAuthState(sessionId);
  await prisma.whatsAppSession.update({
    where: { id: sessionId },
    data: { status: "LOGGED_OUT", qr: null, phoneNumber: null },
  });
}

/** Reconnects every session that was connected (or mid-handshake) before the last restart. */
export async function reconnectAllSessions(): Promise<void> {
  const sessions = await prisma.whatsAppSession.findMany({
    where: { status: { in: ["CONNECTED", "DISCONNECTED", "PENDING"] } },
  });
  for (const s of sessions) {
    startSession(s.id, s.userId).catch((err) => console.error("WhatsApp session resume failed:", s.id, err));
  }
}

async function sessionConnectedAt(sessionId: string): Promise<Date | null> {
  const row = await prisma.whatsAppSession.findUnique({ where: { id: sessionId }, select: { connectedAt: true } });
  return row?.connectedAt ?? null;
}

export async function sendPersonalText(sessionId: string, jid: string, text: string): Promise<{ idMessage: string }> {
  const sock = getSocket(sessionId);
  if (!sock) throw new Error("Менеджердің WhatsApp сессиясы қосылмаған");
  await throttleSend(sessionId, await sessionConnectedAt(sessionId));
  const result = await sock.sendMessage(jid, { text });
  if (!result?.key?.id) throw new Error("Хабарлама жіберілмеді");
  return { idMessage: result.key.id };
}

type PersonalMediaKind = "image" | "video" | "audio" | "document";

export async function sendPersonalMedia(
  sessionId: string,
  jid: string,
  kind: PersonalMediaKind,
  buffer: Buffer,
  opts: { mimeType: string; caption?: string; fileName?: string; isVoiceNote?: boolean },
): Promise<{ idMessage: string }> {
  const sock = getSocket(sessionId);
  if (!sock) throw new Error("Менеджердің WhatsApp сессиясы қосылмаған");
  await throttleSend(sessionId, await sessionConnectedAt(sessionId));

  const content =
    kind === "image"
      ? { image: buffer, caption: opts.caption, mimetype: opts.mimeType }
      : kind === "video"
        ? { video: buffer, caption: opts.caption, mimetype: opts.mimeType }
        : kind === "audio"
          ? { audio: buffer, mimetype: opts.mimeType, ptt: !!opts.isVoiceNote }
          : { document: buffer, fileName: opts.fileName, mimetype: opts.mimeType };

  const result = await sock.sendMessage(jid, content);
  if (!result?.key?.id) throw new Error("Файл жіберілмеді");
  return { idMessage: result.key.id };
}
