import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import * as habitsApi from './api/habits'

vi.mock('./api/habits', () => ({
  listHabitsWithProgress: vi.fn(),
  listHabitsWithStats: vi.fn(),
  createHabit: vi.fn(),
  markComplete: vi.fn(),
  deleteHabit: vi.fn(),
}))

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(habitsApi.listHabitsWithProgress).mockResolvedValue([])
    vi.mocked(habitsApi.listHabitsWithStats).mockResolvedValue([])
  })

  it('renders the dashboard at /', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /habit tracker/i })).toBeInTheDocument()
  })

  it('navigates to /add when the nav link is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { name: /dashboard/i })
    await user.click(screen.getByRole('link', { name: /add habit/i }))
    expect(screen.getByRole('heading', { name: /add habit/i })).toBeInTheDocument()
  })
})
