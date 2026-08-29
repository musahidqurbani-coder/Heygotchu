import type { DayWeather } from '../types'
import { WEATHER_ICON, WEATHER_LABEL } from '../lib/weatherApi'
import { formatDateLabel } from '../lib/dateUtils'

interface WeatherCardProps {
  days: DayWeather[]
  source: 'live' | 'estimated'
}

export default function WeatherCard({ days, source }: WeatherCardProps) {
  if (days.length === 0) return null

  const avgHigh = Math.round(days.reduce((s, d) => s + d.tempMaxC, 0) / days.length)
  const avgLow = Math.round(days.reduce((s, d) => s + d.tempMinC, 0) / days.length)
  const maxRain = Math.max(...days.map((d) => d.precipitationChance))

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">Weather outlook</h3>
        <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-ink/60">
          {source === 'live' ? '🟢 Live forecast' : '🔮 Seasonal estimate'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-6 text-sm text-ink/70">
        <span>
          Avg high <strong className="text-ink">{avgHigh}°C</strong>
        </span>
        <span>
          Avg low <strong className="text-ink">{avgLow}°C</strong>
        </span>
        <span>
          Peak rain chance <strong className="text-ink">{maxRain}%</strong>
        </span>
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {days.map((d) => (
          <div
            key={d.date}
            className="flex min-w-[84px] flex-col items-center gap-1 rounded-2xl bg-cloud px-3 py-3 text-center"
          >
            <span className="text-xs font-medium text-ink/50">{formatDateLabel(d.date)}</span>
            <span className="text-2xl" aria-hidden="true">
              {WEATHER_ICON[d.condition]}
            </span>
            <span className="text-xs text-ink/60">{WEATHER_LABEL[d.condition]}</span>
            <span className="text-sm font-semibold text-ink">
              {d.tempMaxC}° / {d.tempMinC}°
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
