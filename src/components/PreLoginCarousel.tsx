import { useRef, useState } from 'react'
import mixTop1 from '../assets/landing/mix-top-1.jpg'
import mixTop2 from '../assets/landing/mix-top-2.jpg'
import mixTop3 from '../assets/landing/mix-top-3.jpg'
import mixBottom1 from '../assets/landing/mix-bottom-1.jpg'
import mixBottom4 from '../assets/landing/mix-bottom-4.jpg'
import mixShoe1 from '../assets/landing/mix-shoe-1.jpg'
import mixShoe2 from '../assets/landing/mix-shoe-2.jpg'
import closetAccessory1 from '../assets/landing/closet-accessory-1.jpg'

interface Step {
  eyebrow: string
  title: string
  titleEm?: string
  sub: string
  big: string
  small: string
  tick?: boolean
}

const STEPS: Step[] = [
  {
    eyebrow: 'Your closet',
    title: 'Pack less.',
    titleEm: 'Wear more.',
    sub: 'From clothes you already own.',
    big: mixTop1,
    small: closetAccessory1,
  },
  {
    eyebrow: 'Step one',
    title: 'Snap it.',
    sub: 'AI tags every piece.',
    big: mixTop3,
    small: mixBottom1,
  },
  {
    eyebrow: 'Step two',
    title: 'Mix it.',
    sub: 'Top, bottom, shoes.',
    big: mixTop2,
    small: mixShoe2,
  },
  {
    eyebrow: 'Step three',
    title: 'Pack it.',
    sub: '9 outfits, 1 bag.',
    big: mixBottom4,
    small: mixShoe1,
    tick: true,
  },
]

interface PreLoginCarouselProps {
  onSignup: () => void
  onLogin: () => void
}

// The pre-login hero from the approved design directions: a swipeable,
// book-style page-turn carousel (dark gradient, step number, overlapping
// image tiles) rather than a static section. This was approved as an HTML
// prototype early on but never actually ported into the real app until now
// — this is a faithful rebuild of that same design, not a new one.
export default function PreLoginCarousel({ onSignup, onLogin }: PreLoginCarouselProps) {
  const [current, setCurrent] = useState(0)
  const total = STEPS.length
  const touchStartX = useRef(0)

  function go(i: number) {
    setCurrent(Math.max(0, Math.min(total - 1, i)))
  }

  function handleBookClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const half = (e.clientX - rect.left) / rect.width < 0.5
    go(current + (half ? -1 : 1))
  }

  return (
    <section className="hero-glow relative overflow-hidden px-0 pb-0 pt-0 text-[#fff]">
      <div
        className="relative h-[440px] touch-pan-y select-none sm:h-[520px]"
        style={{ perspective: '1500px' }}
        onClick={handleBookClick}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchStartX.current
          if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1))
        }}
      >
        {STEPS.map((step, i) => {
          const rel = i - current
          return (
            <div
              key={step.title}
              className="hero-glow absolute inset-0 flex flex-col overflow-hidden px-6 pb-6 pt-10 sm:px-10"
              style={{
                transformOrigin: 'left center',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: rel < 0 ? 'rotateY(-178deg)' : 'rotateY(0deg)',
                zIndex: rel < 0 ? total + rel : total - rel,
                transition: 'transform 1s cubic-bezier(.45,.05,.35,1)',
                boxShadow: rel < 0 ? 'none' : i < total - 1 ? '2px 0 0 rgba(0,0,0,.15)' : 'none',
              }}
            >
              <span className="mx-auto mb-4 grid h-9 w-9 place-items-center rounded-full border border-[#fff]/35 bg-[#fff]/15 font-display text-sm font-bold">
                {i + 1}
              </span>
              <div className="ml-auto max-w-[82%] text-right">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#ffb1a5]">{step.eyebrow}</span>
                <h2 className="mt-2 font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
                  {step.title}
                  {step.titleEm && (
                    <>
                      <br />
                      <em className="font-medium not-italic text-[#ffb1a5]">{step.titleEm}</em>
                    </>
                  )}
                </h2>
                <p className="mt-2.5 text-sm font-semibold text-[#fff]/70">{step.sub}</p>
              </div>
              <div className="relative mt-auto h-[190px] w-[210px]">
                <div className="absolute left-1.5 top-3.5 h-[150px] w-[150px] -rotate-3 overflow-hidden rounded-2xl bg-[#f2ead9] shadow-[0_16px_34px_rgba(0,0,0,.35)]">
                  <img src={step.big} alt="" className="h-full w-full object-cover mix-blend-multiply" />
                </div>
                <div className="absolute left-[82px] top-0 h-24 w-24 rotate-6 overflow-hidden rounded-2xl bg-[#f2ead9] shadow-[0_16px_34px_rgba(0,0,0,.35)]">
                  <img src={step.small} alt="" className="h-full w-full object-cover mix-blend-multiply" />
                  {step.tick && (
                    <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-mint text-xs text-[#fff] shadow-[0_6px_14px_rgba(79,209,165,.5)]">
                      ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="relative z-10 flex justify-center gap-1.5 bg-ink/90 pb-3 pt-3.5">
        {STEPS.map((step, i) => (
          <button
            key={step.title}
            aria-label={`Go to step ${i + 1}`}
            onClick={() => go(i)}
            className={`h-1.5 rounded-full transition-all ${i === current ? 'w-4 bg-coral' : 'w-1.5 bg-[#fff]/30'}`}
          />
        ))}
      </div>
      <div className="relative z-10 flex flex-col gap-2 bg-ink/90 px-6 pb-6 sm:px-10">
        <button onClick={onSignup} className="rounded-full bg-coral px-5 py-3.5 text-sm font-bold text-[#fff] shadow-lg shadow-coral/40 transition hover:opacity-90">
          Build my first outfit plan →
        </button>
        <button onClick={onLogin} className="rounded-full bg-transparent py-1 text-xs font-semibold text-[#fff]/65 transition hover:text-[#fff]">
          I already have an account
        </button>
      </div>
    </section>
  )
}
