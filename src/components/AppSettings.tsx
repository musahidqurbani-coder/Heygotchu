import { useState } from 'react'
import { LANGUAGES, useLang } from '../lib/i18n'
import { VIBES, applyVibe, currentVibe } from '../lib/vibes'
import { useAuth } from '../context/AuthContext'

interface AppSettingsProps {
  onBack?: () => void
}

// App-level settings: language, "My Vibe" (the selectable UI look), and the
// refer-&-earn link. Lives on the Preferences screen above the clothing
// preferences — which is why the back button lives up here, at the top of
// the page.
export default function AppSettings({ onBack }: AppSettingsProps) {
  const { lang, setLang } = useLang()
  const { user } = useAuth()
  const [vibe, setVibe] = useState(currentVibe)
  const [copied, setCopied] = useState(false)

  function pickVibe(id: string) {
    applyVibe(id)
    setVibe(id)
  }

  async function copyReferral() {
    if (!user) return
    const link = `https://heygotchu.com/?ref=${user.id}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Heygotchu',
          text: 'Outfit plans from your own closet — join me on Heygotchu ✨',
          url: link,
        })
        return
      }
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* user dismissed the share sheet */ }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pt-8 sm:px-8">
      {onBack && (
        <button
          onClick={onBack}
          className="text-sm font-medium text-ink/50 transition hover:text-ink focus:outline-none"
        >
          ← Back
        </button>
      )}
      {/* Language */}
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h3 className="font-display text-lg font-semibold">Language 🌐</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                lang === l.code ? 'bg-ink text-white' : 'bg-cloud text-ink/70 ring-1 ring-black/10 hover:text-ink'
              }`}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* My Vibe */}
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h3 className="font-display text-lg font-semibold">My Vibe 🎨</h3>
        <p className="mt-1 text-xs text-ink/50">Pick the look the whole app wears — yours alone, saved on this device.</p>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {VIBES.map((v) => (
            <button
              key={v.id}
              onClick={() => pickVibe(v.id)}
              aria-pressed={vibe === v.id}
              className={`rounded-2xl p-2.5 text-center transition ${
                vibe === v.id ? 'ring-2 ring-coral' : 'ring-1 ring-black/10 hover:ring-black/25'
              }`}
            >
              <span className="mx-auto flex h-10 w-full overflow-hidden rounded-xl ring-1 ring-black/10">
                {v.preview.map((c) => (
                  <span key={c} className="h-full flex-1" style={{ backgroundColor: c }} />
                ))}
              </span>
              <span className="mt-1.5 block text-xs font-semibold text-ink/80">
                {v.emoji} {v.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Refer & earn */}
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h3 className="font-display text-lg font-semibold">Refer &amp; earn 🔥</h3>
        <p className="mt-1 text-sm text-ink/60">
          Share your link — every friend who joins adds <strong>+5 days</strong> to your Daily Grind streak.
        </p>
        <button
          onClick={() => void copyReferral()}
          className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {copied ? 'Link copied ✓' : '🔗 Share my invite link'}
        </button>
      </div>
    </div>
  )
}
