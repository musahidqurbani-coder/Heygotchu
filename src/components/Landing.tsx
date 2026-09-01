import logo from '../assets/logo-mark.png'
import ClosetGridPreview from './ClosetGridPreview'
import OutfitMixShuffle from './OutfitMixShuffle'
import PackedBagPreview from './PackedBagPreview'
import PreLoginCarousel from './PreLoginCarousel'
import { isRunningAsTwa } from '../lib/platform'

import mixTop1 from '../assets/landing/mix-top-1.jpg'
import mixTop2 from '../assets/landing/mix-top-2.jpg'
import mixTop3 from '../assets/landing/mix-top-3.jpg'
import mixTop4 from '../assets/landing/mix-top-4.jpg'
import mixBottom1 from '../assets/landing/mix-bottom-1.jpg'
import mixBottom2 from '../assets/landing/mix-bottom-2.jpg'
import mixBottom3 from '../assets/landing/mix-bottom-3.jpg'
import mixBottom4 from '../assets/landing/mix-bottom-4.jpg'
import mixShoe1 from '../assets/landing/mix-shoe-1.jpg'
import mixShoe2 from '../assets/landing/mix-shoe-2.jpg'
import mixShoe3 from '../assets/landing/mix-shoe-3.jpg'
import mixShoe4 from '../assets/landing/mix-shoe-4.jpg'
import closetAccessory1 from '../assets/landing/closet-accessory-1.jpg'

const MIX_TOPS = [mixTop1, mixTop2, mixTop3, mixTop4]
const MIX_BOTTOMS = [mixBottom1, mixBottom2, mixBottom3, mixBottom4]
const MIX_SHOES = [mixShoe1, mixShoe2, mixShoe3, mixShoe4]

const CLOSET_PREVIEW_ITEMS = [
  { photo: mixTop1, name: 'White lace kimono', meta: 'Top · Light' },
  { photo: mixBottom1, name: 'Green palm skirt', meta: 'Bottom · Light' },
  { photo: mixShoe2, name: 'Embroidered sandals', meta: 'Footwear · Light' },
  { photo: mixTop3, name: 'Tied white blouse', meta: 'Top · Medium' },
  { photo: mixBottom2, name: 'Tropical wide pants', meta: 'Bottom · Medium' },
  { photo: closetAccessory1, name: 'Straw sun hat', meta: 'Accessory · Light' },
  { photo: mixTop2, name: 'White halter top', meta: 'Top · Light' },
  { photo: mixBottom4, name: 'Black pleated skirt', meta: 'Bottom · Medium' },
]

const PACKED_BAG_PHOTOS = [mixTop3, mixBottom3, mixShoe1, mixTop2]

interface LandingProps {
  onLogin: () => void
  onSignup: () => void
}

// The public face of Heygotchu: answers "what is this, what does it do for
// me, what does the result look like" in the first screen — before anyone
// is asked to sign up.
export default function Landing({ onLogin, onSignup }: LandingProps) {
  return (
    <div className="min-h-screen">
      {/* nav — web only. The app's welcome screen is the carousel alone,
          with its own minimal top bar (see PreLoginCarousel), no browser-
          style page chrome above it. */}
      {!isRunningAsTwa() && (
        <header className="sticky top-0 z-40 border-b border-black/5 bg-cloud/85 backdrop-blur-md">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
            <div className="flex items-center gap-2">
              <img src={logo} alt="" className="h-10 w-10 rounded-lg object-contain shadow-sm" />
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
      )}

      {/* hero — the approved swipeable book-page carousel, faithfully built
          this time instead of a static section standing in for it. */}
      <PreLoginCarousel onSignup={onSignup} onLogin={onLogin} />

      {/* Everything below the carousel is web-only marketing copy — proof
          card, how-it-works, ChatGPT comparison, closing CTA. The app's
          pre-login experience is the carousel alone, exactly like the
          approved design; none of this scrolling content was ever part of
          that design, so it has no business showing inside the wrapped app. */}
      {!isRunningAsTwa() && (
      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="relative z-10 mx-auto -mt-10 max-w-3xl rounded-[2rem] bg-white p-6 text-left shadow-xl ring-1 ring-black/5 sm:-mt-12 sm:p-8">
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

        {/* how it works */}
        <section id="how" className="py-14">
          <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">How it works</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-ink font-display text-lg font-bold text-white">1</span>
                <span className="text-2xl" aria-hidden="true">📸</span>
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold">Snap your closet</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                Photograph your clothes — even a full outfit in one shot. AI detects every piece, crops each into
                its own picture, and reads its color, warmth and style. Here's what your closet looks like once
                it's in the app:
              </p>
              <div className="mt-4">
                <ClosetGridPreview items={CLOSET_PREVIEW_ITEMS} />
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-ink font-display text-lg font-bold text-white">2</span>
                <span className="text-2xl" aria-hidden="true">🎯</span>
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold">Pick the moment</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                A trip with live weather, or one of 50+ occasions — weddings, festive nights, parties,
                interviews, brunch. Mix and match from your own top, bottom, and shoe options:
              </p>
              <div className="mt-4">
                <OutfitMixShuffle tops={MIX_TOPS} bottoms={MIX_BOTTOMS} shoes={MIX_SHOES} />
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-ink font-display text-lg font-bold text-white">3</span>
                <span className="text-2xl" aria-hidden="true">🃏</span>
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold">Get your fits</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                Complete outfits, cross-matched across everything you own. Tap Nah, Remix, or Pack it — here's
                the fit deck once a bag is packed:
              </p>
              <div className="mt-4">
                <PackedBagPreview photos={PACKED_BAG_PHOTOS} />
              </div>
            </div>
          </div>
        </section>

        {/* why not chatgpt — this whole <main> is already web-only, but the
            reasoning for THIS section specifically: Play Store review
            guidelines are touchy about anything that reads as comparing or
            disparaging another app, so this framing belongs on the open web
            even independent of the broader app/web content split above. */}
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
                'Your rules, if you want them: optional preference and modesty modes are honored exactly — never imposed.',
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
      )}

      {!isRunningAsTwa() && (
        <footer className="border-t border-black/5 bg-white/60">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-ink/50 sm:px-8">
            <span>© {new Date().getFullYear()} Heygotchu · you choose the vibe, we gotchu ᰔ</span>
            <div className="flex gap-5">
              <a href="/terms.html" className="font-medium hover:text-ink">Terms of Use</a>
              <a href="/privacy.html" className="font-medium hover:text-ink">Privacy Policy</a>
              <a href="mailto:musahidqurbani@gmail.com" className="font-medium hover:text-ink">Contact</a>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
