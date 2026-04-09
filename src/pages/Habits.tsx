import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listHabitsWithProgress, markComplete } from '../api/habits'
import { HabitCard } from '../components/HabitCard'
import { FREQUENCIES, type Frequency, type HabitWithProgress } from '../types/habit'

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; habits: HabitWithProgress[] }

export function Habits() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    listHabitsWithProgress()
      .then((habits) => {
        if (!cancelled) setState({ status: 'ready', habits })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to load habits',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleComplete(habitId: string) {
    if (state.status !== 'ready') return
    const previous = state.habits
    // Optimistic update
    setState({
      status: 'ready',
      habits: previous.map((h) =>
        h.id === habitId ? { ...h, completed_in_period: h.completed_in_period + 1 } : h,
      ),
    })
    try {
      await markComplete(habitId)
    } catch {
      // Revert on failure
      setState({ status: 'ready', habits: previous })
    }
  }

  if (state.status === 'loading') {
    return (
      <section className="page page--habits">
        <h2>Habits</h2>
        <p>Loading…</p>
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section className="page page--habits">
        <h2>Habits</h2>
        <p className="form__error">{state.message}</p>
      </section>
    )
  }

  return (
    <section className="page page--habits">
      <h2>Habits</h2>
      {state.habits.length === 0 ? (
        <p>
          No habits yet. <Link to="/add">Add your first habit</Link>.
        </p>
      ) : (
        FREQUENCIES.map((frequency) => {
          const group = state.habits.filter((h) => h.frequency === frequency)
          if (group.length === 0) return null
          return (
            <section key={frequency} className="habit-group">
              <h3>{FREQUENCY_LABELS[frequency]}</h3>
              <ul className="habit-list">
                {group.map((habit) => (
                  <li key={habit.id}>
                    <HabitCard habit={habit} onComplete={handleComplete} />
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </section>
  )
}
