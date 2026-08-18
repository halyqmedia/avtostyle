export async function register() {
  // Only the Node runtime holds the long-lived Baileys sockets — resume every manager's
  // personal WhatsApp session that was connected before this deploy/restart.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reconnectAllSessions } = await import("@/lib/baileys/session-manager");
    await reconnectAllSessions();
  }
}
