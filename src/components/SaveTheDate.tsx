import { useEffect, useState, type FormEvent } from 'react'
import { engagementApi, type SavedDateInfo } from '../lib/apiClient'
import Modal from './Modal'

interface SaveTheDateProps {
  onToast: (message: string) => void
}

function countdownLabel(d: SavedDateInfo): string {
  if (d.daysToGo < 0) return 'passed'
  if (d.daysToGo === 0) return 'today! 🎉'
  if (d.daysToGo === 1) return 'tomorrow'
  return `in ${d.daysToGo} days`
}

// "Save the date": trips and occasions pinned to the calendar, each with a
// reminder ladder (5 days · 2 days · 1 day · same day). When the app opens
// on a rung, a toast surfaces it. (True push notifications while the app is
// closed are a later, backend-driven step.)
export default function SaveTheDate({ onToast }: SaveTheDateProps) {
  const [dates, setDates] = useState<SavedDateInfo[] | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'occasion' | 'trip'>('occasion')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    engagementApi
      .listDates()
      .then((rows) => {
        if (cancelled) return
        setDates(rows)
        rows
          .filter((d) => d.remindToday)
          .forEach((d) => onToast(d.daysToGo === 0 ? `🎉 ${d.title} is today!` : `📌 ${d.title} — ${countdownLabel(d)}`))
      })
      .catch(() => {
        if (!cancelled) setDates([])
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    setSaving(true)
    try {
      const created = await engagementApi.addDate({ title: title.trim(), kind, date })
      setDates((prev) => [...(prev ?? []), created].sort((a, b) => a.date.localeCompare(b.date)))
      setShowAdd(false)
      setTitle('')
      setDate('')
      onToast('Date saved — reminders set for 5, 2 and 1 day before, plus the day itself.')
    } catch {
      onToast('Could not save that date — try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string) {
    setDates((prev) => (prev ?? []).filter((d) => d.id !== id))
    try {
      await engagementApi.removeDate(id)
    } catch {
      onToast('Could not remove that date — it may come back after a refresh.')
    }
  }

  const upcoming = (dates ?? []).filter((d) => d.daysToGo >= 0)

  return (
    <div className="mx-auto mt-10 max-w-2xl">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Save the date 📌</h3>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          >
            + Add a date
          </button>
        </div>
        {dates === null ? (
          <p className="mt-3 text-sm text-ink/40">Loading…</p>
        ) : upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-ink/50">
            Pin a wedding, a festival, a trip departure — Heygotchu reminds you 5 days, 2 days and 1 day
            before, and on the day itself.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-2xl bg-cloud px-4 py-3 ring-1 ring-black/5">
                <span className="text-lg" aria-hidden="true">{d.kind === 'trip' ? '✈️' : '🎉'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{d.title}</p>
                  <p className="text-xs text-ink/50">
                    {new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' · '}
                    <span className={d.daysToGo <= 1 ? 'font-semibold text-coral' : ''}>{countdownLabel(d)}</span>
                  </p>
                </div>
                <div className="hidden gap-1 sm:flex" aria-hidden="true">
                  {d.reminders
                    .slice()
                    .sort((a, b) => b - a)
                    .map((r) => (
                      <span
                        key={r}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          d.daysToGo === r ? 'bg-coral text-white' : 'bg-white text-ink/40 ring-1 ring-black/10'
                        }`}
                      >
                        {r === 0 ? 'day' : `${r}d`}
                      </span>
                    ))}
                </div>
                <button
                  onClick={() => void handleRemove(d.id)}
                  aria-label={`Remove ${d.title}`}
                  className="grid h-7 w-7 place-items-center rounded-full text-ink/35 transition hover:bg-black/5 hover:text-ink/70"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAdd && (
        <Modal title="Save a date 📌" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label htmlFor="std-title" className="mb-1 block text-xs font-medium text-ink/60">What's happening?</label>
              <input
                id="std-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nisha's wedding, Bali trip…"
                required
                autoFocus
                className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-coral"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="std-kind" className="mb-1 block text-xs font-medium text-ink/60">Type</label>
                <select
                  id="std-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as 'occasion' | 'trip')}
                  className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-coral"
                >
                  <option value="occasion">🎉 Occasion</option>
                  <option value="trip">✈️ Trip</option>
                </select>
              </div>
              <div>
                <label htmlFor="std-date" className="mb-1 block text-xs font-medium text-ink/60">Date</label>
                <input
                  id="std-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-coral"
                />
              </div>
            </div>
            <p className="rounded-xl bg-sun/20 px-3.5 py-2.5 text-xs text-ink/60">
              You'll be reminded 5 days, 2 days and 1 day before — and on the day itself.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save the date'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
