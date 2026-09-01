import { useEffect, useMemo, useState } from 'react'
import type { ClothingCategory, ClothingItem, ClothingPreferences, Formality } from '../types'
import { CLOTHING_CATEGORIES, FORMALITY_LEVELS } from '../types'
import { isolateGarment } from '../lib/backgroundRemoval'
import { findDuplicateGroups } from '../lib/dupDetect'
import ClothingItemCard from './ClothingItemCard'
import AddClothingItemForm from './AddClothingItemForm'
import BulkUploadModal from './BulkUploadModal'
import Modal from './Modal'
import EmptyState from './EmptyState'

const STYLE_LABEL: Record<Formality, string> = {
  athletic: 'Athletic',
  casual: 'Casual',
  'smart-casual': 'Office',
  formal: 'Party / Formal',
}

// A style chip matches on the AI's style tags first (a suit tagged 'office'
// belongs under Office even if its formality reads 'formal'), then falls
// back to raw formality for items tagged before style tags existed.
const STYLE_TAG_MATCH: Record<Formality, string[]> = {
  athletic: ['sports'],
  casual: ['everyday'],
  'smart-casual': ['office'],
  formal: ['party', 'festive'],
}

function matchesStyle(item: ClothingItem, level: Formality): boolean {
  if (item.tags.some((t) => STYLE_TAG_MATCH[level].includes(t))) return true
  // An office-tagged formal suit shouldn't ALSO count as Party.
  if (level === 'formal' && item.tags.includes('office')) return false
  return item.formality === level
}

interface ClosetManagerProps {
  closet: ClothingItem[]
  preferences: ClothingPreferences
  onAdd: (item: Omit<ClothingItem, 'id' | 'createdAt'>) => void
  onBulkAdd: (items: Omit<ClothingItem, 'id' | 'createdAt'>[]) => Promise<void>
  onDelete: (id: string) => void
  onBulkDelete: (ids: string[]) => Promise<void>
  onUpdatePhoto: (id: string, photo: string) => Promise<void>
  onLoadStarter: () => void
  onBack: () => void
  onToast: (message: string) => void
  autoOpenBulk?: boolean
  onAutoOpened?: () => void
}

