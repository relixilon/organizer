import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createHabit,
  deleteHabit,
  listHabitsWithProgress,
  listHabitsWithStats,
  markComplete,
} from './habits'
import type { Habit } from '../types/habit'

/**
 * Hand-rolled stub for the small slice of the Supabase client surface that
 * api/habits.ts actually uses. Each helper records calls so we can assert the
 * exact chain that was issued.
 */
function makeStub() {
  const calls: Record<string, unknown[]> = {
    from: [],
    select: [],
    insert: [],
    delete: [],
    eq: [],
    order: [],
    gte: [],
    single: [],
  }

  type ChainResult = { data: unknown; error: unknown }
  const responses: Record<string, ChainResult[]> = {
    'habits.select': [],
    'habits.insert': [],
    'habits.delete': [],
    'habit_completions.select': [],
    'habit_completions.insert': [],
  }

  function next(key: string): ChainResult {
    const r = responses[key].shift()
    if (!r) throw new Error(`No queued response for ${key}`)
    return r
  }

  function selectChain(table: string) {
    const chain = {
      order: vi.fn((col: string) => {
        calls.order.push(col)
        return Promise.resolve(next(`${table}.select`))
      }),
      gte: vi.fn((col: string, val: string) => {
        calls.gte.push([col, val])
        return Promise.resolve(next(`${table}.select`))
      }),
      single: vi.fn(() => {
        calls.single.push(true)
        return Promise.resolve(next(`${table}.insert`))
      }),
    }
    return chain
  }

  const client = {
    from: vi.fn((table: string) => {
      calls.from.push(table)
      return {
        select: vi.fn((cols?: string) => {
          calls.select.push([table, cols])
          return selectChain(table)
        }),
        insert: vi.fn((row: unknown) => {
          calls.insert.push([table, row])
          return {
            select: vi.fn(() => ({
              single: vi.fn(() => {
                calls.single.push(true)
                return Promise.resolve(next(`${table}.insert`))
              }),
            })),
            // bare insert (no .select().single() chain) for markComplete
            then: (resolve: (v: ChainResult) => void) => resolve(next(`${table}.insert`)),
          }
        }),
        delete: vi.fn(() => {
          calls.delete.push(table)
          return {
            eq: vi.fn((col: string, val: string) => {
              calls.eq.push([col, val])
              return Promise.resolve(next(`${table}.delete`))
            }),
          }
        }),
      }
    }),
  }

  return {
    client: client as unknown as SupabaseClient,
    calls,
    queue: (key: keyof typeof responses, result: ChainResult) => {
      responses[key].push(result)
    },
  }
}

const habit1: Habit = {
  id: 'h1',
  name: 'Drink water',
  description: null,
  frequency: 'daily',
  target_per_period: 8,
  created_at: '2026-04-01T08:00:00.000Z',
}
const habit2: Habit = {
  id: 'h2',
  name: 'Run',
  description: null,
  frequency: 'weekly',
  target_per_period: 3,
  created_at: '2026-04-02T08:00:00.000Z',
}

describe('listHabitsWithProgress', () => {
  let stub: ReturnType<typeof makeStub>
  beforeEach(() => {
    stub = makeStub()
  })

  it('returns an empty list and skips the completions query when no habits exist', async () => {
    stub.queue('habits.select', { data: [], error: null })
    const result = await listHabitsWithProgress(stub.client)
    expect(result).toEqual([])
    // Only the habits query should have been issued.
    expect(stub.calls.from).toEqual(['habits'])
  })

  it('issues both queries and aggregates completions per habit', async () => {
    const now = new Date(2026, 3, 8, 12, 0) // Wed Apr 8 2026
    stub.queue('habits.select', { data: [habit1, habit2], error: null })
    stub.queue('habit_completions.select', {
      data: [
        { habit_id: 'h1', completed_at: new Date(2026, 3, 8, 9, 0).toISOString() }, // today, daily ✓
        { habit_id: 'h1', completed_at: new Date(2026, 3, 8, 10, 0).toISOString() }, // today, daily ✓
        { habit_id: 'h1', completed_at: new Date(2026, 3, 7, 9, 0).toISOString() }, // yesterday, outside daily window ✗
        { habit_id: 'h2', completed_at: new Date(2026, 3, 6, 9, 0).toISOString() }, // Mon, in this week ✓
      ],
      error: null,
    })

    const result = await listHabitsWithProgress(stub.client, now)

    expect(stub.calls.from).toEqual(['habits', 'habit_completions'])
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: 'h1', completed_in_period: 2 })
    expect(result[1]).toMatchObject({ id: 'h2', completed_in_period: 1 })
    // The .gte filter should have been called with the earliest period start
    // (weekly here, since habit2 is weekly and there are no monthly habits).
    expect(stub.calls.gte).toHaveLength(1)
  })

  it('throws when the habits query errors', async () => {
    stub.queue('habits.select', { data: null, error: { message: 'boom' } })
    await expect(listHabitsWithProgress(stub.client)).rejects.toMatchObject({ message: 'boom' })
  })

  it('throws when the completions query errors', async () => {
    stub.queue('habits.select', { data: [habit1], error: null })
    stub.queue('habit_completions.select', { data: null, error: { message: 'kapow' } })
    await expect(listHabitsWithProgress(stub.client)).rejects.toMatchObject({ message: 'kapow' })
  })
})

