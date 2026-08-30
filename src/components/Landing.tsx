import logo from '../assets/logo-mark.png'
import HowItWorksShuffle, { type HowItWorksStep } from './HowItWorksShuffle'

import s1aTop from '../assets/landing/step1-a-top.jpg'
import s1aBottom from '../assets/landing/step1-a-bottom.jpg'
import s1aFeet from '../assets/landing/step1-a-feet.jpg'
import s1bTop from '../assets/landing/step1-b-top.jpg'
import s1bBottom from '../assets/landing/step1-b-bottom.jpg'
import s1bFeet from '../assets/landing/step1-b-feet.jpg'
import s1cTop from '../assets/landing/step1-c-top.jpg'
import s1cBottom from '../assets/landing/step1-c-bottom.jpg'
import s1cFeet from '../assets/landing/step1-c-feet.jpg'
import s1dTop from '../assets/landing/step1-d-top.jpg'
import s1dBottom from '../assets/landing/step1-d-bottom.jpg'
import s1dFeet from '../assets/landing/step1-d-feet.jpg'

import s2_1a from '../assets/landing/step2-1a.jpg'
import s2_1b from '../assets/landing/step2-1b.jpg'
import s2_1c from '../assets/landing/step2-1c.jpg'
import s2_2a from '../assets/landing/step2-2a.jpg'
import s2_2b from '../assets/landing/step2-2b.jpg'
import s2_2c from '../assets/landing/step2-2c.jpg'
import s2_3a from '../assets/landing/step2-3a.jpg'
import s2_3b from '../assets/landing/step2-3b.jpg'
import s2_3c from '../assets/landing/step2-3c.jpg'

import s3_1a from '../assets/landing/step3-1a.jpg'
import s3_1b from '../assets/landing/step3-1b.jpg'
import s3_1c from '../assets/landing/step3-1c.jpg'
import s3_2a from '../assets/landing/step3-2a.jpg'
import s3_2b from '../assets/landing/step3-2b.jpg'
import s3_2c from '../assets/landing/step3-2c.jpg'

// Each step gets sets of real photos to shuffle through.
const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    n: '1',
    title: 'Snap your closet',
    body: 'Photograph your clothes — even a full outfit in one shot. AI detects every piece (top, bottom, scarf, jewelry), crops each into its own picture, and reads its color, warmth, sleeve length and style.',
    emoji: '📸',
    connected: true,
    imageSets: [
      [s1aTop, s1aBottom, s1aFeet],
      [s1bTop, s1bBottom, s1bFeet],
      [s1cTop, s1cBottom, s1cFeet],
      [s1dTop, s1dBottom, s1dFeet],
    ],
  },
  {
    n: '2',
    title: 'Pick the moment',
    body: 'A trip with live weather, or one of 50+ occasions — Sangeet, Mehndi, Eid, Diwali, weddings, interviews, brunch. Add an optional selfie to unlock your personal color palette.',
    emoji: '🎯',
    imageSets: [
      [s2_1a, s2_1b, s2_1c],
      [s2_2a, s2_2b, s2_2c],
      [s2_3a, s2_3b, s2_3c],
    ],
  },
  {
    n: '3',
    title: 'Get your fits',
    body: 'Complete outfits, cross-matched across everything you own — every piece shown as its own photo. Tap Nah, Remix, or Pack it, and walk away with a packing list that actually fits your bag.',
    emoji: '🃏',
    imageSets: [
      [s3_1a, s3_1b, s3_1c],
      [s3_2a, s3_2b, s3_2c],
    ],
  },
]

interface LandingProps {
  onLogin: () => void
  onSignup: () => void
}

