import { describe, it, expect } from 'vitest'
import { computeHabitStats } from './stats'
import type { Frequency } from '../types/habit'

// Wed Apr 8 2026 12:00 local
const NOW = new Date(2026, 3, 8, 12, 0)

const dailyHabit = { frequency: 'daily' as Frequency, target_per_period: 1 }
const dailyHabitTwice = { frequency: 'daily' as Frequency, target_per_period: 2 }
const weeklyHabit = { frequency: 'weekly' as Frequency, target_per_period: 1 }
const monthlyHabit = { frequency: 'monthly' as Frequency, target_per_period: 1 }

const at = (y: number, m: number, d: number, h = 12) => ({
  completed_at: new Date(y, m, d, h).toISOString(),
})

describe('computeHabitStats', () => {
  it('returns all zeros for an empty completion list', () => {
    expect(computeHabitStats([], dailyHabit, NOW)).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
    })
  })

  it('counts totalCompletions across every row, regardless of target', () => {
    const stats = computeHabitStats(
      [at(2026, 3, 8), at(2026, 3, 8), at(2026, 3, 7), at(2026, 3, 6)],
      dailyHabit,
      NOW,
    )
    expect(stats.totalCompletions).toBe(4)
  })

  it('currentStreak is 1 when only today is met', () => {
    const stats = computeHabitStats([at(2026, 3, 8)], dailyHabit, NOW)
    expect(stats.currentStreak).toBe(1)
    expect(stats.longestStreak).toBe(1)
  })

  it('currentStreak walks back across consecutive met days', () => {
    const stats = computeHabitStats(
      [at(2026, 3, 8), at(2026, 3, 7), at(2026, 3, 6), at(2026, 3, 5)],
      dailyHabit,
      NOW,
    )
    expect(stats.currentStreak).toBe(4)
    expect(stats.longestStreak).toBe(4)
  })

  it('grants a grace period: today not met but yesterday met keeps the streak alive', () => {
    const stats = computeHabitStats(
      [at(2026, 3, 7), at(2026, 3, 6), at(2026, 3, 5)],
      dailyHabit,
      NOW,
    )
    expect(stats.currentStreak).toBe(3)
  })

  it('currentStreak is 0 when the most recent met period is older than yesterday', () => {
    const stats = computeHabitStats([at(2026, 3, 5), at(2026, 3, 4)], dailyHabit, NOW)
    expect(stats.currentStreak).toBe(0)
    expect(stats.longestStreak).toBe(2)
  })

  it('does not count a period as met until its count reaches target_per_period', () => {
    const stats = computeHabitStats([at(2026, 3, 8)], dailyHabitTwice, NOW)
    expect(stats.currentStreak).toBe(0)
    expect(stats.longestStreak).toBe(0)
  })

  it('counts a period as met once target_per_period is reached', () => {
    const stats = computeHabitStats([at(2026, 3, 8, 9), at(2026, 3, 8, 18)], dailyHabitTwice, NOW)
    expect(stats.currentStreak).toBe(1)
    expect(stats.longestStreak).toBe(1)
  })

  it('longestStreak exceeds currentStreak when there is a past gap', () => {
    // Met: Apr 1-5 (run of 5), Apr 7-8 (run of 2). Current streak = 2.
    const stats = computeHabitStats(
      [
        at(2026, 3, 1),
        at(2026, 3, 2),
        at(2026, 3, 3),
        at(2026, 3, 4),
        at(2026, 3, 5),
        at(2026, 3, 7),
        at(2026, 3, 8),
      ],
      dailyHabit,
      NOW,
    )
    expect(stats.currentStreak).toBe(2)
    expect(stats.longestStreak).toBe(5)
  })

  it('handles weekly frequency: consecutive weeks met', () => {
    // Weeks starting Mar 23, Mar 30, Apr 6 (current).
    const stats = computeHabitStats(
      [at(2026, 2, 25), at(2026, 3, 1), at(2026, 3, 8)],
      weeklyHabit,
      NOW,
    )
    expect(stats.currentStreak).toBe(3)
    expect(stats.longestStreak).toBe(3)
  })

  it('handles monthly frequency: consecutive months met', () => {
    const stats = computeHabitStats([at(2026, 2, 15), at(2026, 3, 3)], monthlyHabit, NOW)
    expect(stats.currentStreak).toBe(2)
    expect(stats.longestStreak).toBe(2)
  })
})