describe('listHabitsWithStats', () => {
  let stub: ReturnType<typeof makeStub>
  beforeEach(() => {
    stub = makeStub()
  })

  it('returns an empty list and skips the completions query when no habits exist', async () => {
    stub.queue('habits.select', { data: [], error: null })
    const result = await listHabitsWithStats(stub.client)
    expect(result).toEqual([])
    expect(stub.calls.from).toEqual(['habits'])
  })

  it('fetches all completions (no .gte filter) and attaches stats per habit', async () => {
    const now = new Date(2026, 3, 8, 12, 0) // Wed Apr 8 2026
    // Use target_per_period: 1 so a single completion per day meets the target.
    const dailyA: Habit = { ...habit1, target_per_period: 1 }
    const weeklyB: Habit = { ...habit2, target_per_period: 3 }
    stub.queue('habits.select', { data: [dailyA, weeklyB], error: null })
    stub.queue('habit_completions.select', {
      data: [
        // Three consecutive daily completions ending today → streak 3 for dailyA.
        { habit_id: 'h1', completed_at: new Date(2026, 3, 6, 9, 0).toISOString() },
        { habit_id: 'h1', completed_at: new Date(2026, 3, 7, 9, 0).toISOString() },
        { habit_id: 'h1', completed_at: new Date(2026, 3, 8, 9, 0).toISOString() },
        // One completion for weeklyB in this week, below target (3) → no streak.
        { habit_id: 'h2', completed_at: new Date(2026, 3, 6, 9, 0).toISOString() },
      ],
      error: null,
    })

    const result = await listHabitsWithStats(stub.client, now)

    expect(stub.calls.from).toEqual(['habits', 'habit_completions'])
    // The completions query must NOT constrain by .gte (stats need full history).
    expect(stub.calls.gte).toHaveLength(0)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      id: 'h1',
      stats: { currentStreak: 3, longestStreak: 3, totalCompletions: 3 },
    })
    expect(result[1]).toMatchObject({
      id: 'h2',
      stats: { currentStreak: 0, longestStreak: 0, totalCompletions: 1 },
    })
  })

  it('throws when the habits query errors', async () => {
    stub.queue('habits.select', { data: null, error: { message: 'boom' } })
    await expect(listHabitsWithStats(stub.client)).rejects.toMatchObject({ message: 'boom' })
  })

  it('throws when the completions query errors', async () => {
    stub.queue('habits.select', { data: [habit1], error: null })
    stub.queue('habit_completions.select', { data: null, error: { message: 'kapow' } })
    await expect(listHabitsWithStats(stub.client)).rejects.toMatchObject({ message: 'kapow' })
  })
})

describe('createHabit', () => {
  it('inserts the habit and returns the created row', async () => {
    const stub = makeStub()
    const created = { ...habit1, id: 'new-id' }
    stub.queue('habits.insert', { data: created, error: null })

    const result = await createHabit(
      {
        name: 'Drink water',
        description: null,
        frequency: 'daily',
        target_per_period: 8,
      },
      stub.client,
    )

    expect(result).toEqual(created)
    expect(stub.calls.from).toEqual(['habits'])
    expect(stub.calls.insert).toEqual([
      [
        'habits',
        {
          name: 'Drink water',
          description: null,
          frequency: 'daily',
          target_per_period: 8,
        },
      ],
    ])
  })

  it('throws when insert errors', async () => {
    const stub = makeStub()
    stub.queue('habits.insert', { data: null, error: { message: 'nope' } })
    await expect(
      createHabit(
        { name: 'x', description: null, frequency: 'daily', target_per_period: 1 },
        stub.client,
      ),
    ).rejects.toMatchObject({ message: 'nope' })
  })
})

describe('markComplete', () => {
  it('inserts a row in habit_completions for the given habit id', async () => {
    const stub = makeStub()
    stub.queue('habit_completions.insert', { data: null, error: null })
    await markComplete('h1', stub.client)
    expect(stub.calls.from).toEqual(['habit_completions'])
    expect(stub.calls.insert).toEqual([['habit_completions', { habit_id: 'h1' }]])
  })

  it('throws when insert errors', async () => {
    const stub = makeStub()
    stub.queue('habit_completions.insert', { data: null, error: { message: 'fail' } })
    await expect(markComplete('h1', stub.client)).rejects.toMatchObject({ message: 'fail' })
  })
})

describe('deleteHabit', () => {
  it('deletes the habit by id', async () => {
    const stub = makeStub()
    stub.queue('habits.delete', { data: null, error: null })
    await deleteHabit('h1', stub.client)
    expect(stub.calls.from).toEqual(['habits'])
    expect(stub.calls.delete).toEqual(['habits'])
    expect(stub.calls.eq).toEqual([['id', 'h1']])
  })

  it('throws when delete errors', async () => {
    const stub = makeStub()
    stub.queue('habits.delete', { data: null, error: { message: 'gone' } })
    await expect(deleteHabit('h1', stub.client)).rejects.toMatchObject({ message: 'gone' })
  })
})
