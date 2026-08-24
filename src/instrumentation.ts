const SEQUENCE_POLL_MS = 15 * 60 * 1000; // how often to check for due drip-sequence steps
const CAMPAIGN_RESUME_POLL_MS = 15 * 60 * 1000; // how often to resume campaigns paused by the daily send cap
const HOT_LEAD_ESCALATION_POLL_MS = 15 * 60 * 1000; // how often to check for unanswered hot leads
const REACTIVATION_POLL_MS = 60 * 60 * 1000; // day-granularity threshold — hourly is plenty

export async function register() {
  // Only the Node runtime holds long-lived state (Baileys sockets, the sequence poller) — this
  // app is a single persistent Railway container, not serverless functions.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reconnectAllSessions } = await import("@/lib/baileys/session-manager");
    await reconnectAllSessions();

    const { processDueEnrollments } = await import("@/lib/sequence-sender");
    const runSequencePoll = () => processDueEnrollments().catch((err) => console.error("Sequence poll failed:", err));
    runSequencePoll();
    setInterval(runSequencePoll, SEQUENCE_POLL_MS);

    const { resumePausedCampaigns } = await import("@/lib/campaign-sender");
    const runCampaignResumePoll = () =>
      resumePausedCampaigns().catch((err) => console.error("Campaign resume poll failed:", err));
    runCampaignResumePoll();
    setInterval(runCampaignResumePoll, CAMPAIGN_RESUME_POLL_MS);

    const { processHotLeadEscalations } = await import("@/lib/hot-lead-escalation");
    const runEscalationPoll = () =>
      processHotLeadEscalations().catch((err) => console.error("Hot lead escalation poll failed:", err));
    runEscalationPoll();
    setInterval(runEscalationPoll, HOT_LEAD_ESCALATION_POLL_MS);

    const { processReactivation } = await import("@/lib/reactivation");
    const runReactivationPoll = () =>
      processReactivation().catch((err) => console.error("Reactivation poll failed:", err));
    runReactivationPoll();
    setInterval(runReactivationPoll, REACTIVATION_POLL_MS);
  }
}