// The public face of Heygotchu: answers "what is this, what does it do for
// me, what does the result look like" in the first screen — before anyone
// is asked to sign up.
export default function Landing({ onLogin, onSignup }: LandingProps) {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="min-h-screen">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-cloud/85 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="h-10 w-10 object-contain" />
            <span className="font-display text-xl font-semibold tracking-tight">Heygotchu</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onLogin} className="rounded-full px-4 py-2 text-sm font-semibold text-ink/70 transition hover:bg-black/5">
              Log in
            </button>
            <button onClick={onSignup} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
              Get started
            </button>
          </div>
        </nav>
      </header>

      {/* hero */}
      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="pb-12 pt-14 text-center sm:pt-20">
          <h1 className="mx-auto max-w-3xl font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
            Pack less.<br />Wear more.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-ink/65 sm:text-lg">
            Tell Heygotchu where you're going — or what the occasion is — and show it what you own.
            It builds the exact outfits and writes the packing list.
            From <strong>your</strong> closet. Nothing to buy.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={onSignup} className="rounded-full bg-coral px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-coral/30 transition hover:opacity-90">
              Build my first outfit plan →
            </button>
            <button onClick={() => scrollTo('how')} className="rounded-full bg-white px-7 py-3.5 text-base font-semibold text-ink/70 ring-1 ring-black/10 transition hover:bg-cloud">
              See how it works
            </button>
          </div>

          {/* the concrete example — show the product, not promises */}
          <div className="mx-auto mt-14 max-w-3xl rounded-[2rem] bg-white p-6 text-left shadow-xl ring-1 ring-black/5 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">A real result looks like this</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-white">3 days in Bali</span>
              <span className="rounded-full bg-cloud px-3.5 py-1.5 text-sm font-medium text-ink/70 ring-1 ring-black/10">31° · humid</span>
              <span className="rounded-full bg-cloud px-3.5 py-1.5 text-sm font-medium text-ink/70 ring-1 ring-black/10">carry-on only</span>
            </div>
            <p className="mt-4 font-display text-2xl font-bold sm:text-3xl">
              8 items <span className="text-ink/30">→</span> 9 outfits <span className="text-ink/30">→</span> 1 packing list
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { title: 'Beach day', colors: ['#f2b8a0', '#4d8dff', '#e8dcc7'] },
                { title: 'Temple visit', colors: ['#faf3ec', '#8a5cf6', '#8a5a52'] },
                { title: 'Dinner out', colors: ['#191423', '#4fd1a5', '#e8b98f'] },
              ].map((fit) => (
                <div key={fit.title} className="rounded-2xl bg-cloud p-3 ring-1 ring-black/5">
                  <div className="flex gap-1.5">
                    {fit.colors.map((c) => (
                      <span key={c} className="h-10 flex-1 rounded-lg ring-1 ring-black/10" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-ink/70">{fit.title}</p>
                  <p className="text-[10px] uppercase tracking-wider text-ink/40">from your closet</p>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-xl bg-sun/20 px-3.5 py-2.5 text-sm text-ink/70">
              💡 And it tells you what to <strong>leave at home</strong> — every piece must earn its place across multiple outfits.
            </p>
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="py-14">
          <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">How it works</h2>
          <HowItWorksShuffle steps={HOW_IT_WORKS} />
        </section>

        {/* why not chatgpt */}
        <section className="py-10">
          <div className="rounded-[2rem] bg-ink p-7 text-white sm:p-10">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              "Why not just ask ChatGPT?"
            </h2>
            <p className="mt-2 text-white/60">Because generic advice doesn't know your closet. Heygotchu does.</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                'It remembers your actual wardrobe — every piece, photographed and cropped.',
                'It cross-matches across everything you own: the kurta from one photo with the trousers from another.',
                'It flags duplicates so the same shirt never gets packed twice.',
                'Your palette comes from your selfie — colors that suit you, not anyone.',
                'Modesty-aware: hijabi mode, sleeve, neckline and hem rules are never broken.',
                'It tells you what to leave at home — the painful part generic AI skips.',
              ].map((line) => (
                <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-white/85">
                  <span className="text-mint" aria-hidden="true">✓</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* closing cta */}
        <section className="py-14 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Stop packing clothes you won't wear.</h2>
          <p className="mx-auto mt-3 max-w-md text-ink/60">
            Your closet already has the outfits. Heygotchu finds them.
          </p>
          <button onClick={onSignup} className="mt-6 rounded-full bg-coral px-8 py-4 text-lg font-bold text-white shadow-lg shadow-coral/30 transition hover:opacity-90">
            Get started — it's free
          </button>
        </section>
      </main>

      <footer className="border-t border-black/5 bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-ink/50 sm:px-8">
          <span>© {new Date().getFullYear()} Heygotchu · you choose the vibe, we gotchu ᰔ</span>
          <div className="flex gap-5">
            <a href="/privacy.html" className="font-medium hover:text-ink">Privacy Policy</a>
            <a href="mailto:musahidqurbani@gmail.com" className="font-medium hover:text-ink">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
