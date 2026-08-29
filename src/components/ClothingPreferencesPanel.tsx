import { useState } from 'react'
import {
  CLOTHING_GENDERS,
  CLOTHING_SIZES,
  COVERAGE_PREFERENCES,
  MODESTY_STYLES,
  PREFERRED_LENGTHS,
  SLEEVE_PREFERENCE_OPTIONS,
  STYLE_PREFERENCE_OPTIONS,
  type ClothingGender,
  type ClothingPreferences,
  type CoveragePreference,
  type ModestyStyle,
  type PreferredLength,
  type SleeveLength,
  type StylePreference,
} from '../types'

interface ClothingPreferencesPanelProps {
  preferences: ClothingPreferences
  onSave: (preferences: ClothingPreferences) => void
  onBack: () => void
}

const LENGTH_LABEL: Record<PreferredLength, string> = {
  knee: 'At the knee',
  'below-knee': 'Below the knee',
  'ankle-or-full': 'Ankle length or full length',
}
const SLEEVE_LABEL: Record<SleeveLength, string> = {
  sleeveless: 'Sleeveless',
  short: 'Short sleeve',
  half: 'Half sleeve',
  'three-quarter': '3/4 sleeve',
  full: 'Full sleeve',
}
const COVERAGE_LABEL: Record<CoveragePreference, string> = {
  modest: 'Modest — fuller coverage throughout',
  balanced: 'Balanced — comfortable everyday coverage',
  relaxed: 'Relaxed — within Heygotchu’s built-in limits',
}
const MODESTY_LABEL: Record<ModestyStyle, string> = {
  hijabi: 'Hijabi — full sleeves, high neckline, ankle-or-full length, no shorts',
  'non-hijabi': 'Non-hijabi',
  'no-preference': 'No preference',
}
const GENDER_LABEL: Record<ClothingGender, string> = {
  women: 'Women',
  men: 'Men',
  unisex: 'Unisex / mixed',
}

