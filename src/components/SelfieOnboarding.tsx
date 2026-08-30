import { useRef, useState, type ChangeEvent } from 'react'
import Modal from './Modal'
import AvatarFigure from './AvatarFigure'
import { aiApi, ApiClientError, type ColorAnalysisResult } from '../lib/apiClient'

interface SelfieOnboardingProps {
  onDone: (analysis: ColorAnalysisResult | null) => void // null = skipped
}

// First-run question after signing in: an optional selfie that Heygotchu
// turns into a personal clothing color palette. The photo is analyzed and
// immediately discarded server-side — only the palette is saved.
export default function SelfieOnboarding({ onDone }: SelfieOnboardingProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ColorAnalysisResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const analysis = await aiApi.analyzeSelfie(file)
      setResult(analysis)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong analyzing your photo — you can try again or skip.')
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <Modal title="Meet your avatar ✨" onClose={() => onDone(result)}>
        <div className="space-y-4">
          {result.avatar && (
            <div className="rounded-2xl bg-cloud/70 py-3">
              <AvatarFigure look={result.avatar} items={[]} height={230} />
              <p className="mt-1 text-center text-[11px] text-ink/45">
                Your outfits will appear on this avatar — a friendly cartoon, never your photo.
              </p>
            </div>
          )}
          {result.seasonalType && (
            <p className="text-sm text-ink/70">
              You're a <strong>{result.seasonalType}</strong>
              {result.undertone ? ` (${result.undertone} undertone)` : ''}.
            </p>
          )}
          {result.summary && <p className="text-sm text-ink/60">{result.summary}</p>}
          {result.bestColors && result.bestColors.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-ink/40">Colors that love you back</p>
              <div className="flex flex-wrap gap-2">
                {result.bestColors.map((c) => (
                  <span key={c.hex} className="flex items-center gap-1.5 rounded-full bg-cloud px-2.5 py-1 text-xs font-medium ring-1 ring-black/5">
                    <span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c.hex }} />
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-ink/40">
            Outfit suggestions will now favor these colors
            {(result.wardrobeDepartment === 'women' || result.wardrobeDepartment === 'men') &&
              ` and default to ${result.wardrobeDepartment}'s styles`}
            . You can change either anytime from Preferences.
          </p>
          <button
            onClick={() => onDone(result)}
            className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Sounds good!
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Create your avatar 📸" onClose={() => onDone(null)}>
      <div className="space-y-4">
        <p className="text-sm text-ink/70">
          Add a selfie and Heygotchu creates your <strong>AI avatar</strong> — a friendly cartoon that wears your
          real clothes when outfits are suggested — plus your personal color palette.
        </p>
        <p className="rounded-xl bg-cloud px-3.5 py-2.5 text-xs text-ink/50">
          🔒 Your photo is analyzed and immediately discarded — it's never stored. Only the color palette is saved
          to your account.
        </p>
        {error && (
          <p role="alert" className="rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm font-medium text-coral">{error}</p>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" capture="user" onChange={handleFile} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? 'Reading your colors…' : 'Add a selfie'}
        </button>
        <button
          onClick={() => onDone(null)}
          disabled={busy}
          className="w-full rounded-full px-5 py-2 text-sm font-medium text-ink/50 transition hover:bg-black/5 disabled:opacity-40"
        >
          Maybe later
        </button>
      </div>
    </Modal>
  )
}
