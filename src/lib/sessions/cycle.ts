/**
 * Session allowance windows.
 *
 * Two systems run side by side:
 *
 *  - Calendar (legacy): the allowance resets at 00:00 UTC on the 1st of every
 *    month for every client at once, via the reset-sessions cron. This is what
 *    clients who signed up before the change are on, and they stay on it.
 *
 *  - Anniversary: the allowance runs from the client's own anchor date — their
 *    join date, moved to their subscription start date once they pay — so a
 *    client always gets a full month of use for each payment.
 *
 * Anniversary windows are not reset by a scheduled job. The window is derived
 * from the anchor, and `session_cycle_started_at` records which window the
 * stored count belongs to; when that falls behind the current window the count
 * is stale and reads as zero. Callers that consume a session write the current
 * window start back, which is what makes the reset land on the client's own
 * date without a nightly sweep touching every row.
 */

export type CycleProfile = {
  uses_anniversary_cycle?: boolean | null
  session_cycle_anchor?: string | null
  session_cycle_started_at?: string | null
  sessions_used_this_month?: number | null
  created_at?: string | null
}

export type SessionCycle = {
  /** Inclusive start of the current window. */
  start: Date
  /** Exclusive end — the instant the next window begins. */
  end: Date
  /** Last day the client can still book in this window. */
  lastDay: Date
  isAnniversary: boolean
}

/** Columns any caller needs to select for the helpers below to work. */
export const CYCLE_COLUMNS =
  'uses_anniversary_cycle, session_cycle_anchor, session_cycle_started_at, sessions_used_this_month'

/**
 * Adds whole months in UTC, clamping to the end of the target month.
 * Always called with the original anchor, so a 31st anchor gives
 * Jan 31 → Feb 28 → Mar 31 rather than sticking at the 28th.
 */
export function addMonthsUTC(date: Date, months: number): Date {
  const year  = date.getUTCFullYear()
  const month = date.getUTCMonth() + months
  const day   = date.getUTCDate()

  // Day 0 of the following month is the last day of the target month.
  const daysInTarget = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  return new Date(Date.UTC(
    year,
    month,
    Math.min(day, daysInTarget),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ))
}

function anchorFor(profile: CycleProfile): Date {
  const raw = profile.session_cycle_anchor ?? profile.created_at
  const parsed = raw ? new Date(raw) : null
  if (!parsed || isNaN(parsed.getTime())) return new Date(0)

  // Normalised to the start of the anchor's UTC day, so a window always runs
  // whole days and turns over at the same instant as the legacy calendar reset
  // (00:00 UTC). Without this, someone who signed up at 2pm would see a window
  // that reads as a day longer than it is.
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
}

/** The window the client is currently inside. */
export function getSessionCycle(profile: CycleProfile | null | undefined, now: Date = new Date()): SessionCycle {
  const isAnniversary = !!profile?.uses_anniversary_cycle

  let start: Date
  let end: Date

  if (isAnniversary && profile) {
    const anchor = anchorFor(profile)

    // Whole months elapsed since the anchor.
    let elapsed =
      (now.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
      (now.getUTCMonth() - anchor.getUTCMonth())
    if (addMonthsUTC(anchor, elapsed) > now) elapsed -= 1
    if (elapsed < 0) elapsed = 0 // anchor in the future — they are in their first window

    start = addMonthsUTC(anchor, elapsed)
    end   = addMonthsUTC(anchor, elapsed + 1)
  } else {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  }

  return { start, end, lastDay: new Date(end.getTime() - 1), isAnniversary }
}

/**
 * Sessions used in the CURRENT window.
 *
 * For anniversary clients a stored count left over from a previous window reads
 * as zero. Calendar clients are untouched — the monthly cron owns their reset.
 */
export function sessionsUsedThisCycle(
  profile: CycleProfile | null | undefined,
  now: Date = new Date(),
): number {
  const stored = profile?.sessions_used_this_month ?? 0
  if (!profile?.uses_anniversary_cycle) return stored

  const { start } = getSessionCycle(profile, now)
  const startedAt = profile.session_cycle_started_at ? new Date(profile.session_cycle_started_at) : null

  if (!startedAt || isNaN(startedAt.getTime()) || startedAt.getTime() < start.getTime()) return 0
  return stored
}

/** Whole hours left in the window, rounded down. */
export function hoursUntilCycleEnd(cycle: SessionCycle, now: Date = new Date()): number {
  return Math.floor((cycle.end.getTime() - now.getTime()) / 3_600_000)
}

/**
 * The window's last usable day, written for a client to read — e.g.
 * "September 29, 2026". Rendered in the client's own timezone so the date they
 * see matches the deadline they experience.
 */
export function formatCycleDeadline(
  cycle: SessionCycle,
  timezone = 'America/New_York',
  opts: { withYear?: boolean } = {},
): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'long',
    day: 'numeric',
    ...(opts.withYear === false ? {} : { year: 'numeric' }),
  }).format(cycle.lastDay)
}

/** Short form of the whole window — e.g. "Aug 30 – Sep 29". */
export function formatCycleRange(cycle: SessionCycle, timezone = 'America/New_York'): string {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: timezone, month: 'short', day: 'numeric' })
  return `${fmt.format(cycle.start)} – ${fmt.format(cycle.lastDay)}`
}

/**
 * The day the NEXT window opens, as a client would say it — e.g. "September 30".
 * Read from midday of the new window so the local date is the one the client
 * experiences rather than the evening before, which is what the raw UTC
 * turnover instant would render as.
 */
export function formatCycleRenewal(cycle: SessionCycle, timezone = 'America/New_York'): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: timezone, month: 'long', day: 'numeric' })
    .format(new Date(cycle.end.getTime() + 12 * 3_600_000))
}

/**
 * One plain sentence telling the client when their allowance renews. Used on the
 * dashboard, the booking page and in email so the wording never drifts apart.
 */
export function cycleExplainer(cycle: SessionCycle, timezone = 'America/New_York'): string {
  return cycle.isAnniversary
    ? `Your sessions renew on your own monthly date — this month's run ${formatCycleRange(cycle, timezone)}. Unused sessions don't carry over.`
    : `Your sessions reset on the 1st of each month — use them by ${formatCycleDeadline(cycle, timezone, { withYear: false })}. Unused sessions don't carry over.`
}