export default function ClothingPreferencesPanel({ preferences, onSave, onBack }: ClothingPreferencesPanelProps) {
  const [draft, setDraft] = useState<ClothingPreferences>(preferences)
  const [saved, setSaved] = useState(false)

  function update<K extends keyof ClothingPreferences>(key: K, value: ClothingPreferences[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
    setSaved(false)
  }

  function toggleStyle(style: StylePreference) {
    update(
      'stylePreferences',
      draft.stylePreferences.includes(style)
        ? draft.stylePreferences.filter((s) => s !== style)
        : [...draft.stylePreferences, style],
    )
  }

  function handleSave() {
    onSave(draft)
    setSaved(true)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
      <button onClick={onBack} className="mb-1 text-sm font-medium text-ink/50 transition hover:text-ink">
        ← Back
      </button>
      <h1 className="font-display text-3xl font-semibold">My Clothing Preferences</h1>
      <p className="mt-1 text-sm text-ink/50">
        Saved automatically and applied to every outfit Heygotchu generates from here on. Trip-specific weather and
        occasion are still set per trip on the planner — this is about fit, coverage, and style.
      </p>

      <div className="mt-6 space-y-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-8">
        {/* More Coverage toggle */}
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-cloud p-4">
          <div>
            <p className="font-semibold text-ink">More Coverage</p>
            <p className="text-xs text-ink/55">
              Biases every recommendation toward fuller sleeves, longer hems, and pants over shorts/skirts.
              Heygotchu never suggests sleeveless, strapless, or very short pieces either way.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.moreCoverage}
            onClick={() => update('moreCoverage', !draft.moreCoverage)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 ${
              draft.moreCoverage ? 'bg-mint' : 'bg-black/15'
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                draft.moreCoverage ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Size */}
        <div>
          <p className="mb-2 text-sm font-semibold text-ink/70">Clothing size</p>
          <div className="flex flex-wrap gap-1.5">
            {CLOTHING_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => update('size', size)}
                aria-pressed={draft.size === size}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  draft.size === size
                    ? 'border-transparent bg-ink text-white'
                    : 'border-black/10 bg-white text-ink/60 hover:border-black/20'
                }`}
              >
                {size === 'custom' ? 'Other' : size}
              </button>
            ))}
          </div>
          {draft.size === 'custom' && (
            <input
              value={draft.customSize ?? ''}
              onChange={(e) => update('customSize', e.target.value)}
              placeholder="e.g. UK 12, 32W x 30L"
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-coral"
            />
          )}
        </div>

        {/* Measurements */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink/70">
            <input
              type="checkbox"
              checked={draft.measurementsEnabled}
              onChange={(e) => update('measurementsEnabled', e.target.checked)}
              className="h-4 w-4 rounded border-black/20 text-coral focus:ring-coral"
            />
            Add measurements for more accurate sizing (optional)
          </label>

          {draft.measurementsEnabled && (
            <div className="mt-3 space-y-3 rounded-2xl bg-cloud p-3.5">
              <div className="flex gap-1.5">
                {(['cm', 'in'] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => update('measurements', { ...draft.measurements, unit })}
                    aria-pressed={draft.measurements.unit === unit}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      draft.measurements.unit === unit
                        ? 'border-transparent bg-ink text-white'
                        : 'border-black/10 bg-white text-ink/60'
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ['heightCm', 'Height'],
                    ['bust', 'Bust/chest'],
                    ['waist', 'Waist'],
                    ['hips', 'Hips'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <label htmlFor={`meas-${field}`} className="mb-1 block text-xs font-medium text-ink/60">
                      {label}
                    </label>
                    <input
                      id={`meas-${field}`}
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={draft.measurements[field] ?? ''}
                      onChange={(e) =>
                        update('measurements', {
                          ...draft.measurements,
                          [field]: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-coral"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preferred length */}
        <div>
          <label htmlFor="pref-length" className="mb-1.5 block text-sm font-semibold text-ink/70">
            Preferred length for dresses &amp; skirts
          </label>
          <select
            id="pref-length"
            value={draft.preferredLength}
            onChange={(e) => update('preferredLength', e.target.value as PreferredLength)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-coral"
          >
            {PREFERRED_LENGTHS.map((l) => (
              <option key={l} value={l}>
                {LENGTH_LABEL[l]}
              </option>
            ))}
          </select>
        </div>

        {/* Sleeve preference */}
        <div>
          <label htmlFor="pref-sleeve" className="mb-1.5 block text-sm font-semibold text-ink/70">
            Sleeve preference
          </label>
          <select
            id="pref-sleeve"
            value={draft.sleevePreference}
            onChange={(e) => update('sleevePreference', e.target.value as SleeveLength)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-coral"
          >
            {SLEEVE_PREFERENCE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {SLEEVE_LABEL[s]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink/40">
            Sleeveless tops and dresses are never recommended, so it isn't offered as an option here.
          </p>
        </div>

        {/* Coverage preference */}
        <div>
          <label htmlFor="pref-coverage" className="mb-1.5 block text-sm font-semibold text-ink/70">
            Coverage preference
          </label>
          <select
            id="pref-coverage"
            value={draft.coveragePreference}
            onChange={(e) => update('coveragePreference', e.target.value as CoveragePreference)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-coral"
          >
            {COVERAGE_PREFERENCES.map((c) => (
              <option key={c} value={c}>
                {COVERAGE_LABEL[c]}
              </option>
            ))}
          </select>
        </div>

        {/* Modesty style */}
        <div>
          <label htmlFor="pref-modesty" className="mb-1.5 block text-sm font-semibold text-ink/70">
            Modesty style
          </label>
          <select
            id="pref-modesty"
            value={draft.modestyStyle}
            onChange={(e) => update('modestyStyle', e.target.value as ModestyStyle)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-coral"
          >
            {MODESTY_STYLES.map((m) => (
              <option key={m} value={m}>
                {MODESTY_LABEL[m]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink/40">
            Hijabi layers a stricter tier on top of Heygotchu's built-in coverage rules (full sleeves, high
            neckline, ankle-or-full length, no shorts, modest swimwear only) and favors a hijab from your closet
            when generating outfits.
          </p>
        </div>

        {/* Wardrobe focus */}
        <div>
          <label htmlFor="pref-wardrobe-focus" className="mb-1.5 block text-sm font-semibold text-ink/70">
            Wardrobe focus
          </label>
          <select
            id="pref-wardrobe-focus"
            value={draft.wardrobeFocus}
            onChange={(e) => update('wardrobeFocus', e.target.value as ClothingGender)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-coral"
          >
            {CLOTHING_GENDERS.map((g) => (
              <option key={g} value={g}>
                {GENDER_LABEL[g]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink/40">
            Which department new items default to and which suggestions Heygotchu's AI leans toward. Your closet
            can still hold a mix — nothing is hidden based on this.
          </p>
        </div>

        {/* Style preference */}
        <div>
          <p className="mb-2 text-sm font-semibold text-ink/70">Style preference (optional, pick any)</p>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_PREFERENCE_OPTIONS.map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => toggleStyle(style)}
                aria-pressed={draft.stylePreferences.includes(style)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  draft.stylePreferences.includes(style)
                    ? 'border-transparent bg-ink text-white'
                    : 'border-black/10 bg-white text-ink/60 hover:border-black/20'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-black/5 pt-5">
          {saved && <span className="text-sm font-medium text-mint">Saved</span>}
          <button
            onClick={handleSave}
            className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  )
}
