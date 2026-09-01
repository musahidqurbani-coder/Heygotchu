import { useState } from 'react'
import type { ClothingItem, ClothingPreferences, DayOutfit, Formality } from '../types'
import { suggestTodayOutfit } from '../lib/todaySuggestion'
import DayOutfitCard from './DayOutfitCard'
import EmptyState from './EmptyState'
import { useLang, type StringKey } from '../lib/i18n'

const STYLE_CHIPS: { value: Formality; labelKey: StringKey; icon: string }[] = [
  { value: 'casual', labelKey: 'styleCasual', icon: '👕' },
  { value: 'smart-casual', labelKey: 'styleOffice', icon: '💼' },
  { value: 'formal', labelKey: 'styleParty', icon: '🎉' },
  { value: 'athletic', labelKey: 'styleAthletic', icon: '🏃' },
]

interface TodayModeProps {
  closet: ClothingItem[]
  preferences: ClothingPreferences
}

// The quick, no-AI third mode alongside Trip and Occasion: pick a style,
// get one outfit pulled straight from the closet right now. No weather, no
// destination, no Claude call — just a fast "what do I wear today" pick.
export default function TodayMode({ closet, preferences }: TodayModeProps) {
  const [style, setStyle] = useState<Formality | null>(null)
  const [outfit, setOutfit] = useState<DayOutfit | null>(null)
  const { t } = useLang()

  function pick(value: Formality) {
    setStyle(value)
    setOutfit(suggestTodayOutfit(closet, value, preferences))
  }

  if (closet.length === 0) {
    return (
      <EmptyState
        icon="🧺"
        title="Your closet is empty"
        description="Add a few clothes first so Heygotchu has something to suggest for today."
      />
    )
  }

  return (
    <div className="mt-8">
      <p className="mb-3 text-sm font-medium text-ink/60">{t('todayVibeQ')}</p>
      <div className="flex flex-wrap gap-2">
        {STYLE_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => pick(chip.value)}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
              style === chip.value ? 'bg-ink text-white' : 'bg-white text-ink/70 ring-1 ring-black/10 hover:bg-cloud'
            }`}
          >
            <span className="mr-1.5" aria-hidden="true">{chip.icon}</span>
            {t(chip.labelKey)}
          </button>
        ))}
      </div>

      {outfit && (
        <div className="mt-5">
          {outfit.items.length === 0 ? (
            <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-ink/60 shadow-sm ring-1 ring-black/5">
              {t('noOutfits')}
            </p>
          ) : (
            <DayOutfitCard outfit={outfit} />
          )}
          <button
            onClick={() => style && pick(style)}
            className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink/60 shadow-sm ring-1 ring-black/10 transition hover:bg-cloud"
          >
            {t('remix')}
          </button>
        </div>
      )}
    </div>
  )
}
