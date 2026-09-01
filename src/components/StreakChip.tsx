import { useEffect, useState } from 'react'
import { engagementApi, type StreakInfo } from '../lib/apiClient'

const TIER_STYLE: Record<StreakInfo['tier'], { label: string; icon: string; cls: string }> = {
  silver: { label: 'Silver', icon: '🥈', cls: 'bg-white text-ink/70 ring-black/10' },
  gold: { label: 'Gold', icon: '🥇', cls: 'bg-sun/25 text-ink/80 ring-sun/60' },
  platinum: { label: 'Platinum', icon: '💠', cls: 'bg-sky/15 text-ink/80 ring-sky/40' },
  diamond: { label: 'Diamond', icon: '💎', cls: 'bg-mint/20 text-ink/80 ring-mint/50' },
}

// Daily login streak: fetching it is what counts today (see the backend
// /engagement/streak route). Renders nothing until it loads — the chip
// appearing is the confirmation the day was counted.
export default function StreakChip() {
  const [info, setInfo] = useState<StreakInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    engagementApi
      .streak()
      .then((s) => {
        if (!cancelled) setInfo(s)
      })
      .catch(() => {
        // offline or logged-out edge — the chip simply doesn't show
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!info) return null
  const tier = TIER_STYLE[info.tier]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ${tier.cls}`}
      title={
        info.nextTier
          ? `${info.nextTier.daysToGo} more days to ${info.nextTier.name} · photo storage: ${info.photoLimit}`
          : `Top tier! ${info.perk ?? ''} · photo storage: ${info.photoLimit}`
      }
    >
      🔥 {info.streak}-day Daily Grind · {tier.icon} {tier.label}
    </span>
  )
}
