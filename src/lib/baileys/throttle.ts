import "server-only";

const MIN_GAP_MS = 2500; // minimum spacing between two sends from the same session — no bot-speed bursts
const WARMUP_DAYS = 3; // freshly linked numbers get banned fastest — stay conservative for the first few days
const WARMUP_DAILY_CAP = 40;
const NORMAL_DAILY_CAP = 250;
const MINUTE_CAP = 15;

type SessionActivity = { sentAt: number[]; lastSentAt: number };
const activity = new Map<string, SessionActivity>();

function getActivity(sessionId: string): SessionActivity {
  let a = activity.get(sessionId);
  if (!a) {
    a = { sentAt: [], lastSentAt: 0 };
    activity.set(sessionId, a);
  }
  return a;
}

/**
 * Keeps one WhatsApp session's outbound traffic inside patterns WhatsApp treats as a human, not
 * a bot: a minimum gap between messages, and soft per-minute/per-day caps (tighter for the first
 * few days after linking). Guards against a bug — or a future bulk-send feature — turning a
 * manager's personal number into something WhatsApp flags and bans.
 *
 * In-memory only (resets on redeploy) — a deliberate simplicity tradeoff, not a correctness gap:
 * the caps exist to blunt bursts, not to be an exact audited ledger.
 */
export async function throttleSend(sessionId: string, connectedAt: Date | null): Promise<void> {
  const a = getActivity(sessionId);

  const gap = Date.now() - a.lastSentAt;
  if (a.lastSentAt && gap < MIN_GAP_MS) {
    await new Promise((r) => setTimeout(r, MIN_GAP_MS - gap));
  }

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  a.sentAt = a.sentAt.filter((t) => t > oneDayAgo);

  const oneMinuteAgo = Date.now() - 60 * 1000;
  const lastMinuteCount = a.sentAt.filter((t) => t > oneMinuteAgo).length;
  if (lastMinuteCount >= MINUTE_CAP) {
    throw new Error("Хабарлама тым жиі жіберілуде — WhatsApp бұғаттауының алдын алу үшін бір минутқа күте тұрыңыз");
  }

  const isWarmingUp = !connectedAt || Date.now() - connectedAt.getTime() < WARMUP_DAYS * 24 * 60 * 60 * 1000;
  const dailyCap = isWarmingUp ? WARMUP_DAILY_CAP : NORMAL_DAILY_CAP;
  if (a.sentAt.length >= dailyCap) {
    throw new Error(
      isWarmingUp
        ? `Жаңа нөмір алғашқы ${WARMUP_DAYS} күнде күндік лимитке жетті (${WARMUP_DAILY_CAP} хабарлама) — WhatsApp бұғаттауын болдырмау үшін`
        : `Бұл нөмір үшін бүгінгі хабарлама лимитіне жетті (${NORMAL_DAILY_CAP})`,
    );
  }

  a.sentAt.push(Date.now());
  a.lastSentAt = Date.now();
}

/** Clears counters when a session disconnects/logs out so a future relink starts fresh. */
export function resetThrottle(sessionId: string): void {
  activity.delete(sessionId);
}
