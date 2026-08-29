const STEPS = [
  'Checking the forecast…',
  'Reading your closet…',
  'Matching colors to the destination…',
  'Assembling daily outfits…',
]

import { useEffect, useState } from 'react'

export default function LoadingScreen({ destination }: { destination: string }) {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % STEPS.length)
    }, 700)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-coral/30" />
        <span
          className="animate-float-slow grid h-20 w-20 place-items-center rounded-full text-4xl shadow-lg"
          style={{ background: 'linear-gradient(135deg, #ff9b54, #ff6b5e)' }}
        >
          🧳
        </span>
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold">
          Building your palette for {destination || 'your trip'}
        </h2>
        <p className="mt-2 text-sm font-medium text-ink/50">{STEPS[stepIndex]}</p>
      </div>
      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-black/10">
        <div className="h-full w-1/3 animate-shimmer rounded-full bg-coral" />
      </div>
    </div>
  )
}
