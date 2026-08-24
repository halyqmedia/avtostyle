// No "server-only" import here (unlike template-send-throttle.ts) — this constant also needs to
// be readable from client components (see create-campaign-from-selection-dialog.tsx) so the
// campaign-creation dialog can show the real cap instead of a hardcoded guess.
export const DAILY_TEMPLATE_SEND_CAP = 200;