export default function ClosetManager({ closet, preferences, onAdd, onBulkAdd, onDelete, onBulkDelete, onUpdatePhoto, onLoadStarter, onBack, onToast, autoOpenBulk, onAutoOpened }: ClosetManagerProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  // Retroactive photo clean-up: background-remove every photo not yet
  // marked photoCleaned in the database (legacy PNGs predate the flag and
  // count as done). This manual button also retries items the automatic
  // queue gave up on.
  const [cleaning, setCleaning] = useState<{ done: number; total: number } | null>(null)
  const cleanable = closet.filter((i) => i.photo && !i.photoCleaned && !i.photo.startsWith('data:image/png'))

  async function handleCleanPhotos() {
    if (cleanable.length === 0 || cleaning) return
    const total = cleanable.length
    setCleaning({ done: 0, total })
    let cleaned = 0
    for (const item of cleanable) {
      try {
        const cutout = await isolateGarment(item.photo!)
        await onUpdatePhoto(item.id, cutout)
        cleaned++
      } catch {
        // one stubborn photo shouldn't stop the rest
      }
      setCleaning((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev))
    }
    setCleaning(null)
    onToast(
      cleaned === 0
        ? 'Could not clean any photos — try again in a moment.'
        : `✨ Cleaned ${cleaned} photo${cleaned === 1 ? '' : 's'} — backgrounds removed.`,
    )
  }

  useEffect(() => {
    if (autoOpenBulk) {
      setShowBulk(true)
      onAutoOpened?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenBulk])
  const [filter, setFilter] = useState<ClothingCategory | 'all'>('all')
  const [styleFilter, setStyleFilter] = useState<Formality | 'all'>('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
    setConfirmingDelete(false)
  }

  // "Do not show the same thing multiple times": likely twins across
  // separate uploads, grouped oldest-first. Reviewing preselects every
  // newer copy for deletion — the user still confirms before anything goes.
  const dupGroups = useMemo(() => findDuplicateGroups(closet), [closet])
  const dupCandidateCount = dupGroups.reduce((n, g) => n + g.length - 1, 0)

  function reviewDuplicates() {
    setSelectMode(true)
    setConfirmingDelete(false)
    setSelectedIds(new Set(dupGroups.flatMap((g) => g.slice(1).map((i) => i.id))))
  }

  // --- Purge closet ----------------------------------------------------------
  // One-click bulk delete of EVERYTHING, behind a DOUBLE confirmation: a
  // clear warning first, then an explicit "are you sure".
  const [purgeStep, setPurgeStep] = useState<'closed' | 'warn' | 'sure'>('closed')
  const [purging, setPurging] = useState(false)

  async function handlePurge() {
    setPurging(true)
    try {
      await onBulkDelete(closet.map((i) => i.id))
      onToast('Closet purged — fresh start! 🧺')
      setPurgeStep('closed')
    } catch {
      onToast('Could not remove everything — try again.')
    } finally {
      setPurging(false)
    }
  }

  function toggleSelect(id: string) {
    setConfirmingDelete(false)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    try {
      await onBulkDelete([...selectedIds])
      exitSelectMode()
    } finally {
      setDeleting(false)
    }
  }

  const filtered = useMemo(
    () =>
      closet
        .filter((i) => filter === 'all' || i.category === filter)
        .filter((i) => styleFilter === 'all' || matchesStyle(i, styleFilter)),
    [closet, filter, styleFilter],
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            onClick={onBack}
            className="mb-1 text-sm font-medium text-ink/50 transition hover:text-ink focus:outline-none"
          >
            ← Back
          </button>
          <h1 className="font-display text-3xl font-semibold">My Closet</h1>
          <p className="text-sm text-ink/50">The clothes Heygotchu will build outfits from.</p>
        </div>
        {selectMode ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink/70">
              {selectedIds.size} selected
            </span>
            {confirmingDelete ? (
              <>
                <span className="text-sm font-medium text-coral">Delete {selectedIds.size} item{selectedIds.size === 1 ? '' : 's'}?</span>
                <button
                  onClick={() => void handleConfirmDelete()}
                  disabled={deleting}
                  className="rounded-full bg-coral px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="rounded-full px-4 py-2.5 text-sm font-medium text-ink/60 hover:bg-black/5 disabled:opacity-40"
                >
                  Keep them
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setConfirmingDelete(true)}
                  disabled={selectedIds.size === 0}
                  className="rounded-full bg-coral px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  🗑️ Delete ({selectedIds.size})
                </button>
                <button
                  onClick={exitSelectMode}
                  className="rounded-full px-4 py-2.5 text-sm font-medium text-ink/60 hover:bg-black/5"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dupCandidateCount > 0 && (
              <button
                onClick={reviewDuplicates}
                className="rounded-full bg-sun/30 px-4 py-2.5 text-sm font-semibold text-ink/80 shadow-sm ring-1 ring-sun/60 transition hover:bg-sun/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              >
                🧹 Review {dupCandidateCount} duplicate{dupCandidateCount === 1 ? '' : 's'}
              </button>
            )}
            {cleanable.length > 0 && (
              <button
                onClick={() => void handleCleanPhotos()}
                disabled={cleaning !== null}
                className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink/70 shadow-sm ring-1 ring-black/10 transition hover:bg-cloud focus:outline-none focus-visible:ring-2 focus-visible:ring-coral disabled:opacity-60"
              >
                {cleaning ? `✨ Cleaning ${cleaning.done}/${cleaning.total}…` : `✨ Remove backgrounds (${cleanable.length})`}
              </button>
            )}
            {closet.length > 0 && (
              <button
                onClick={() => setSelectMode(true)}
                className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-coral shadow-sm ring-1 ring-coral/30 transition hover:bg-coral/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              >
                🗑️ Delete items
              </button>
            )}
            {closet.length > 0 && (
              <button
                onClick={() => setPurgeStep('warn')}
                className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink/60 shadow-sm ring-1 ring-black/10 transition hover:bg-cloud focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              >
                🧨 Purge closet
              </button>
            )}
            <button
              onClick={() => setShowBulk(true)}
              className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink/70 shadow-sm ring-1 ring-black/10 transition hover:bg-cloud focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
            >
              📸 Bulk upload
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
            >
              + Add item
            </button>
          </div>
        )}
      </div>

      {selectMode && (
        <p className="mb-4 rounded-xl bg-sun/20 px-3.5 py-2.5 text-sm text-ink/70">
          Tap items to select them, then hit Delete. Nothing is removed until you confirm.
        </p>
      )}

      {closet.length === 0 ? (
        <EmptyState
          icon="🧺"
          title="Your closet is empty"
          description="Add the clothes you own so Heygotchu can mix and match real outfits — or start from a sample closet."
          action={{ label: 'Load a starter closet', onClick: onLoadStarter }}
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                filter === 'all' ? 'bg-ink text-white' : 'bg-white text-ink/60 ring-1 ring-black/10'
              }`}
            >
              All ({closet.length})
            </button>
            {CLOTHING_CATEGORIES.map((cat) => {
              const count = closet.filter((i) => i.category === cat).length
              if (count === 0) return null
              return (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                    filter === cat ? 'bg-ink text-white' : 'bg-white text-ink/60 ring-1 ring-black/10'
                  }`}
                >
                  {cat} ({count})
                </button>
              )
            })}
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            <button
              onClick={() => setStyleFilter('all')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                styleFilter === 'all' ? 'bg-ink text-white' : 'bg-white text-ink/60 ring-1 ring-black/10'
              }`}
            >
              All styles
            </button>
            {FORMALITY_LEVELS.map((level) => {
              const count = closet.filter((i) => matchesStyle(i, level)).length
              if (count === 0) return null
              return (
                <button
                  key={level}
                  onClick={() => setStyleFilter(level)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    styleFilter === level ? 'bg-ink text-white' : 'bg-white text-ink/60 ring-1 ring-black/10'
                  }`}
                >
                  {STYLE_LABEL[level]} ({count})
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((item) => (
              <ClothingItemCard
                key={item.id}
                item={item}
                preferences={preferences}
                onDelete={onDelete}
                selectMode={selectMode}
                selected={selectedIds.has(item.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        </>
      )}

      {showAdd && (
        <Modal title="Add a clothing item" onClose={() => setShowAdd(false)}>
          <AddClothingItemForm onAdd={onAdd} onClose={() => setShowAdd(false)} />
        </Modal>
      )}

      {showBulk && <BulkUploadModal onClose={() => setShowBulk(false)} onBulkAdd={onBulkAdd} />}

      {purgeStep !== 'closed' && (
        <Modal title="Purge closet 🧨" onClose={() => !purging && setPurgeStep('closed')}>
          {purgeStep === 'warn' && (
            <div className="space-y-4">
              <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
                ⚠️ This will remove ALL {closet.length} clothes from your closet.
              </p>
              <p className="text-sm text-ink/60">Photos and details of every item will be deleted from your account.</p>
              <div className="flex gap-2">
                <button onClick={() => setPurgeStep('closed')} className="flex-1 rounded-full bg-cloud px-4 py-2.5 text-sm font-semibold text-ink/70 ring-1 ring-black/10">
                  Cancel
                </button>
                <button onClick={() => setPurgeStep('sure')} className="flex-1 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
                  Continue
                </button>
              </div>
            </div>
          )}

          {purgeStep === 'sure' && (
            <div className="space-y-4">
              <p className="text-center text-3xl" aria-hidden="true">🫣</p>
              <p className="text-center text-sm font-semibold text-ink">
                Are you sure? All {closet.length} item{closet.length === 1 ? '' : 's'} will be gone — this cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPurgeStep('closed')} disabled={purging} className="flex-1 rounded-full bg-cloud px-4 py-2.5 text-sm font-semibold text-ink/70 ring-1 ring-black/10 disabled:opacity-40">
                  Keep my closet
                </button>
                <button onClick={() => void handlePurge()} disabled={purging} className="flex-1 rounded-full bg-coral px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40">
                  {purging ? 'Removing…' : 'Yes, purge it'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
