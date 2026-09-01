import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import StreakChip from './StreakChip'
import type { ClothingItem, ClothingPreferences } from '../types'
import { suggestTodayOutfit } from '../lib/todaySuggestion'
import { useLang } from '../lib/i18n'

function greetName(email?: string): string {
  if (!email) return 'there'
  const local = email.split('@')[0]
  const match = local.match(/[a-zA-Z]+/)
  const word = (match ? match[0] : local).toLowerCase()
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

interface GreetingHeroProps {
  mode: 'today' | 'occasion' | 'trip'
  closet: ClothingItem[]
  preferences: ClothingPreferences
}

// The dashboard-style hero card from the approved design directions: a dark
// gradient card carrying the greeting, streak, and — in Today mode — a
// preview of today's pick straight from the closet. Occasion/Trip modes
// keep the same card as a warm header without the outfit preview, since
// that's a from-scratch plan rather than a same-day pick.
export default function GreetingHero({ mode, closet, preferences }: GreetingHeroProps) {
  const { user } = useAuth()
  const { t } = useLang()

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
    [],
  )

  const preview = useMemo(() => {
    if (mode !== 'today' || closet.length === 0) return null
    return suggestTodayOutfit(closet, 'casual', preferences)
  }, [mode, closet, preferences])

  return (
    <div className="hero-glow relative overflow-hidden rounded-3xl px-5 py-6 text-[#fff] shadow-lg sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="hero-badge rounded-full bg-[#fff]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#fff]/90">
          {t('packFromOwn')}
        </span>
        <StreakChip />
      </div>

      <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-[#fff] sm:text-4xl">
        {timeGreeting()}, {greetName(user?.email)}
      </h1>
      <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-[#ffb1a5]">{dateLabel}</p>
      <p className="mt-3 max-w-md text-sm text-[#fff]/70 sm:text-base">{t('heroSub')}</p>

      {preview && preview.items.length > 0 && (
        <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
          {preview.items.slice(0, 4).map((item) => (
            <div key={item.id} className="w-20 shrink-0 text-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-[#f2ead9]">
                {item.photo ? (
                  <img src={item.photo} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <span
                    className="h-8 w-8 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                )}
              </div>
              <p className="mt-1.5 truncate text-[11px] font-medium text-[#fff]/80">{item.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
