import { useCallback, useEffect, useRef, useState } from 'react'
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
import AdminPanel from './components/AdminPanel'
import OccasionPlanner from './components/OccasionPlanner'
import TodayMode from './components/TodayMode'
import GreetingHero from './components/GreetingHero'
import SaveTheDate from './components/SaveTheDate'
import AppSettings from './components/AppSettings'
import BottomNav from './components/BottomNav'
import { isolateGarment } from './lib/backgroundRemoval'
import { looksLikeSameItem } from './lib/dupDetect'
import { useLang } from './lib/i18n'
import SelfieOnboarding from './components/SelfieOnboarding'
import DeleteAccountCard from './components/DeleteAccountCard'
import { hasShareFlag, clearShareFlag } from './lib/sharedIntake'

type View = 'landing' | 'loading' | 'results' | 'closet' | 'preferences' | 'saved' | 'admin' | 'dates'

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
  const [planMode, setPlanMode] = useState<'trip' | 'occasion' | 'today'>('trip')
  const { t } = useLang()
  const [selfiePromptDismissed, setSelfiePromptDismissed] = useState(false)
  // Photos shared into the app from the phone's share sheet land here: jump
  // straight to the closet and auto-open Bulk upload to receive them.
  const [pendingShare, setPendingShare] = useState(() => hasShareFlag())

  function friendlyError(e: unknown): string {
    return e instanceof ApiClientError ? e.message : 'Something went wrong. Please try again.'
  }

  // --- Background photo clean-up queue --------------------------------------
  // Uploads save instantly with the plain photo; this queue then removes
  // backgrounds one by one afterwards (cleaned photos are PNG, raw ones
  // JPEG). A small progress pill shows while it works, and each finished
  // photo pops into place as its PATCH lands — nothing ever waits on it.
  const bgQueueRunning = useRef(false)

  // The catch-up queue is a silent safety net: photos now arrive already
  // cleaned from the upload flow itself, so this only ever mops up items
  // saved before that (or a rare in-flight failure) — invisibly.
  // Photos that crashed the cleaner once are remembered here and skipped on
  // future logins — without this, one stubborn photo re-ran (and slowed the
  // app) on every session. The manual "Remove backgrounds" button in the
  // closet still retries them deliberately.
  const BG_SKIP_KEY = 'heygotchu.bgSkip.v1'
  const readBgSkips = (): Set<string> => {
    try {
      return new Set(JSON.parse(localStorage.getItem(BG_SKIP_KEY) ?? '[]') as string[])
    } catch {
      return new Set()
    }
  }
  const addBgSkip = (id: string) => {
    try {
      localStorage.setItem(BG_SKIP_KEY, JSON.stringify([...readBgSkips().add(id)].slice(-200)))
    } catch { /* private mode */ }
  }

  const runBgQueue = useCallback((items: ClothingItem[], settleMs = 0) => {
    const skips = readBgSkips()
    // The database flag is the single source of truth: an item is processed
    // exactly once in its life, then every future fetch serves the finished
    // image. (Legacy PNG photos predate the flag and are treated as done.)
    const pending = items.filter(
      (i) => i.photo && !i.photoCleaned && !i.photo.startsWith('data:image/png') && !skips.has(i.id),
    )
    if (pending.length === 0 || bgQueueRunning.current) return
    bgQueueRunning.current = true
    void (async () => {
      // Let the app finish rendering and the user start interacting before
      // any heavy work begins — the model also runs in a web worker now, so
      // this stays off the main thread either way.
      if (settleMs > 0) await new Promise((r) => setTimeout(r, settleMs))
      for (const item of pending) {
        try {
          const cleaned = await isolateGarment(item.photo!)
          // Persist result AND the done-flag together — even when the image
          // came back unchanged, so the item is never picked up again.
          const updated = await closetApi.update(item.id, { photo: cleaned, photoCleaned: true })
          setCloset((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
        } catch {
          addBgSkip(item.id) // don't retry this one automatically next login
        }
        // A short breather between photos keeps network + state updates
        // from bunching up against whatever the user is doing.
        await new Promise((r) => setTimeout(r, 400))
      }
      bgQueueRunning.current = false
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        // Catch any photos still carrying their original background (e.g.
        // saved before the clean-up finished last session) — but only after
        // the app has settled, so login never feels heavy.
        runBgQueue(items, 8000)
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
    if (pendingShare && status === 'signed-in' && dataLoaded) setView('closet')
  }, [pendingShare, status, dataLoaded])

  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 2400)
    return () => clearTimeout(timer)
  }, [toastMessage])

  async function handleAddClothingItem(item: Omit<ClothingItem, 'id' | 'createdAt'>) {
    // The same physical garment should live in the closet once — an add
    // matching an existing item is skipped with an honest toast rather than
    // silently creating a twin.
    const twin = closet.find((existing) => looksLikeSameItem(existing, item))
    if (twin) {
      setToastMessage(`Looks like "${twin.name}" is already in your closet — not added again.`)
      return
    }
    try {
      const created = await closetApi.create(item)
      setCloset((prev) => [...prev, created])
      setToastMessage('Added to your closet')
      runBgQueue([created])
    } catch (e) {
      setToastMessage(friendlyError(e))
    }
  }

  async function handleUpdateItemPhoto(id: string, photo: string) {
    const updated = await closetApi.update(id, { photo, photoCleaned: true })
    setCloset((prev) => prev.map((i) => (i.id === id ? updated : i)))
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

  async function handleBulkAddItems(items: Omit<ClothingItem, 'id' | 'createdAt'>[]) {
    const created: ClothingItem[] = []
    let failed = 0
    let skippedDupes = 0
    for (const item of items) {
      // Guard against cross-upload twins: compare against the existing
      // closet AND everything accepted earlier in this same batch.
      if ([...closet, ...created].some((existing) => looksLikeSameItem(existing, item))) {
        skippedDupes += 1
        continue
      }
      try {
        created.push(await closetApi.create(item))
      } catch {
        failed += 1
      }
    }
    if (created.length > 0) {
      setCloset((prev) => [...prev, ...created])
      runBgQueue(created)
    }
    const dupNote = skippedDupes > 0 ? ` (${skippedDupes} duplicate${skippedDupes === 1 ? '' : 's'} skipped)` : ''
    setToastMessage(
      failed === 0
        ? `Added ${created.length} item${created.length === 1 ? '' : 's'} to your closet${dupNote}`
        : `Added ${created.length}, but ${failed} failed — try those again${dupNote}`,
    )
    if (failed > 0) throw new Error('partial failure')
  }

  async function handleBulkDeleteItems(ids: string[]) {
    let deleted = 0
    for (const id of ids) {
      try {
        await closetApi.remove(id)
        deleted += 1
      } catch {
        // keep going — a partial failure still removes the rest
      }
    }
    if (deleted === ids.length) {
      const removed = new Set(ids)
      setCloset((prev) => prev.filter((i) => !removed.has(i.id)))
    } else {
      // Something failed part-way — reload the authoritative list.
      try {
        setCloset(await closetApi.list())
      } catch { /* keep current state; next visit reloads */ }
    }
    setToastMessage(
      deleted === ids.length
        ? `Deleted ${deleted} item${deleted === 1 ? '' : 's'}`
        : `Deleted ${deleted} of ${ids.length} — try the rest again`,
    )
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

  const selfiePromptKey = user ? `heygotchu.selfiePromptSeen.${user.id}` : null
  const showSelfiePrompt =
    !selfiePromptDismissed &&
    !preferences.colorAnalysis &&
    Boolean(selfiePromptKey) &&
    localStorage.getItem(selfiePromptKey!) !== '1'

  return (
    <div className="min-h-screen pb-20">
      {showSelfiePrompt && (
        <SelfieOnboarding
          onDone={(analysis, ageRange) => {
            setSelfiePromptDismissed(true)
            try {
              if (selfiePromptKey) localStorage.setItem(selfiePromptKey, '1')
            } catch { /* private mode — the prompt just reappears next visit */ }
            if (analysis) {
              setPreferences((prev) => ({
                ...prev,
                colorAnalysis: analysis,
                ...(ageRange ? { ageRange } : {}),
                // Mirror the server: the detected department becomes the
                // wardrobe-focus default unless one was already chosen.
                wardrobeFocus:
                  (analysis.wardrobeDepartment === 'women' || analysis.wardrobeDepartment === 'men') &&
                  prev.wardrobeFocus === 'unisex'
                    ? analysis.wardrobeDepartment
                    : prev.wardrobeFocus,
              }))
              setToastMessage('Color palette saved — outfit ideas will use it ✨')
            }
          }}
        />
      )}
      <Navbar
        onLogoClick={() => setView('landing')}
        onClosetClick={() => setView('closet')}
        onPreferencesClick={() => setView('preferences')}
        onSavedClick={() => setView('saved')}
        savedCount={trips.length}
        userEmail={user?.email}
        onLogout={logout}
        isAdmin={user?.role === 'admin'}
        onAdminClick={() => setView('admin')}
      />

      {view === 'landing' && (
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-8 sm:pt-16">
          <div className="mx-auto max-w-3xl">
            <GreetingHero mode={planMode} closet={closet} preferences={preferences} />
          </div>

          {error && (
            <div role="alert" className="mx-auto mt-6 max-w-2xl rounded-2xl bg-coral/10 px-4 py-3 text-center text-sm font-medium text-coral">
              {error}
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5">
              <button
                onClick={() => setPlanMode('today')}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  planMode === 'today' ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink'
                }`}
              >
                {t('today')}
              </button>
              <button
                onClick={() => setPlanMode('occasion')}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  planMode === 'occasion' ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink'
                }`}
              >
                {t('occasion')}
              </button>
              <button
                onClick={() => setPlanMode('trip')}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  planMode === 'trip' ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink'
                }`}
              >
                {t('trip')}
              </button>
            </div>
          </div>

          {planMode === 'today' ? (
            <TodayMode closet={closet} preferences={preferences} />
          ) : planMode === 'trip' ? (
            <div className="mt-8">
              <TripForm
                initial={formValues}
                closetSize={closet.length}
                moreCoverage={preferences.moreCoverage}
                onSubmit={(values) => void generateTrip(values)}
                onGoToCloset={() => setView('closet')}
                onGoToPreferences={() => setView('preferences')}
              />
            </div>
          ) : (
            <OccasionPlanner closet={closet} preferences={preferences} onToast={setToastMessage} />
          )}

          <SaveTheDate onToast={setToastMessage} />
        </main>
      )}

      {view === 'dates' && (
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-8">
          <SaveTheDate onToast={setToastMessage} />
        </main>
      )}


      {view === 'loading' && <LoadingScreen destination={formValues.destination} />}

      {view === 'results' && currentTrip && (
        <ResultsView
          trip={currentTrip}
          closet={closet}
          preferences={preferences}
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
          autoOpenBulk={pendingShare}
          onAutoOpened={() => { setPendingShare(false); clearShareFlag() }}
          onAdd={handleAddClothingItem}
          onBulkAdd={handleBulkAddItems}
          onDelete={handleDeleteClothingItem}
          onBulkDelete={handleBulkDeleteItems}
          onUpdatePhoto={handleUpdateItemPhoto}
          onLoadStarter={handleLoadStarterCloset}
          onBack={() => setView(currentTrip ? 'results' : 'landing')}
          onToast={setToastMessage}
        />
      )}

      {view === 'preferences' && (
        <>
          <AppSettings
            onBack={() => setView(currentTrip ? 'results' : 'landing')}
            onToast={setToastMessage}
            preferences={preferences}
          />
          <ClothingPreferencesPanel
            preferences={preferences}
            onSave={handleSavePreferences}
            onBack={() => setView(currentTrip ? 'results' : 'landing')}
          />
          <div className="px-4 pb-16 sm:px-8">
            <DeleteAccountCard />
          </div>
        </>
      )}

      {view === 'admin' && user?.role === 'admin' && (
        <AdminPanel onBack={() => setView('landing')} onToast={setToastMessage} />
      )}

      {view === 'saved' && (
        <SavedTripsPanel
          trips={trips}
          onOpen={handleOpenSavedTrip}
          onDelete={handleDeleteTrip}
          onBack={() => setView('landing')}
        />
      )}


      {view !== 'loading' && (
        <BottomNav
          active={
            view === 'landing' || view === 'results'
              ? 'home'
              : view === 'closet'
                ? 'closet'
                : view === 'dates'
                  ? 'dates'
                  : view === 'preferences'
                    ? 'you'
                    : 'other'
          }
          onNavigate={(target) => {
            if (target === 'home') setView('landing')
            else if (target === 'closet') setView('closet')
            else if (target === 'dates') setView('dates')
            else setView('preferences')
          }}
          onAdd={handleAddClothingItem}
        />
      )}

      <Toast message={toastMessage} />
    </div>
  )
}
