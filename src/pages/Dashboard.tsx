import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listHabitsWithStats } from '../api/habits'
import { FREQUENCIES, type Frequency, type HabitWithStats } from '../types/habit'

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

const STREAK_UNIT: Record<Frequency, string> = {
  daily: 'days',
  weekly: 'weeks',
  monthly: 'months',
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; habits: HabitWithStats[] }

export function Dashboard() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    listHabitsWithStats()
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

  if (state.status === 'loading') {
    return (
      <section className="page page--dashboard">
        <h2>Dashboard</h2>
        <p>Loading…</p>
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section className="page page--dashboard">
        <h2>Dashboard</h2>
        <p className="form__error">{state.message}</p>
      </section>
    )
  }

  return (
    <section className="page page--dashboard">
      <h2>Dashboard</h2>
      {state.habits.length === 0 ? (
        <p>
          No habits yet. <Link to="/add">Add your first habit</Link>.
        </p>
      ) : (
        FREQUENCIES.map((frequency) => {
          const group = state.habits.filter((h) => h.frequency === frequency)
          if (group.length === 0) return null
          const unit = STREAK_UNIT[frequency]
          return (
            <section key={frequency} className="habit-group">
              <h3>{FREQUENCY_LABELS[frequency]}</h3>
              <ul className="habit-list">
                {group.map((habit) => (
                  <li key={habit.id}>
                    <article className="stats-card">
                      <header>
                        <h4>{habit.name}</h4>
                      </header>
                      <dl className="stats-card__stats">
                        <div>
                          <dt>Current streak</dt>
                          <dd>
                            <strong>{habit.stats.currentStreak}</strong>
                            <span className="stats-card__unit"> {unit}</span>
                          </dd>
                        </div>
                        <div>
                          <dt>Longest streak</dt>
                          <dd>
                            <strong>{habit.stats.longestStreak}</strong>
                            <span className="stats-card__unit"> {unit}</span>
                          </dd>
                        </div>
                        <div>
                          <dt>Total completions</dt>
                          <dd>
                            <strong>{habit.stats.totalCompletions}</strong>
                          </dd>
                        </div>
                      </dl>
                    </article>
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
