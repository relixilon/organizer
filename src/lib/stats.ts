import type { Frequency, HabitStats } from '../types/habit'
import { getPeriodStart, previousPeriodStart } from './period'

/**
 * Computes streak and completion stats for a single habit from its raw
 * completion timestamps.
 *
 * Streak rules:
 * - A period "meets" the habit when its completion count is >= target_per_period.
 * - currentStreak: consecutive met periods ending at the current period, with
 *   a one-period grace: if the current period is not yet met, counting starts
 *   from the previous period so an unfinished today doesn't reset the streak.
 * - longestStreak: the longest run of consecutive met periods anywhere in
 *   history.
 */
export function computeHabitStats(
  completions: { completed_at: string }[],
  habit: { frequency: Frequency; target_per_period: number },
  now: Date = new Date(),
): HabitStats {
  const totalCompletions = completions.length
  if (totalCompletions === 0) {
    return { currentStreak: 0, longestStreak: 0, totalCompletions: 0 }
  }

  // Bucket completions by period-start epoch (ms).
  const perPeriod = new Map<number, number>()
  for (const c of completions) {
    const ps = getPeriodStart(habit.frequency, new Date(c.completed_at)).getTime()
    perPeriod.set(ps, (perPeriod.get(ps) ?? 0) + 1)
  }

  const metPeriods = new Set<number>()
  for (const [ps, count] of perPeriod) {
    if (count >= habit.target_per_period) metPeriods.add(ps)
  }

  // currentStreak: start at the current period. If it's not yet met, drop to
  // the previous period so an in-progress period doesn't reset an alive streak.
  let cursor = getPeriodStart(habit.frequency, now)
  if (!metPeriods.has(cursor.getTime())) {
    cursor = previousPeriodStart(habit.frequency, cursor)
  }
  let currentStreak = 0
  while (metPeriods.has(cursor.getTime())) {
    currentStreak += 1
    cursor = previousPeriodStart(habit.frequency, cursor)
  }

  // longestStreak: walk met periods chronologically; a run continues when the
  // previous met period is exactly previousPeriodStart(current).
  const sorted = Array.from(metPeriods).sort((a, b) => a - b)
  let longestStreak = 0
  let run = 0
  let prev: number | null = null
  for (const ps of sorted) {
    if (prev === null) {
      run = 1
    } else {
      const expected = previousPeriodStart(habit.frequency, new Date(ps)).getTime()
      run = prev === expected ? run + 1 : 1
    }
    if (run > longestStreak) longestStreak = run
    prev = ps
  }

  return { currentStreak, longestStreak, totalCompletions }
}
