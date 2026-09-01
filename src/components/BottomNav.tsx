import { useRef, useState } from 'react'
import Modal from './Modal'
import AddClothingItemForm from './AddClothingItemForm'
import type { ClothingItem } from '../types'

interface BottomNavProps {
  active: 'home' | 'closet' | 'dates' | 'you' | 'other'
  onNavigate: (target: 'home' | 'closet' | 'dates' | 'you') => void
  onAdd: (item: Omit<ClothingItem, 'id' | 'createdAt'>) => void
}

const TABS: { key: 'home' | 'closet' | 'dates' | 'you'; icon: string; label: string }[] = [
  { key: 'home', icon: '⌂', label: 'Home' },
  { key: 'closet', icon: '👚', label: 'Closet' },
  { key: 'dates', icon: '🗓', label: 'Dates' },
  { key: 'you', icon: '👤', label: 'You' },
]

// The app-wide bottom navigation from the design directions: Home · Closet ·
// [camera lens] · Dates · You. The center button is the glossy lens, drawn in
// CSS (see .nav-lens in index.css) — on phones it opens the camera directly,
// and the captured photo runs through AI tagging + background clean-up with
// a review step before anything is saved.
export default function BottomNav({ active, onNavigate, onAdd }: BottomNavProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [captured, setCaptured] = useState<File | null>(null)

  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)]

  const tabButton = (tab: (typeof TABS)[number]) => (
    <button
      key={tab.key}
      onClick={() => onNavigate(tab.key)}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition ${
        active === tab.key ? 'text-coral' : 'text-ink/45 hover:text-ink/70'
      }`}
    >
      <span className="text-lg leading-none" aria-hidden="true">{tab.icon}</span>
      {tab.label}
    </button>
  )

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) setCaptured(file)
          e.target.value = ''
        }}
      />

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-6">
          {left.map(tabButton)}
          <button
            onClick={() => inputRef.current?.click()}
            aria-label="Snap a new clothing item"
            className="nav-lens -mt-7 shrink-0 transition hover:scale-105 active:scale-95"
          />
          {right.map(tabButton)}
        </div>
      </nav>

      {captured && (
        <Modal title="New fit spotted 📷" onClose={() => setCaptured(null)}>
          <AddClothingItemForm initialFile={captured} onAdd={onAdd} onClose={() => setCaptured(null)} />
        </Modal>
      )}
    </>
  )
}
