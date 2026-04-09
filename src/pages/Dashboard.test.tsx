import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from './Dashboard'
import * as habitsApi from '../api/habits'
import type { HabitWithStats } from '../types/habit'

vi.mock('../api/habits', () => ({
  listHabitsWithProgress: vi.fn(),
  listHabitsWithStats: vi.fn(),
  createHabit: vi.fn(),
  markComplete: vi.fn(),
  deleteHabit: vi.fn(),
}))

const waterHabit: HabitWithStats = {
  id: 'h1',
  name: 'Drink water',
  description: null,
  frequency: 'daily',
  target_per_period: 8,
  created_at: '2026-04-01T08:00:00.000Z',
  stats: { currentStreak: 5, longestStreak: 12, totalCompletions: 47 },
}

const runHabit: HabitWithStats = {
  id: 'h2',
  name: 'Run',
  description: null,
  frequency: 'weekly',
  target_per_period: 3,
  created_at: '2026-04-02T08:00:00.000Z',
  stats: { currentStreak: 2, longestStreak: 4, totalCompletions: 20 },
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state, then the habit stats', async () => {
    let resolve!: (v: HabitWithStats[]) => void
    vi.mocked(habitsApi.listHabitsWithStats).mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    resolve([waterHabit])
    expect(await screen.findByRole('heading', { name: /drink water/i })).toBeInTheDocument()
  })

  it('shows an empty-state message with a link to add the first habit', async () => {
    vi.mocked(habitsApi.listHabitsWithStats).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(/no habits yet/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /add your first habit/i })).toBeInTheDocument()
  })

  it('shows an error message when the load fails', async () => {
    vi.mocked(habitsApi.listHabitsWithStats).mockRejectedValue(new Error('kapow'))
    renderPage()
    expect(await screen.findByText(/kapow/i)).toBeInTheDocument()
  })

  it('renders current streak, longest streak, and total completions for each habit', async () => {
    vi.mocked(habitsApi.listHabitsWithStats).mockResolvedValue([waterHabit])
    renderPage()

    const card = (await screen.findByRole('heading', { name: /drink water/i })).closest('article')
    expect(card).not.toBeNull()
    const scoped = within(card as HTMLElement)
    expect(scoped.getByText(/current streak/i)).toBeInTheDocument()
    expect(scoped.getByText('5')).toBeInTheDocument()
    expect(scoped.getByText(/longest streak/i)).toBeInTheDocument()
    expect(scoped.getByText('12')).toBeInTheDocument()
    expect(scoped.getByText(/total completions/i)).toBeInTheDocument()
    expect(scoped.getByText('47')).toBeInTheDocument()
  })

  it('groups stats cards by frequency, omitting empty sections', async () => {
    vi.mocked(habitsApi.listHabitsWithStats).mockResolvedValue([waterHabit, runHabit])
    renderPage()

    expect(await screen.findByRole('heading', { level: 3, name: /daily/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /weekly/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: /monthly/i })).not.toBeInTheDocument()
  })

  it('does not render a "mark done" control (that lives on /habits)', async () => {
    vi.mocked(habitsApi.listHabitsWithStats).mockResolvedValue([waterHabit])
    renderPage()
    await screen.findByRole('heading', { name: /drink water/i })
    expect(screen.queryByRole('button', { name: /mark done/i })).not.toBeInTheDocument()
  })
})
