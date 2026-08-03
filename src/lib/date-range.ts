/**
 * Parses ?from=&to= (YYYY-MM-DD) search params, defaulting to the current calendar month.
 * Everything is anchored to UTC (not server-local time) so behavior is identical regardless
 * of the deployment environment's timezone, and round-trips cleanly through toISOString().
 */
export function resolveDateRange(searchParams: { from?: string; to?: string }) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const from = searchParams.from ? new Date(`${searchParams.from}T00:00:00Z`) : monthStart;
  // `to` from a date input is inclusive of that day — push to the start of the next day
  // so the [from, to) range used in Prisma queries covers it.
  const to = searchParams.to
    ? new Date(new Date(`${searchParams.to}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000)
    : monthEnd;

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const lastDayOfRange = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  return { from, to, fromStr: fmt(from), toStr: fmt(lastDayOfRange) };
}
