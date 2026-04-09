import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createHabit } from '../api/habits'
import { FREQUENCIES, type Frequency } from '../types/habit'

interface FormErrors {
  name?: string
  target?: string
}

export function AddHabit() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('daily')
  const [target, setTarget] = useState('1')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function validate(): FormErrors {
    const next: FormErrors = {}
    if (!name.trim()) next.name = 'Name is required'
    const targetNum = Number(target)
    if (!Number.isFinite(targetNum) || targetNum < 1) {
      next.target = 'Target must be at least 1'
    }
    return next
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError(null)
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      await createHabit({
        name: name.trim(),
        description: description.trim() || null,
        frequency,
        target_per_period: Number(target),
      })
      navigate('/')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page page--add-habit">
      <h2>Add habit</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="field__error">{errors.name}</p>}
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="field">
          <label htmlFor="frequency">Frequency</label>
          <select
            id="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="target">Times per period</label>
          <input
            id="target"
            type="number"
            min={1}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-invalid={!!errors.target}
          />
          {errors.target && <p className="field__error">{errors.target}</p>}
        </div>

        {submitError && <p className="form__error">{submitError}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </form>
    </section>
  )
}
