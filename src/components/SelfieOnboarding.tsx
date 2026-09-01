import { useRef, useState, type ChangeEvent } from 'react'
import Modal from './Modal'
import AmazonShopBlocks from './AmazonShopBlocks'
import { aiApi, ApiClientError, type ColorAnalysisResult } from '../lib/apiClient'
import { DEFAULT_CLOTHING_PREFERENCES } from '../types'

interface SelfieOnboardingProps {
  // null = fully skipped; ageRange rides along when the quick questions ran.
  onDone: (analysis: ColorAnalysisResult | null, ageRange?: '13-17' | '18-24' | '25-34' | '35+') => void
}

// The selfie-skip fallback: three quick questions (department, age, skin
// tone) that produce a preset color palette, so palette-driven features
// (Shop the palette, outfit colors) work even without a photo.
const SKIN_TONES: { id: string; label: string; swatch: string; analysis: ColorAnalysisResult }[] = [
  {
    id: 'fair-cool', label: 'Fair · pink undertone', swatch: '#f3d9cf',
    analysis: { ok: true, undertone: 'cool', depth: 'light', seasonalType: 'Cool Summer', bestColors: [
      { hex: '#7ba7d7', name: 'Powder Blue' }, { hex: '#b48ec9', name: 'Soft Lavender' }, { hex: '#d76a8c', name: 'Rose Pink' }, { hex: '#5f9ea0', name: 'Cool Teal' }, { hex: '#8d99ae', name: 'Dove Grey' } ] },
  },
  {
    id: 'fair-warm', label: 'Fair · golden undertone', swatch: '#f2d3b3',
    analysis: { ok: true, undertone: 'warm', depth: 'light', seasonalType: 'Light Spring', bestColors: [
      { hex: '#f2a65a', name: 'Apricot' }, { hex: '#8fbf6b', name: 'Fresh Green' }, { hex: '#f4c95d', name: 'Warm Gold' }, { hex: '#ee6c4d', name: 'Coral' }, { hex: '#7fd1c9', name: 'Aqua Mint' } ] },
  },
  {
    id: 'medium-olive', label: 'Medium · olive undertone', swatch: '#d3a878',
    analysis: { ok: true, undertone: 'neutral', depth: 'medium', seasonalType: 'Soft Autumn', bestColors: [
      { hex: '#7d8c5c', name: 'Olive Green' }, { hex: '#c9764f', name: 'Terracotta' }, { hex: '#40695f', name: 'Deep Teal' }, { hex: '#d9b25f', name: 'Honey Gold' }, { hex: '#8a5a52', name: 'Warm Cocoa' } ] },
  },
  {
    id: 'medium-warm', label: 'Medium · warm undertone', swatch: '#c68f5f',
    analysis: { ok: true, undertone: 'warm', depth: 'medium', seasonalType: 'Warm Autumn', bestColors: [
      { hex: '#b0562e', name: 'Rust Red' }, { hex: '#e8a83e', name: 'Marigold' }, { hex: '#317873', name: 'Peacock Teal' }, { hex: '#7a4a2b', name: 'Chestnut' }, { hex: '#c9a86a', name: 'Camel' } ] },
  },
  {
    id: 'deep-cool', label: 'Deep · cool undertone', swatch: '#8d5a3e',
    analysis: { ok: true, undertone: 'cool', depth: 'deep', seasonalType: 'Cool Winter', bestColors: [
      { hex: '#5636c9', name: 'Royal Purple' }, { hex: '#c2185b', name: 'Fuchsia' }, { hex: '#0f52ba', name: 'Sapphire' }, { hex: '#00897b', name: 'Emerald Teal' }, { hex: '#f5f5f0', name: 'Crisp White' } ] },
  },
  {
    id: 'deep-warm', label: 'Deep · warm undertone', swatch: '#6e4530',
    analysis: { ok: true, undertone: 'warm', depth: 'deep', seasonalType: 'Deep Autumn', bestColors: [
      { hex: '#d97f30', name: 'Burnt Orange' }, { hex: '#8c1c13', name: 'Brick Red' }, { hex: '#e8b03e', name: 'Amber Gold' }, { hex: '#274029', name: 'Forest Green' }, { hex: '#5c4033', name: 'Rich Brown' } ] },
  },
]

