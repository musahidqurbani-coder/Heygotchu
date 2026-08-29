import { useEffect, useState } from 'react'
import type { ClothingItem, ClothingPreferences, TripPlan } from './types'
import { DEFAULT_CLOTHING_PREFERENCES } from './types'
import type { TripFormValues } from './components/TripForm'
import { buildStarterCloset } from './data/seedCloset'
import { buildTripPlan } from './lib/buildTripPlan'
import { useAuth } from './context/AuthContext'
import { closetApi, preferencesApi, eventsApi, ApiClientError, type EventPlanRecord } from './lib/apiClient'

import Navbar from './components/Navbar'
import TripForm from './components/TripForm'
import LoadingScreen from './components/LoadingScreen'
import ResultsView from './components/ResultsView'
import ClosetManager from './components/ClosetManager'
import ClothingPreferencesPanel from './components/ClothingPreferencesPanel'
import SavedTripsPanel from './components/SavedTripsPanel'
import Toast from './components/Toast'
import AuthGate from './components/AuthGate'

type View = 'landing' | 'loading' | 'results' | 'closet' | 'preferences' | 'saved'

const EMPTY_FORM: TripFormValues = {
  destination: '',
  place: null,
  startDate: '',
  endDate: '',
  vibes: [],
}

export default function App() {
  const { status, user, logout } = useAuth()
  const [view, setView] = useState<View>('landing')
  const [closet, setCloset] = useState<ClothingItem[]>([])
  const [trips, setTrips] = useState<TripPlan[]>([])
  // Maps a trip's own id (embedded in the saved payload) to the backend
  // EventPlan row id that stores it — needed because /events only exposes
  // create/delete, not update-by-id, so "saving again" means delete-then-
  // recreate and we need the row id for the delete half.
  const [tripPlanRowIds, setTripPlanRowIds] = useState<Record<string, string>>({})
  const [preferences, setPreferences] = useState<ClothingPreferences>(DEFAULT_CLOTHING_PREFERENCES)
  const [formValues, setFormValues] = useState<TripFormValues>(EMPTY_FORM)
  const [currentTrip, setCurrentTrip] = useState<TripPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  function friendlyError(e: unknown): string {
    return e instanceof ApiClientError ? e.message : 'Something went wrong. Please try again.'
  }

  // Load this account's closet, preferences, and saved trips from the
  // backend as soon as they're signed in — every request is scoped to their
  // own userId server-side, so this is always just *their* data.
  useEffect(() => {
    if (status !== 'signed-in') {
      setDataLoaded(false)
      return
    }
    let cancelled = false
    async function load() {
      try {
        const [items, prefs, plans] = await Promise.all([closetApi.list(), preferencesApi.get(), eventsApi.list()])
        if (cancelled) return
        setCloset(items)
        setPreferences(prefs ? { ...DEFAULT_CLOTHING_PREFERENCES, ...prefs } : DEFAULT_CLOTHING_PREFERENCES)
        const destinationPlans = plans.filter((p): p is EventPlanRecord => p.mode === 'destination')
        setTrips(destinationPlans.map((p) => p.data as unknown as TripPlan))
        setTripPlanRowIds(
          Object.fromEntries(destinationPlans.map((p) => [(p.data as unknown as TripPlan).id, p.id])),
        )
      } catch (e) {
        if (!cancelled) setToastMessage(friendlyError(e))
      } finally {
        if (!cancelled) setDataLoaded(true)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [status])

  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 2400)
    return () => clearTimeout(timer)
  }, [toastMessage])

  async function handleAddClothingItem(item: Omit<ClothingItem, 'id' | 'createdAt'>) {
    try {
      const created = await closetApi.create(item)
      setCloset((prev) => [...prev, created])
      setToastMessage('Added to your closet')
    } catch (e) {
      setToastMessage(friendlyError(e))
    }
  }

  async function handleDeleteClothingItem(id: string) {
    const previous = closet
    setCloset((prev) => prev.filter((i) => i.id !== id))
    try {
      await closetApi.remove(id)
    } catch (e) {
      setCloset(previous)
      setToastMessage(friendlyError(e))
    }
  }

  async function handleLoadStarterCloset() {
    try {
      const starter = buildStarterCloset()
      const created = await Promise.all(starter.map((item) => closetApi.create(item)))
      setCloset((prev) => [...prev, ...created])
      setToastMessage('Starter closet loaded')
    } catch (e) {
      setToastMessage(friendlyError(e))
    }
  }

  async function handleSavePreferences(next: ClothingPreferences) {
    try {
      const saved = await preferencesApi.save(next)
      setPreferences({ ...DEFAULT_CLOTHING_PREFERENCES, ...saved })
      setToastMessage('Clothing preferences saved')
    } catch (e) {
      setToastMessage(friendlyError(e))
    }
  }

  async function generateTrip(values: TripFormValues, options: { seed?: number; avoidItemIds?: string[]; existingId?: string } = {}) {
    setFormValues(values)
    setView('loading')
    setError(null)
    try {
      const trip = await buildTripPlan(values, closet, { ...options, preferences })
      setCurrentTrip(trip)
      setView('results')
    } catch (e) {
      console.error(e)
      setError('Something went wrong while building your palette. Please try again.')
      setView('landing')
    }
  }

  function handleRegenerate() {
    if (!currentTrip) return
    const avoidItemIds = currentTrip.days.flatMap((d) => d.items.map((i) => i.id))
    void generateTrip(formValues, { seed: Date.now(), avoidItemIds })
  }

  function isTripSaved(trip: TripPlan | null): boolean {
    if (!trip) return false
    return trips.some((t) => t.id === trip.id)
  }

  async function handleSaveTrip() {
    if (!currentTrip) return
    try {
      const existingRowId = tripPlanRowIds[currentTrip.id]
      if (existingRowId) await eventsApi.remove(existingRowId)
      const plan = await eventsApi.create('destination', currentTrip.destination, currentTrip as unknown as Record<string, unknown>)
      setTrips((prev) => [currentTrip, ...prev.filter((t) => t.id !== currentTrip.id)])
      setTripPlanRowIds((prev) => ({ ...prev, [currentTrip.id]: plan.id }))
      setToastMessage('Trip saved')
    } catch (e) {
      setToastMessage(friendlyError(e))
    }
  }

  async function handleDeleteTrip(id: string) {
    const rowId = tripPlanRowIds[id]
    const previousTrips = trips
    setTrips((prev) => prev.filter((t) => t.id !== id))
    if (!rowId) return
    try {
      await eventsApi.remove(rowId)
    } catch (e) {
      setTrips(previousTrips)
      setToastMessage(friendlyError(e))
    }
  }

  function handleOpenSavedTrip(trip: TripPlan) {
    setCurrentTrip(trip)
    setFormValues({
      destination: trip.destination,
      place: trip.place,
      startDate: trip.startDate,
      endDate: trip.endDate,
      vibes: trip.vibes,
    })
    setView('results')
  }

  if (status === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-ink/50">
        Loading…
      </div>
    )
  }

  if (status === 'signed-out') {
    return <AuthGate />
  }

  if (!dataLoaded) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-ink/50">
        Loading your closet…
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar
        onLogoClick={() => setView('landing')}
        onClosetClick={() => setView('closet')}
        onPreferencesClick={() => setView('preferences')}
        onSavedClick={() => setView('saved')}
        savedCount={trips.length}
        userEmail={user?.email}
        onLogout={logout}
      />

      {view === 'landing' && (
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-8 sm:pt-16">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-coral shadow-sm ring-1 ring-black/5">
              Pack from what you already own
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight sm:text-6xl">
              Dress for the trip,<br className="hidden sm:block" /> not just the weather.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-ink/60 sm:text-lg">
              Tell Heygotchu where you're going. It reads your closet, checks the forecast, and builds a
              day-by-day outfit plan that matches the vibe.
            </p>
          </div>

          {error && (
            <div role="alert" className="mx-auto mt-6 max-w-2xl rounded-2xl bg-coral/10 px-4 py-3 text-center text-sm font-medium text-coral">
              {error}
            </div>
          )}

          <div className="mt-10">
            <TripForm
              initial={formValues}
              closetSize={closet.length}
              moreCoverage={preferences.moreCoverage}
              onSubmit={(values) => void generateTrip(values)}
              onGoToCloset={() => setView('closet')}
              onGoToPreferences={() => setView('preferences')}
            />
          </div>
        </main>
      )}

      {view === 'loading' && <LoadingScreen destination={formValues.destination} />}

      {view === 'results' && currentTrip && (
        <ResultsView
          trip={currentTrip}
          saved={isTripSaved(currentTrip)}
          onRegenerate={handleRegenerate}
          onSave={handleSaveTrip}
          onNewTrip={() => setView('landing')}
          onToast={setToastMessage}
        />
      )}

      {view === 'closet' && (
        <ClosetManager
          closet={closet}
          preferences={preferences}
          onAdd={handleAddClothingItem}
          onDelete={handleDeleteClothingItem}
          onLoadStarter={handleLoadStarterCloset}
          onBack={() => setView(currentTrip ? 'results' : 'landing')}
        />
      )}

      {view === 'preferences' && (
        <ClothingPreferencesPanel
          preferences={preferences}
          onSave={handleSavePreferences}
          onBack={() => setView(currentTrip ? 'results' : 'landing')}
        />
      )}

      {view === 'saved' && (
        <SavedTripsPanel
          trips={trips}
          onOpen={handleOpenSavedTrip}
          onDelete={handleDeleteTrip}
          onBack={() => setView('landing')}
        />
      )}

      <Toast message={toastMessage} />
    </div>
  )
}
