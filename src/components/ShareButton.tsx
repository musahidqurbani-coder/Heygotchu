import type { TripPlan } from '../types'
import { formatDateRange } from '../lib/dateUtils'

interface ShareButtonProps {
  trip: TripPlan
  onShared: (message: string) => void
}

function buildShareText(trip: TripPlan): string {
  const lines = [
    `${trip.destination} · ${formatDateRange(trip.startDate, trip.endDate)}`,
    '',
    'Palette: ' + trip.palette.map((p) => p.hex).join(' '),
    '',
    ...trip.days.map(
      (d, i) => `Day ${i + 1}: ${d.items.map((it) => it.name).join(', ') || 'no outfit yet'}`,
    ),
    '',
    'Planned with Heygotchu 🧳',
  ]
  return lines.join('\n')
}

export default function ShareButton({ trip, onShared }: ShareButtonProps) {
  async function handleShare() {
    const text = buildShareText(trip)

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: `${trip.destination} outfit plan`,
          text,
        })
        onShared('Shared!')
        return
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      onShared('Trip summary copied to clipboard')
    } catch {
      onShared('Could not share — try copying manually')
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-ink/80 transition hover:border-black/20 hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral active:scale-95"
    >
      <span aria-hidden="true">🔗</span>
      Share
    </button>
  )
}
