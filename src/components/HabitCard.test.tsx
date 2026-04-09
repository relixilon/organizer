import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HabitCard } from './HabitCard'
import type { HabitWithProgress } from '../types/habit'

const baseHabit: HabitWithProgress = {
  id: 'h1',
  name: 'Drink water',
  description: '8 glasses a day',
  frequency: 'daily',
  target_per_period: 8,
  created_at: '2026-04-01T08:00:00.000Z',
  completed_in_period: 3,
}

describe('HabitCard', () => {
  it('renders the habit name, description, and progress', () => {
    render(<HabitCard habit={baseHabit} onComplete={() => {}} />)
    expect(screen.getByRole('heading', { name: /drink water/i })).toBeInTheDocument()
    expect(screen.getByText(/8 glasses a day/)).toBeInTheDocument()
    expect(screen.getByText('3 / 8')).toBeInTheDocument()
    expect(screen.getByText(/today/i)).toBeInTheDocument()
  })

  it('uses the right period label per frequency', () => {
    const { rerender } = render(
      <HabitCard
        habit={{ ...baseHabit, frequency: 'weekly', completed_in_period: 1 }}
        onComplete={() => {}}
      />,
    )
    expect(screen.getByText(/this week/i)).toBeInTheDocument()
    rerender(
      <HabitCard
        habit={{ ...baseHabit, frequency: 'monthly', completed_in_period: 0 }}
        onComplete={() => {}}
      />,
    )
    expect(screen.getByText(/this month/i)).toBeInTheDocument()
  })

  it('calls onComplete with the habit id when the button is clicked', async () => {
    const onComplete = vi.fn()
    const user = userEvent.setup()
    render(<HabitCard habit={baseHabit} onComplete={onComplete} />)

    await user.click(screen.getByRole('button', { name: /mark done/i }))
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('h1')
  })

  it('disables the button when the target is met', () => {
    render(<HabitCard habit={{ ...baseHabit, completed_in_period: 8 }} onComplete={() => {}} />)
    expect(screen.getByRole('button', { name: /done for/i })).toBeDisabled()
  })
})
