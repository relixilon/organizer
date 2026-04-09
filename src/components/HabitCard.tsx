import type { Frequency, HabitWithProgress } from '../types/habit'

interface HabitCardProps {
  habit: HabitWithProgress
  onComplete: (habitId: string) => void
}

const PERIOD_LABEL: Record<Frequency, string> = {
  daily: 'today',
  weekly: 'this week',
  monthly: 'this month',
}

export function HabitCard({ habit, onComplete }: HabitCardProps) {
  const done = habit.completed_in_period >= habit.target_per_period
  const periodLabel = PERIOD_LABEL[habit.frequency]

  return (
    <article className="habit-card">
      <header>
        <h4>{habit.name}</h4>
        {habit.description && <p className="habit-card__description">{habit.description}</p>}
      </header>
      <p className="habit-card__progress">
        <strong>
          {habit.completed_in_period} / {habit.target_per_period}
        </strong>{' '}
        <span className="habit-card__period">{periodLabel}</span>
      </p>
      <button
        type="button"
        className="habit-card__button"
        disabled={done}
        onClick={() => onComplete(habit.id)}
      >
        {done ? `Done for ${periodLabel}` : 'Mark done'}
      </button>
    </article>
  )
}
