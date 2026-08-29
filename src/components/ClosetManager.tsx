import { useMemo, useState } from 'react'
import type { ClothingCategory, ClothingItem, ClothingPreferences } from '../types'
import { CLOTHING_CATEGORIES } from '../types'
import ClothingItemCard from './ClothingItemCard'
import AddClothingItemForm from './AddClothingItemForm'
import Modal from './Modal'
import EmptyState from './EmptyState'

interface ClosetManagerProps {
  closet: ClothingItem[]
  preferences: ClothingPreferences
  onAdd: (item: Omit<ClothingItem, 'id' | 'createdAt'>) => void
  onDelete: (id: string) => void
  onLoadStarter: () => void
  onBack: () => void
}

export default function ClosetManager({ closet, preferences, onAdd, onDelete, onLoadStarter, onBack }: ClosetManagerProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<ClothingCategory | 'all'>('all')

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
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          + Add item
        </button>
      </div>

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
              <ClothingItemCard key={item.id} item={item} preferences={preferences} onDelete={onDelete} />
            ))}
          </div>
        </>
      )}

      {showAdd && (
        <Modal title="Add a clothing item" onClose={() => setShowAdd(false)}>
          <AddClothingItemForm onAdd={onAdd} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  )
}
