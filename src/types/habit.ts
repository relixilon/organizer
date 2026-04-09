export type Frequency = 'daily' | 'weekly' | 'monthly'

export const FREQUENCIES: readonly Frequency[] = ['daily', 'weekly', 'monthly'] as const

export interface Habit {
  id: string
  name: string
  description: string | null
  frequency: Frequency
  target_per_period: number
  created_at: string
}

export interface HabitInput {
  name: string
  description?: string | null
  frequency: Frequency
  target_per_period: number
}

export interface HabitWithProgress extends Habit {
  completed_in_period: number
}

export interface HabitStats {
  currentStreak: number
  longestStreak: number
  totalCompletions: number
}

export interface HabitWithStats extends Habit {
  stats: HabitStats
}