// First-run question after signing in: an optional selfie that Heygotchu
// turns into a personal clothing color palette. The photo is analyzed and
// immediately discarded server-side — only the palette is saved.
export default function SelfieOnboarding({ onDone }: SelfieOnboardingProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ColorAnalysisResult | null>(null)
  const [asking, setAsking] = useState(false)
  const [gender, setGender] = useState<'women' | 'men' | 'unisex' | null>(null)
  const [ageRange, setAgeRange] = useState<'13-17' | '18-24' | '25-34' | '35+' | null>(null)
  const [tone, setTone] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

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
      <Modal title="Your color palette ✨" onClose={() => onDone(result)}>
        <div className="space-y-4">
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
          {/* Real shoppable examples in the new palette, right below the
              palette results — one different palette color per section. */}
          {(result.bestColors?.length ?? 0) > 0 && (
            <AmazonShopBlocks
              preferences={{
                ...DEFAULT_CLOTHING_PREFERENCES,
                colorAnalysis: result,
                wardrobeFocus:
                  result.wardrobeDepartment === 'women' || result.wardrobeDepartment === 'men'
                    ? result.wardrobeDepartment
                    : DEFAULT_CLOTHING_PREFERENCES.wardrobeFocus,
              }}
              context="everyday"
            />
          )}
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

  if (asking) {
    const done = gender && ageRange && tone
    return (
      <Modal title="Quick questions instead ✨" onClose={() => onDone(null)}>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">Styles for</p>
            <div className="flex flex-wrap gap-2">
              {(['women', 'men', 'unisex'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                    gender === g ? 'bg-ink text-white' : 'bg-cloud text-ink/70 ring-1 ring-black/10'
                  }`}
                >
                  {g === 'unisex' ? 'Everything' : g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">Age</p>
            <div className="flex flex-wrap gap-2">
              {(['13-17', '18-24', '25-34', '35+'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAgeRange(a)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    ageRange === a ? 'bg-ink text-white' : 'bg-cloud text-ink/70 ring-1 ring-black/10'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">Skin tone — for your color palette</p>
            <div className="grid grid-cols-2 gap-2">
              {SKIN_TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
                    tone === t.id ? 'bg-ink text-white' : 'bg-cloud text-ink/70 ring-1 ring-black/10'
                  }`}
                >
                  <span className="h-6 w-6 shrink-0 rounded-full ring-1 ring-black/15" style={{ backgroundColor: t.swatch }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              const chosen = SKIN_TONES.find((t) => t.id === tone)!
              onDone(
                { ...chosen.analysis, wardrobeDepartment: !gender || gender === 'unisex' ? 'unspecified' : gender },
                ageRange ?? undefined,
              )
            }}
            disabled={!done}
            className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            Save my palette
          </button>
          <button
            onClick={() => onDone(null)}
            className="w-full rounded-full px-5 py-2 text-sm font-medium text-ink/50 transition hover:bg-black/5"
          >
            Skip everything
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="One quick question 📸" onClose={() => onDone(null)}>
      <div className="space-y-4">
        <p className="text-sm text-ink/70">
          Want outfit ideas in colors that actually suit you? Add a selfie or a photo of yourself and
          Heygotchu will work out your personal color palette.
        </p>
        <p className="rounded-xl bg-cloud px-3.5 py-2.5 text-xs text-ink/50">
          🔒 Your photo is analyzed and immediately discarded — it's never stored. Only the color palette is saved
          to your account.
        </p>
        {error && (
          <p role="alert" className="rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm font-medium text-coral">{error}</p>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" capture="user" onChange={handleFile} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? 'Reading your colors…' : '🤳 Take a selfie'}
        </button>
        <button
          onClick={() => galleryInputRef.current?.click()}
          disabled={busy}
          className="w-full rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink/70 ring-1 ring-black/10 transition hover:bg-cloud disabled:opacity-40"
        >
          🖼️ Choose your photo
        </button>
        <button
          onClick={() => setAsking(true)}
          disabled={busy}
          className="w-full rounded-full px-5 py-2 text-sm font-medium text-ink/50 transition hover:bg-black/5 disabled:opacity-40"
        >
          Skip — answer 3 quick questions instead
        </button>
      </div>
    </Modal>
  )
}
