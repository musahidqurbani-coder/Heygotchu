import { useState } from 'react'

export interface HowItWorksStep {
  n: string
  title: string
  body: string
  emoji: string
  /** Sets of 3 image URLs to shuffle through for this step's visual block. */
  imageSets: string[][]
}

// One "How it works" card: text + a 3-photo visual block with a shuffle
// button that cycles to the next curated set of 3 images.
function StepCard({ step }: { step: HowItWorksStep }) {
  const [setIndex, setSetIndex] = useState(0)
  const hasImages = step.imageSets.length > 0
  const images = hasImages ? step.imageSets[setIndex % step.imageSets.length] : []

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-ink font-display text-lg font-bold text-white">{step.n}</span>
        <span className="text-2xl" aria-hidden="true">{step.emoji}</span>
      </div>
      <h3 className="mt-3 font-display text-xl font-semibold">{step.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink/60">{step.body}</p>

      {hasImages && (
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-2">
            {images.map((src, i) => (
              <img
                key={`${setIndex}-${i}`}
                src={src}
                alt=""
                className="aspect-square w-full rounded-xl object-cover ring-1 ring-black/10"
                loading="lazy"
              />
            ))}
          </div>
          {step.imageSets.length > 1 && (
            <button
              onClick={() => setSetIndex((i) => (i + 1) % step.imageSets.length)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-cloud px-3 py-2 text-xs font-semibold text-ink/60 transition hover:bg-cloud/70 hover:text-ink"
            >
              <span aria-hidden="true">🔀</span> Shuffle examples
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function HowItWorksShuffle({ steps }: { steps: HowItWorksStep[] }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {steps.map((step) => (
        <StepCard key={step.n} step={step} />
      ))}
    </div>
  )
}
