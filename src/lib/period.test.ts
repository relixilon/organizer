import { describe, it, expect } from 'vitest'
import {
  countInPeriod,
  earliestPeriodStart,
  getPeriodStart,
  previousPeriodStart,
} from './period'

describe('getPeriodStart', () => {
  it('returns midnight today for daily', () => {
    const now = new Date(2026, 3, 8, 14, 30, 5) // Wed Apr 8 2026 14:30:05 local
    const start = getPeriodStart('daily', now)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(3)
    expect(start.getDate()).toBe(8)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
    expect(start.getMilliseconds()).toBe(0)
  })

  it('returns the most recent Monday at midnight for weekly', () => {
    // Wed Apr 8 2026 → Mon Apr 6 2026
    const wed = new Date(2026, 3, 8, 14, 30)
    const start = getPeriodStart('weekly', wed)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(3)
    expect(start.getDate()).toBe(6)
    expect(start.getDay()).toBe(1) // Monday
    expect(start.getHours()).toBe(0)
  })

  it('treats Monday itself as the start of the week', () => {
    const mon = new Date(2026, 3, 6, 9, 0) // Mon Apr 6 2026
    const start = getPeriodStart('weekly', mon)
    expect(start.getDate()).toBe(6)
    expect(start.getDay()).toBe(1)
  })

  it('treats Sunday as the last day of the week (rolls back to previous Monday)', () => {
    const sun = new Date(2026, 3, 12, 23, 59) // Sun Apr 12 2026
    const start = getPeriodStart('weekly', sun)
    expect(start.getDate()).toBe(6) // still Apr 6 Monday
    expect(start.getDay()).toBe(1)
  })

  it('handles weekly across a month boundary', () => {
    const fri = new Date(2026, 4, 1, 12, 0) // Fri May 1 2026
    const start = getPeriodStart('weekly', fri)
    expect(start.getMonth()).toBe(3) // April
    expect(start.getDate()).toBe(27) // Mon Apr 27
    expect(start.getDay()).toBe(1)
  })

  it('returns the first of the month for monthly', () => {
    const now = new Date(2026, 3, 28, 22, 15)
    const start = getPeriodStart('monthly', now)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(3)
    expect(start.getDate()).toBe(1)
    expect(start.getHours()).toBe(0)
  })
})

describe('earliestPeriodStart', () => {
  const now = new Date(2026, 3, 8, 12, 0) // Wed Apr 8 2026

  it('returns daily start when only daily habits exist', () => {
    const start = earliestPeriodStart(['daily', 'daily'], now)
    expect(start).toEqual(getPeriodStart('daily', now))
  })

  it('returns weekly start when weekly is the broadest', () => {
    const start = earliestPeriodStart(['daily', 'weekly'], now)
    expect(start).toEqual(getPeriodStart('weekly', now))
  })

  it('returns monthly start when any monthly habit is present', () => {
    const start = earliestPeriodStart(['daily', 'weekly', 'monthly'], now)
    expect(start).toEqual(getPeriodStart('monthly', now))
  })

  it('returns daily start for an empty list (degenerate but safe)', () => {
    const start = earliestPeriodStart([], now)
    expect(start).toEqual(getPeriodStart('daily', now))
  })
})

describe('previousPeriodStart', () => {
  it('subtracts one day for daily', () => {
    const start = getPeriodStart('daily', new Date(2026, 3, 8, 12, 0))
    const prev = previousPeriodStart('daily', start)
    expect(prev.getFullYear()).toBe(2026)
    expect(prev.getMonth()).toBe(3)
    expect(prev.getDate()).toBe(7)
    expect(prev.getHours()).toBe(0)
  })

  it('crosses month boundaries for daily', () => {
    const start = getPeriodStart('daily', new Date(2026, 4, 1, 12, 0)) // May 1
    const prev = previousPeriodStart('daily', start)
    expect(prev.getMonth()).toBe(3) // April
    expect(prev.getDate()).toBe(30)
  })

  it('subtracts seven days for weekly', () => {
    const start = getPeriodStart('weekly', new Date(2026, 3, 8, 12, 0)) // Mon Apr 6
    const prev = previousPeriodStart('weekly', start)
    expect(prev.getDate()).toBe(30) // Mar 30 (previous Monday)
    expect(prev.getMonth()).toBe(2) // March
    expect(prev.getDay()).toBe(1) // Monday
  })

  it('subtracts one month for monthly', () => {
    const start = getPeriodStart('monthly', new Date(2026, 3, 15, 12, 0)) // Apr 1
    const prev = previousPeriodStart('monthly', start)
    expect(prev.getMonth()).toBe(2) // March
    expect(prev.getDate()).toBe(1)
  })

  it('crosses year boundaries for monthly', () => {
    const start = getPeriodStart('monthly', new Date(2026, 0, 15, 12, 0)) // Jan 1 2026
    const prev = previousPeriodStart('monthly', start)
    expect(prev.getFullYear()).toBe(2025)
    expect(prev.getMonth()).toBe(11) // December
    expect(prev.getDate()).toBe(1)
  })
})

describe('countInPeriod', () => {
  const now = new Date(2026, 3, 8, 12, 0) // Wed Apr 8 2026

  it('counts only completions inside the daily window', () => {
    const completions = [
      { completed_at: new Date(2026, 3, 8, 0, 1).toISOString() }, // today 00:01 ✓
      { completed_at: new Date(2026, 3, 8, 11, 0).toISOString() }, // today 11:00 ✓
      { completed_at: new Date(2026, 3, 7, 23, 59).toISOString() }, // yesterday ✗
    ]
    expect(countInPeriod(completions, 'daily', now)).toBe(2)
  })

  it('counts completions across the current week', () => {
    const completions = [
      { completed_at: new Date(2026, 3, 6, 8, 0).toISOString() }, // Mon ✓
      { completed_at: new Date(2026, 3, 8, 8, 0).toISOString() }, // Wed ✓
      { completed_at: new Date(2026, 3, 5, 23, 59).toISOString() }, // Sun (last week) ✗
    ]
    expect(countInPeriod(completions, 'weekly', now)).toBe(2)
  })

  it('counts completions across the current month', () => {
    const completions = [
      { completed_at: new Date(2026, 3, 1, 0, 0).toISOString() }, // Apr 1 ✓
      { completed_at: new Date(2026, 3, 8, 12, 0).toISOString() }, // Apr 8 ✓
      { completed_at: new Date(2026, 2, 31, 23, 59).toISOString() }, // Mar 31 ✗
    ]
    expect(countInPeriod(completions, 'monthly', now)).toBe(2)
  })

  it('returns 0 for an empty list', () => {
    expect(countInPeriod([], 'daily', now)).toBe(0)
  })
})
