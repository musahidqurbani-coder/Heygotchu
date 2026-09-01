import type { TripPlan } from '../types'
import { formatDateRange } from '../lib/dateUtils'
import EmptyState from './EmptyState'

interface SavedTripsPanelProps {
  trips: TripPlan[]
  onOpen: (trip: TripPlan) => void
  onDelete: (id: string) => void
  onBack: () => void
}

export default function SavedTripsPanel({ trips, onOpen, onDelete, onBack }: SavedTripsPanelProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <button onClick={onBack} className="mb-1 text-sm font-medium text-ink/50 transition hover:text-ink">
        ← Back
      </button>
      <h1 className="mb-6 font-display text-3xl font-semibold">Saved Trips</h1>

      {trips.length === 0 ? (
        <EmptyState
          icon="🗺️"
          title="No saved trips yet"
          description="Generate a travel palette and hit Save Trip to keep it here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="group relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <button onClick={() => onOpen(trip)} className="block w-full text-left focus:outline-none">
                <div className="relative h-36 w-full">
                  <img src={trip.heroImage} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#000]/60 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-[#fff]">
                    <p className="text-xs uppercase tracking-wide text-[#fff]/80">
                      {formatDateRange(trip.startDate, trip.endDate)}
                    </p>
                    <p className="font-display text-lg font-semibold">{trip.destination}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 p-3">
                  {trip.palette.slice(0, 5).map((c) => (
                    <span key={c.hex} className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c.hex }} />
                  ))}
                </div>
              </button>
              <button
                onClick={() => onDelete(trip.id)}
                aria-label={`Delete ${trip.destination} trip`}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink/60 opacity-0 shadow transition group-hover:opacity-100 hover:bg-coral hover:text-white focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
