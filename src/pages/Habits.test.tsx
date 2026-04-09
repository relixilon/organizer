import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Habits } from './Habits'
import * as habitsApi from '../api/habits'
import type { HabitWithProgress } from '../types/habit'

vi.mock('../api/habits', () => ({
  listHabitsWithProgress: vi.fn(),
  listHabitsWithStats: vi.fn(),
  createHabit: vi.fn(),
  markComplete: vi.fn(),
  deleteHabit: vi.fn(),
}))

const habit1: HabitWithProgress = {
  id: 'h1',
  name: 'Drink water',
  description: null,
  frequency: 'daily',
  target_per_period: 8,
  created_at: '2026-04-01T08:00:00.000Z',
  completed_in_period: 3,
}
const habit2: HabitWithProgress = {
  id: 'h2',
  name: 'Run',
  description: null,
  frequency: 'weekly',
  target_per_period: 3,
  created_at: '2026-04-02T08:00:00.000Z',
  completed_in_period: 1,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Habits />
    </MemoryRouter>,
  )
}

describe('Habits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state, then the list of habits', async () => {
    let resolve!: (v: HabitWithProgress[]) => void
    vi.mocked(habitsApi.listHabitsWithProgress).mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    resolve([habit1, habit2])
    expect(await screen.findByRole('heading', { name: /drink water/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /run/i })).toBeInTheDocument()
  })

  it('shows an empty-state message when there are no habits', async () => {
    vi.mocked(habitsApi.listHabitsWithProgress).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(/no habits yet/i)).toBeInTheDocument()
  })

  it('shows an error message when the load fails', async () => {
    vi.mocked(habitsApi.listHabitsWithProgress).mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText(/boom/i)).toBeInTheDocument()
  })

  it('groups habits by frequency under section headings', async () => {
    const monthlyHabit: HabitWithProgress = {
      id: 'h3',
      name: 'Pay rent',
      description: null,
      frequency: 'monthly',
      target_per_period: 1,
      created_at: '2026-04-03T08:00:00.000Z',
      completed_in_period: 0,
    }
    vi.mocked(habitsApi.listHabitsWithProgress).mockResolvedValue([habit1, habit2, monthlyHabit])
    renderPage()

    expect(await screen.findByRole('heading', { level: 3, name: /daily/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /weekly/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /monthly/i })).toBeInTheDocument()
  })

  it('omits frequency sections that have no habits', async () => {
    vi.mocked(habitsApi.listHabitsWithProgress).mockResolvedValue([habit1])
    renderPage()

    expect(await screen.findByRole('heading', { level: 3, name: /daily/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: /weekly/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: /monthly/i })).not.toBeInTheDocument()
  })

  it('calls markComplete when a habit card complete button is clicked', async () => {
    vi.mocked(habitsApi.listHabitsWithProgress).mockResolvedValue([habit1])
    vi.mocked(habitsApi.markComplete).mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderPage()
    const button = await screen.findByRole('button', { name: /mark done/i })
    await user.click(button)

    expect(habitsApi.markComplete).toHaveBeenCalledExactlyOnceWith('h1')
    // Optimistic update bumps the visible counter from 3/8 to 4/8
    expect(screen.getByText('4 / 8')).toBeInTheDocument()
  })

  it('reverts the optimistic update if markComplete fails', async () => {
    vi.mocked(habitsApi.listHabitsWithProgress).mockResolvedValue([habit1])
    vi.mocked(habitsApi.markComplete).mockRejectedValue(new Error('nope'))

    const user = userEvent.setup()
    renderPage()
    const button = await screen.findByRole('button', { name: /mark done/i })
    await user.click(button)

    // Wait for the rejection to propagate, then assert the count went back to 3
    expect(await screen.findByText('3 / 8')).toBeInTheDocument()
  })
})
