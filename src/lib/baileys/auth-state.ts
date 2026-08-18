import "server-only";
import { proto, initAuthCreds, BufferJSON, type AuthenticationState } from "baileys";
import { prisma } from "@/lib/prisma";

/**
 * Baileys auth state (signal creds + prekeys) backed by Postgres instead of the filesystem —
 * mirrors Baileys' own `useMultiFileAuthState` reference implementation, one row per key, so a
 * manager's WhatsApp session survives Railway redeploys without rescanning the QR code.
 */
export async function loadPrismaAuthState(sessionId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const writeData = async (key: string, data: unknown) => {
    const value = JSON.stringify(data, BufferJSON.replacer);
    await prisma.whatsAppAuthKey.upsert({
      where: { sessionId_key: { sessionId, key } },
      create: { sessionId, key, value },
      update: { value },
    });
  };

  const readData = async (key: string) => {
    const row = await prisma.whatsAppAuthKey.findUnique({ where: { sessionId_key: { sessionId, key } } });
    if (!row) return null;
    return JSON.parse(row.value, BufferJSON.reviver);
  };

  const removeData = async (key: string) => {
    await prisma.whatsAppAuthKey.deleteMany({ where: { sessionId, key } });
  };

  const creds = (await readData("creds")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: Record<string, unknown> = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            }),
          );
          return data as never;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            const entries = data[category as keyof typeof data];
            for (const id in entries) {
              const value = entries[id as keyof typeof entries];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(key, value) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData("creds", creds),
  };
}

/** Wipes a session's stored auth state — used when the phone logs the session out remotely. */
export async function clearAuthState(sessionId: string) {
  await prisma.whatsAppAuthKey.deleteMany({ where: { sessionId } });
}
