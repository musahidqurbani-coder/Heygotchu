import type { DayOutfit } from '../types'
import DayOutfitCard from './DayOutfitCard'

interface ItineraryProps {
  days: DayOutfit[]
}

export default function Itinerary({ days }: ItineraryProps) {
  if (days.length === 0) return null
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {days.map((day) => (
        <DayOutfitCard key={day.date} outfit={day} />
      ))}
    </div>
  )
}
