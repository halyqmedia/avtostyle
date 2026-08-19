const SEQUENCE_POLL_MS = 15 * 60 * 1000; // how often to check for due drip-sequence steps

export async function register() {
  // Only the Node runtime holds long-lived state (Baileys sockets, the sequence poller) — this
  // app is a single persistent Railway container, not serverless functions.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reconnectAllSessions } = await import("@/lib/baileys/session-manager");
    await reconnectAllSessions();

    const { processDueEnrollments } = await import("@/lib/sequence-sender");
    const runPoll = () => processDueEnrollments().catch((err) => console.error("Sequence poll failed:", err));
    runPoll();
    setInterval(runPoll, SEQUENCE_POLL_MS);
  }
}
