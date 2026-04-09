import type { Frequency } from '../types/habit'

/**
 * Returns the start of the current period (local time) for the given frequency.
 * - daily   → midnight today
 * - weekly  → midnight of the most recent Monday
 * - monthly → midnight of the first day of the month
 *
 * Uses Date mutators rather than ms arithmetic so DST transitions are handled
 * correctly by the runtime.
 */
export function getPeriodStart(freq: Frequency, now: Date = new Date()): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  if (freq === 'daily') return d
  if (freq === 'weekly') {
    // getDay(): 0=Sun..6=Sat. Map to 0=Mon..6=Sun.
    const offset = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - offset)
    return d
  }
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/**
 * Returns the earliest period start across the given frequencies, used to issue
 * a single `.gte('completed_at', ...)` query that covers every habit's window.
 */
export function earliestPeriodStart(frequencies: Frequency[], now: Date = new Date()): Date {
  if (frequencies.includes('monthly')) return getPeriodStart('monthly', now)
  if (frequencies.includes('weekly')) return getPeriodStart('weekly', now)
  return getPeriodStart('daily', now)
}

/**
 * Given a period start, returns the start of the immediately-preceding period
 * for the same frequency. Uses Date mutators so month/year boundaries and DST
 * transitions are handled correctly.
 */
export function previousPeriodStart(freq: Frequency, periodStart: Date): Date {
  const d = new Date(periodStart)
  if (freq === 'daily') {
    d.setDate(d.getDate() - 1)
  } else if (freq === 'weekly') {
    d.setDate(d.getDate() - 7)
  } else {
    d.setMonth(d.getMonth() - 1)
  }
  return d
}

/**
 * Counts completions whose `completed_at` falls inside the current period for
 * the given frequency.
 */
export function countInPeriod(
  completions: { completed_at: string }[],
  freq: Frequency,
  now: Date = new Date(),
): number {
  const startMs = getPeriodStart(freq, now).getTime()
  return completions.filter((c) => new Date(c.completed_at).getTime() >= startMs).length
}
