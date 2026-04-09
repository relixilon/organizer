import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '../lib/supabase'
import type {
  Frequency,
  Habit,
  HabitInput,
  HabitWithProgress,
  HabitWithStats,
} from '../types/habit'
import { countInPeriod, earliestPeriodStart } from '../lib/period'
import { computeHabitStats } from '../lib/stats'

interface CompletionRow {
  habit_id: string
  completed_at: string
}

export async function listHabitsWithProgress(
  client: SupabaseClient = getSupabase(),
  now: Date = new Date(),
): Promise<HabitWithProgress[]> {
  const { data: habits, error } = await client.from('habits').select('*').order('created_at')
  if (error) throw error
  if (!habits || habits.length === 0) return []

  const typedHabits = habits as Habit[]
  const start = earliestPeriodStart(
    typedHabits.map((h) => h.frequency satisfies Frequency),
    now,
  )

  const { data: completions, error: cErr } = await client
    .from('habit_completions')
    .select('habit_id, completed_at')
    .gte('completed_at', start.toISOString())
  if (cErr) throw cErr

  const byHabit = new Map<string, CompletionRow[]>()
  for (const c of (completions ?? []) as CompletionRow[]) {
    const arr = byHabit.get(c.habit_id) ?? []
    arr.push(c)
    byHabit.set(c.habit_id, arr)
  }

  return typedHabits.map((h) => ({
    ...h,
    completed_in_period: countInPeriod(byHabit.get(h.id) ?? [], h.frequency, now),
  }))
}

export async function listHabitsWithStats(
  client: SupabaseClient = getSupabase(),
  now: Date = new Date(),
): Promise<HabitWithStats[]> {
  const { data: habits, error } = await client.from('habits').select('*').order('created_at')
  if (error) throw error
  if (!habits || habits.length === 0) return []

  const typedHabits = habits as Habit[]

  // Stats need the full history — no .gte filter here. Ordering is stable to
  // keep tests and downstream aggregation deterministic.
  const { data: completions, error: cErr } = await client
    .from('habit_completions')
    .select('habit_id, completed_at')
    .order('completed_at')
  if (cErr) throw cErr

  const byHabit = new Map<string, CompletionRow[]>()
  for (const c of (completions ?? []) as CompletionRow[]) {
    const arr = byHabit.get(c.habit_id) ?? []
    arr.push(c)
    byHabit.set(c.habit_id, arr)
  }

  return typedHabits.map((h) => ({
    ...h,
    stats: computeHabitStats(byHabit.get(h.id) ?? [], h, now),
  }))
}

export async function createHabit(
  input: HabitInput,
  client: SupabaseClient = getSupabase(),
): Promise<Habit> {
  const row = {
    name: input.name,
    description: input.description ?? null,
    frequency: input.frequency,
    target_per_period: input.target_per_period,
  }
  const { data, error } = await client.from('habits').insert(row).select().single()
  if (error) throw error
  return data as Habit
}

export async function markComplete(
  habitId: string,
  client: SupabaseClient = getSupabase(),
): Promise<void> {
  const { error } = await client.from('habit_completions').insert({ habit_id: habitId })
  if (error) throw error
}

export async function deleteHabit(
  id: string,
  client: SupabaseClient = getSupabase(),
): Promise<void> {
  const { error } = await client.from('habits').delete().eq('id', id)
  if (error) throw error
}
