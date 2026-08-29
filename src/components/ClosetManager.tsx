import { useMemo, useState } from 'react'
import type { ClothingCategory, ClothingItem, ClothingPreferences } from '../types'
import { CLOTHING_CATEGORIES } from '../types'
import ClothingItemCard from './ClothingItemCard'
import AddClothingItemForm from './AddClothingItemForm'
import BulkUploadModal from './BulkUploadModal'
import Modal from './Modal'
import EmptyState from './EmptyState'

interface ClosetManagerProps {
  closet: ClothingItem[]
  preferences: ClothingPreferences
  onAdd: (item: Omit<ClothingItem, 'id' | 'createdAt'>) => void
  onBulkAdd: (items: Omit<ClothingItem, 'id' | 'createdAt'>[]) => Promise<void>
  onDelete: (id: string) => void
  onBulkDelete: (ids: string[]) => Promise<void>
  onLoadStarter: () => void
  onBack: () => void
}

export default function ClosetManager({ closet, preferences, onAdd, onBulkAdd, onDelete, onBulkDelete, onLoadStarter, onBack }: ClosetManagerProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [filter, setFilter] = useState<ClothingCategory | 'all'>('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
    setConfirmingDelete(false)
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
    () => (filter === 'all' ? closet : closet.filter((i) => i.category === filter)),
    [closet, filter],
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
            {closet.length > 0 && (
              <button
                onClick={() => setSelectMode(true)}
                className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-coral shadow-sm ring-1 ring-coral/30 transition hover:bg-coral/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              >
                🗑️ Delete items
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
    </div>
  )
}
