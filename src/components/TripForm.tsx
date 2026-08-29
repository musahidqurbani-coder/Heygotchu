import { useState, type KeyboardEvent } from 'react'
import type { GeocodedPlace, TripVibe } from '../types'
import DestinationSearch from './DestinationSearch'
import DatePicker from './DatePicker'
import VibeSelector from './VibeSelector'
import GenerateButton from './GenerateButton'
import { isValidDateRange, toISODate } from '../lib/dateUtils'

export interface TripFormValues {
  destination: string
  place: GeocodedPlace | null
  startDate: string
  endDate: string
  vibes: TripVibe[]
}

interface TripFormProps {
  initial: TripFormValues
  closetSize: number
  moreCoverage: boolean
  onSubmit: (values: TripFormValues) => void
  onGoToCloset: () => void
  onGoToPreferences: () => void
}

const today = toISODate(new Date())

export default function TripForm({
  initial,
  closetSize,
  moreCoverage,
  onSubmit,
  onGoToCloset,
  onGoToPreferences,
}: TripFormProps) {
  const [destination, setDestination] = useState(initial.destination)
  const [place, setPlace] = useState<GeocodedPlace | null>(initial.place)
  const [startDate, setStartDate] = useState(initial.startDate)
  const [endDate, setEndDate] = useState(initial.endDate)
  const [vibes, setVibes] = useState<TripVibe[]>(initial.vibes)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function toggleVibe(vibe: TripVibe) {
    setVibes((prev) => (prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]))
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!destination.trim()) next.destination = 'Tell us where you’re headed.'
    if (!startDate) next.startDate = 'Pick a start date.'
    if (!endDate) next.endDate = 'Pick an end date.'
    if (startDate && endDate && !isValidDateRange(startDate, endDate)) {
      next.endDate = 'End date must be on or after the start date.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    onSubmit({ destination: destination.trim(), place, startDate, endDate, vibes })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
      handleSubmit()
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl" onKeyDown={handleKeyDown}>
      <div className="space-y-5 rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur sm:p-8">
        <DestinationSearch value={destination} onChange={setDestination} onSelectPlace={setPlace} error={errors.destination} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DatePicker label="Start date" value={startDate} min={today} onChange={setStartDate} error={errors.startDate} />
          <DatePicker label="End date" value={endDate} min={startDate || today} onChange={setEndDate} error={errors.endDate} />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink/70">What's the vibe?</p>
          <VibeSelector selected={vibes} onToggle={toggleVibe} />
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-cloud px-4 py-3 text-sm">
          <span className="text-ink/60">
            {closetSize === 0
              ? 'Your closet is empty.'
              : `${closetSize} item${closetSize === 1 ? '' : 's'} in your closet.`}
          </span>
          <button
            type="button"
            onClick={onGoToCloset}
            className="font-semibold text-coral underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded"
          >
            {closetSize === 0 ? 'Add clothes' : 'Manage closet'}
          </button>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-cloud px-4 py-3 text-sm">
          <span className="text-ink/60">
            More Coverage is {moreCoverage ? 'on' : 'off'} — applied from your saved preferences.
          </span>
          <button
            type="button"
            onClick={onGoToPreferences}
            className="font-semibold text-coral underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded"
          >
            Edit preferences
          </button>
        </div>

        <div className="flex justify-center pt-1 sm:justify-start">
          <GenerateButton onClick={handleSubmit} />
        </div>
      </div>
    </div>
  )
}
