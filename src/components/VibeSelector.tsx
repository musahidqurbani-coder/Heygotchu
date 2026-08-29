import { TRIP_VIBES, type TripVibe } from '../types'

const VIBE_EMOJI: Record<TripVibe, string> = {
  Beach: '🏖️',
  Mountains: '⛰️',
  Hiking: '🥾',
  City: '🏙️',
  Nature: '🌿',
  Food: '🍜',
  Culture: '🏛️',
  Adventure: '🧭',
  Snow: '❄️',
  Relaxation: '🧘',
}

interface VibeSelectorProps {
  selected: TripVibe[]
  onToggle: (vibe: TripVibe) => void
}

export default function VibeSelector({ selected, onToggle }: VibeSelectorProps) {
  return (
    <div role="group" aria-label="Trip vibe" className="flex flex-wrap gap-2.5">
      {TRIP_VIBES.map((vibe) => {
        const active = selected.includes(vibe)
        return (
          <button
            key={vibe}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(vibe)}
            className={`group flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-coral active:scale-95 ${
              active
                ? 'border-transparent bg-ink text-white shadow-md scale-105'
                : 'border-black/10 bg-white text-ink/70 hover:border-black/20 hover:-translate-y-0.5 hover:shadow-sm'
            }`}
          >
            <span className="text-base leading-none">{VIBE_EMOJI[vibe]}</span>
            {vibe}
          </button>
        )
      })}
    </div>
  )
}
