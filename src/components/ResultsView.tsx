import { useState } from 'react'
import type { DayWeather, TripPlan } from '../types'
import { formatDateRange } from '../lib/dateUtils'
import { fallbackImage } from '../lib/imageApi'
import { SAMPLE_DESTINATIONS } from '../data/sampleDestinations'
import PaletteStrip from './ColorSwatch'
import WeatherCard from './WeatherCard'
import Itinerary from './Itinerary'
import PackingList from './PackingList'
import SaveTripButton from './SaveTripButton'
import ShareButton from './ShareButton'
import TravelIdeas from './TravelIdeas'

interface ResultsViewProps {
  trip: TripPlan
  saved: boolean
  onRegenerate: () => void
  onSave: () => void
  onNewTrip: () => void
  onToast: (message: string) => void
}

function curatedPlaces(destination: string): string[] {
  const curated = SAMPLE_DESTINATIONS[destination.trim().toLowerCase()]
  return curated?.places ?? []
}

export default function ResultsView({ trip, saved, onRegenerate, onNewTrip, onSave, onToast }: ResultsViewProps) {
  const [imgError, setImgError] = useState(false)
  const places = curatedPlaces(trip.destination)
  const weatherDays: DayWeather[] = trip.days
    .map((d) => d.weather)
    .filter((w): w is DayWeather => w !== null)

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-8">
      <button
        onClick={onNewTrip}
        className="mb-4 text-sm font-medium text-ink/50 transition hover:text-ink focus:outline-none"
      >
        ← Plan another trip
      </button>

      <div className="animate-pop-in overflow-hidden rounded-[2rem] shadow-lg">
        <div className="relative h-64 w-full sm:h-96">
          <img
            src={imgError ? fallbackImage(trip.destination) : trip.heroImage}
            onError={() => setImgError(true)}
            alt={`Scenic view representing ${trip.destination}`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
            <p className="text-sm font-medium uppercase tracking-widest text-white/80">
              {formatDateRange(trip.startDate, trip.endDate)}
            </p>
            <h1 className="font-display text-4xl font-bold drop-shadow-sm sm:text-5xl">{trip.destination}</h1>
            {trip.vibes.length > 0 && <p className="mt-2 text-sm text-white/85">{trip.vibes.join(' · ')}</p>}
          </div>
        </div>
      </div>

      <section className="mt-10 text-center">
        <h2 className="font-display text-2xl font-semibold">Your Travel Palette</h2>
        <div className="mt-6">
          <PaletteStrip colors={trip.palette} />
        </div>
      </section>

      <section className="mt-10 rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5 sm:p-8">
        <h2 className="font-display text-xl font-semibold">Travel Vibe</h2>
        <p className="mx-auto mt-2 max-w-xl text-ink/70">{trip.vibeSummary}</p>
      </section>

      {places.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 font-display text-xl font-semibold">Things to do</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {places.map((place) => (
              <div
                key={place}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-xl" aria-hidden="true">
                  📍
                </span>
                <span className="text-sm font-medium text-ink/80">{place}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <WeatherCard days={weatherDays} source={trip.weatherSource} />
      </section>

      <TravelIdeas
        tripId={trip.id}
        destination={trip.destination}
        dayCount={trip.days.length}
        vibes={trip.vibes}
        startDate={trip.startDate}
      />

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-semibold">Itinerary</h2>
        <Itinerary days={trip.days} />
      </section>

      <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <h2 className="mb-4 font-display text-xl font-semibold">Packing List</h2>
        <PackingList entries={trip.packingList} gaps={trip.gaps} />
      </section>

      <div className="sticky bottom-4 z-30 mt-10 flex flex-wrap items-center justify-center gap-3 rounded-full bg-white/90 p-3 shadow-xl ring-1 ring-black/5 backdrop-blur">
        <button
          onClick={onRegenerate}
          className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-ink/80 transition hover:border-black/20 hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral active:scale-95"
        >
          <span aria-hidden="true">🔄</span>
          Regenerate
        </button>
        <SaveTripButton saved={saved} onClick={onSave} />
        <ShareButton trip={trip} onShared={onToast} />
      </div>
    </div>
  )
}
