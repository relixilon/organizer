import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AddHabit } from './AddHabit'
import * as habitsApi from '../api/habits'

vi.mock('../api/habits', () => ({
  createHabit: vi.fn(),
  listHabitsWithProgress: vi.fn(),
  markComplete: vi.fn(),
  deleteHabit: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/add']}>
      <Routes>
        <Route path="/add" element={<AddHabit />} />
        <Route path="/" element={<div>Dashboard mock</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AddHabit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form fields', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /add habit/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/frequency/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/times per period/i)).toBeInTheDocument()
  })

  it('rejects an empty name with an inline error', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    expect(habitsApi.createHabit).not.toHaveBeenCalled()
  })

  it('rejects target_per_period < 1', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/name/i), 'Drink water')
    const target = screen.getByLabelText(/times per period/i)
    await user.clear(target)
    await user.type(target, '0')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(screen.getByText(/at least 1/i)).toBeInTheDocument()
    expect(habitsApi.createHabit).not.toHaveBeenCalled()
  })

  it('submits a valid habit and navigates back to the dashboard', async () => {
    vi.mocked(habitsApi.createHabit).mockResolvedValue({
      id: 'new-id',
      name: 'Drink water',
      description: '8 glasses',
      frequency: 'daily',
      target_per_period: 8,
      created_at: '2026-04-08T12:00:00.000Z',
    })

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/name/i), 'Drink water')
    await user.type(screen.getByLabelText(/description/i), '8 glasses')
    await user.selectOptions(screen.getByLabelText(/frequency/i), 'daily')
    const target = screen.getByLabelText(/times per period/i)
    await user.clear(target)
    await user.type(target, '8')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(habitsApi.createHabit).toHaveBeenCalledExactlyOnceWith({
      name: 'Drink water',
      description: '8 glasses',
      frequency: 'daily',
      target_per_period: 8,
    })
    expect(await screen.findByText('Dashboard mock')).toBeInTheDocument()
  })

  it('shows an error message when create fails and stays on the page', async () => {
    vi.mocked(habitsApi.createHabit).mockRejectedValue(new Error('save failed'))

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/name/i), 'Run')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText(/save failed/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /add habit/i })).toBeInTheDocument()
  })
})
