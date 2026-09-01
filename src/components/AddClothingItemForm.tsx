import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  BOTTOM_STYLES,
  CLOTHING_CATEGORIES,
  CLOTHING_GENDERS,
  FIT_STYLES,
  FORMALITY_LEVELS,
  HEM_LENGTHS,
  NECKLINE_DEPTHS,
  PIECE_COUNTS,
  SLEEVE_LENGTHS,
  SWIM_STYLES,
  WARMTH_LEVELS,
  type BottomStyle,
  type ClothingCategory,
  type ClothingGender,
  type ClothingItem,
  type CoverageProfile,
  type FitStyle,
  type Formality,
  type HemLength,
  type NecklineDepth,
  type PieceCount,
  type SleeveLength,
  type SwimStyle,
  type WarmthLevel,
} from '../types'
import { resizeImageFile } from '../lib/imageResize'
import { isolateGarment } from '../lib/backgroundRemoval'
import { aiApi, ApiClientError } from '../lib/apiClient'

const SLEEVE_LABEL: Record<SleeveLength, string> = {
  sleeveless: 'Sleeveless',
  short: 'Short sleeve',
  half: 'Half sleeve',
  'three-quarter': '3/4 sleeve',
  full: 'Full sleeve',
}
const HEM_LABEL: Record<HemLength, string> = {
  mini: 'Mini (above mid-thigh)',
  'above-knee': 'Above the knee',
  knee: 'At the knee',
  'below-knee': 'Below the knee',
  ankle: 'Ankle length',
  'full-length': 'Full length',
}
const GENDER_LABEL: Record<ClothingGender, string> = {
  women: 'Women',
  men: 'Men',
  unisex: 'Unisex',
}
const PIECE_COUNT_LABEL: Record<PieceCount, string> = {
  'one-piece': 'One piece',
  'two-piece': 'Two piece',
}
const SWIM_STYLE_LABEL: Record<SwimStyle, string> = {
  'one-piece': 'One-piece',
  'two-piece': 'Two-piece',
  'modest-swim': 'Modest swim (burkini-style)',
}

interface AddClothingItemFormProps {
  onAdd: (item: Omit<ClothingItem, 'id' | 'createdAt'>) => void
  onClose: () => void
  // A photo captured before the form opened (the camera button flow) —
  // processed on mount exactly as if it had been picked via the file input.
  initialFile?: File
}

const TAG_OPTIONS = [
  'everyday', 'beach', 'city', 'hiking', 'mountains', 'nature',
  'food', 'culture', 'adventure', 'snow', 'relaxation',
]

export default function AddClothingItemForm({ onAdd, onClose, initialFile }: AddClothingItemFormProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ClothingCategory>('top')
  const [gender, setGender] = useState<ClothingGender>('unisex')
  const [color, setColor] = useState('#4d8dff')
  const [warmth, setWarmth] = useState<WarmthLevel>('medium')
  const [formality, setFormality] = useState<Formality>('casual')
  const [weatherproof, setWeatherproof] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [photo, setPhoto] = useState<string | undefined>(undefined)
  const [photoCleaned, setPhotoCleaned] = useState(false)
  const [nameError, setNameError] = useState<string | undefined>(undefined)
  const [aiTagging, setAiTagging] = useState(false)
  const [aiNote, setAiNote] = useState<string | undefined>(undefined)
  const [source, setSource] = useState<'manual' | 'ai-tagged'>('manual')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Coverage & fit — honest attributes describing the garment itself. These
  // feed the outfit generator's coverage rules (see outfitGenerator.ts); an
  // item can be logged exactly as it is, sleeveless or short included — it's
  // the generator, not the closet, that decides what gets recommended.
  const [sleeveLength, setSleeveLength] = useState<SleeveLength>('short')
  const [strapless, setStrapless] = useState(false)
  const [backless, setBackless] = useState(false)
  const [neckline, setNeckline] = useState<NecklineDepth>('moderate')
  const [bottomStyle, setBottomStyle] = useState<BottomStyle>('pants')
  const [hemLength, setHemLength] = useState<HemLength>('knee')
  const [fit, setFit] = useState<FitStyle>('regular')
  const [pieceCount, setPieceCount] = useState<PieceCount>('one-piece')
  const [swimStyle, setSwimStyle] = useState<SwimStyle>('one-piece')

  const showSleeveFields = category === 'top' || category === 'dress'
  const showBottomStyle = category === 'bottom'
  const showHemLength = category === 'dress' || (category === 'bottom' && bottomStyle !== 'pants')
  const showFit = category === 'top' || category === 'bottom' || category === 'dress'
  const showPieceCount = category === 'dress'
  const showSwimStyle = category === 'swimwear'

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  // A camera-captured photo arrives via the initialFile prop instead of the
  // file input — run it through the exact same pipeline on mount.
  useEffect(() => {
    if (initialFile) void processFile(initialFile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function processFile(file: File) {
    try {
      const dataUrl = await resizeImageFile(file)
      setPhoto(dataUrl)
      setPhotoCleaned(false)
      // Isolate the garment onto a clean background once it's ready — the
      // plain photo already shows above so there's nothing to wait on. If it
      // finishes before saving, the item is stored already-cleaned;
      // otherwise the background queue picks it up once, after save.
      isolateGarment(dataUrl)
        .then((cleaned) => {
          setPhoto(cleaned)
          setPhotoCleaned(true)
        })
        .catch(() => {
          // a photo it can't process — the plain photo already set above stays
        })
    } catch {
      // ignore — item can still be saved without a photo
    }

    // AI auto-tag: read the photo and prefill every field it can — the user
    // reviews and adjusts rather than typing everything by hand.
    setAiTagging(true)
    setAiNote(undefined)
    try {
      const tagged = await aiApi.tagPhoto(file)
      if (tagged.name) setName(tagged.name)
      if (CLOTHING_CATEGORIES.includes(tagged.category as ClothingCategory)) setCategory(tagged.category as ClothingCategory)
      if (CLOTHING_GENDERS.includes(tagged.gender as ClothingGender)) setGender(tagged.gender as ClothingGender)
      if (/^#[0-9a-fA-F]{6}$/.test(tagged.color)) setColor(tagged.color.toLowerCase())
      if (WARMTH_LEVELS.includes(tagged.warmth as WarmthLevel)) setWarmth(tagged.warmth as WarmthLevel)
      if (FORMALITY_LEVELS.includes(tagged.formality as Formality)) setFormality(tagged.formality as Formality)
      setWeatherproof(Boolean(tagged.weatherproof))
      setTags(tagged.tags.filter((t) => TAG_OPTIONS.includes(t)))
      const cov = tagged.coverage as CoverageProfile | undefined
      if (cov) {
        if (cov.sleeveLength && SLEEVE_LENGTHS.includes(cov.sleeveLength)) setSleeveLength(cov.sleeveLength)
        if (typeof cov.strapless === 'boolean') setStrapless(cov.strapless)
        if (typeof cov.backless === 'boolean') setBackless(cov.backless)
        if (cov.neckline && NECKLINE_DEPTHS.includes(cov.neckline)) setNeckline(cov.neckline)
        if (cov.bottomStyle && BOTTOM_STYLES.includes(cov.bottomStyle)) setBottomStyle(cov.bottomStyle)
        if (cov.hemLength && HEM_LENGTHS.includes(cov.hemLength)) setHemLength(cov.hemLength)
        if (cov.fit && FIT_STYLES.includes(cov.fit)) setFit(cov.fit)
        if (cov.pieceCount && PIECE_COUNTS.includes(cov.pieceCount)) setPieceCount(cov.pieceCount)
        if (cov.swimStyle && SWIM_STYLES.includes(cov.swimStyle)) setSwimStyle(cov.swimStyle)
      }
      setSource('ai-tagged')
      setAiNote('✨ Details filled in from your photo — review and adjust anything before saving.')
      if (nameError) setNameError(undefined)
    } catch (err) {
      setAiNote(
        err instanceof ApiClientError && (err.status === 429 || err.status === 503)
          ? err.message
          : 'AI tagging is unavailable right now — fill in the details manually.',
      )
    } finally {
      setAiTagging(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setNameError('Give this item a name.')
      return
    }

    const coverage: CoverageProfile = {}
    if (showSleeveFields) {
      coverage.sleeveLength = sleeveLength
      coverage.strapless = strapless
      coverage.backless = backless
      coverage.neckline = neckline
    }
    if (showBottomStyle) coverage.bottomStyle = bottomStyle
    if (showHemLength) coverage.hemLength = hemLength
    if (showFit) coverage.fit = fit
    if (showPieceCount) coverage.pieceCount = pieceCount
    if (showSwimStyle) coverage.swimStyle = swimStyle

    onAdd({
      name: name.trim(),
      category,
      gender,
      color,
      warmth,
      formality,
      weatherproof,
      tags,
      photo,
      photoCleaned,
      source,
      coverage: Object.keys(coverage).length > 0 ? coverage : undefined,
    })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-black/15 bg-cloud text-2xl text-ink/30 transition hover:border-coral hover:text-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          aria-label="Add a photo"
        >
          {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : '📷'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
        <div className="flex-1">
          <label htmlFor="item-name" className="mb-1 block text-sm font-semibold text-ink/70">
            Item name
          </label>
          <input
            id="item-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (nameError) setNameError(undefined)
            }}
            placeholder="Denim jacket"
            aria-invalid={!!nameError}
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-coral ${
              nameError ? 'border-coral' : 'border-black/10'
            }`}
          />
          {nameError && <p className="mt-1 text-xs font-medium text-coral">{nameError}</p>}
        </div>
      </div>

      {aiTagging && (
        <p className="rounded-xl bg-sky/10 px-3.5 py-2.5 text-sm font-medium text-sky">
          ✨ Reading your photo — the details below will fill in automatically…
        </p>
      )}
      {aiNote && !aiTagging && (
        <p className="rounded-xl bg-mint/15 px-3.5 py-2.5 text-sm text-ink/70">{aiNote}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="item-category" className="mb-1 block text-sm font-semibold text-ink/70">
            Category
          </label>
          <select
            id="item-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ClothingCategory)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm capitalize outline-none focus:ring-2 focus:ring-coral"
          >
            {CLOTHING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="item-gender" className="mb-1 block text-sm font-semibold text-ink/70">
            Department
          </label>
          <select
            id="item-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as ClothingGender)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-coral"
          >
            {CLOTHING_GENDERS.map((g) => (
              <option key={g} value={g}>
                {GENDER_LABEL[g]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="item-color" className="mb-1 block text-sm font-semibold text-ink/70">
            Color
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2">
            <input
              id="item-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-7 w-9 cursor-pointer rounded"
            />
            <span className="font-mono text-xs text-ink/50">{color}</span>
          </div>
        </div>

        <div>
          <label htmlFor="item-warmth" className="mb-1 block text-sm font-semibold text-ink/70">
            Warmth
          </label>
          <select
            id="item-warmth"
            value={warmth}
            onChange={(e) => setWarmth(e.target.value as WarmthLevel)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm capitalize outline-none focus:ring-2 focus:ring-coral"
          >
            {WARMTH_LEVELS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="item-formality" className="mb-1 block text-sm font-semibold text-ink/70">
            Formality
          </label>
          <select
            id="item-formality"
            value={formality}
            onChange={(e) => setFormality(e.target.value as Formality)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm capitalize outline-none focus:ring-2 focus:ring-coral"
          >
            {FORMALITY_LEVELS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(showSleeveFields || showBottomStyle || showFit || showSwimStyle) && (
        <div className="space-y-3 rounded-2xl bg-cloud p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Coverage &amp; fit</p>

          {showSleeveFields && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="item-sleeve" className="mb-1 block text-xs font-medium text-ink/60">
                  Sleeve length
                </label>
                <select
                  id="item-sleeve"
                  value={sleeveLength}
                  onChange={(e) => setSleeveLength(e.target.value as SleeveLength)}
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-coral"
                >
                  {SLEEVE_LENGTHS.map((s) => (
                    <option key={s} value={s}>
                      {SLEEVE_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="item-neckline" className="mb-1 block text-xs font-medium text-ink/60">
                  Neckline
                </label>
                <select
                  id="item-neckline"
                  value={neckline}
                  onChange={(e) => setNeckline(e.target.value as NecklineDepth)}
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm capitalize outline-none focus:ring-2 focus:ring-coral"
                >
                  {NECKLINE_DEPTHS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm text-ink/70">
                <input
                  type="checkbox"
                  checked={strapless}
                  onChange={(e) => setStrapless(e.target.checked)}
                  className="h-4 w-4 rounded border-black/20 text-coral focus:ring-coral"
                />
                Strapless / spaghetti-strap / bare shoulders
              </label>
              <label className="col-span-2 flex items-center gap-2 text-sm text-ink/70">
                <input
                  type="checkbox"
                  checked={backless}
                  onChange={(e) => setBackless(e.target.checked)}
                  className="h-4 w-4 rounded border-black/20 text-coral focus:ring-coral"
                />
                Backless / open back
              </label>
              {showPieceCount && (
                <div className="col-span-2">
                  <label htmlFor="item-piece-count" className="mb-1 block text-xs font-medium text-ink/60">
                    Piece count
                  </label>
                  <select
                    id="item-piece-count"
                    value={pieceCount}
                    onChange={(e) => setPieceCount(e.target.value as PieceCount)}
                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-coral"
                  >
                    {PIECE_COUNTS.map((p) => (
                      <option key={p} value={p}>
                        {PIECE_COUNT_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {showSwimStyle && (
            <div>
              <label htmlFor="item-swim-style" className="mb-1 block text-xs font-medium text-ink/60">
                Swim style
              </label>
              <select
                id="item-swim-style"
                value={swimStyle}
                onChange={(e) => setSwimStyle(e.target.value as SwimStyle)}
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-coral"
              >
                {SWIM_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {SWIM_STYLE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showBottomStyle && (
            <div>
              <label htmlFor="item-bottom-style" className="mb-1 block text-xs font-medium text-ink/60">
                Style
              </label>
              <select
                id="item-bottom-style"
                value={bottomStyle}
                onChange={(e) => setBottomStyle(e.target.value as BottomStyle)}
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm capitalize outline-none focus:ring-2 focus:ring-coral"
              >
                {BOTTOM_STYLES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showHemLength && (
            <div>
              <label htmlFor="item-hem" className="mb-1 block text-xs font-medium text-ink/60">
                Length
              </label>
              <select
                id="item-hem"
                value={hemLength}
                onChange={(e) => setHemLength(e.target.value as HemLength)}
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-coral"
              >
                {HEM_LENGTHS.map((h) => (
                  <option key={h} value={h}>
                    {HEM_LABEL[h]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showFit && (
            <div>
              <label htmlFor="item-fit" className="mb-1 block text-xs font-medium text-ink/60">
                Fit
              </label>
              <select
                id="item-fit"
                value={fit}
                onChange={(e) => setFit(e.target.value as FitStyle)}
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm capitalize outline-none focus:ring-2 focus:ring-coral"
              >
                {FIT_STYLES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p className="text-xs text-ink/40">
            This describes the item itself — log it honestly. Your saved Clothing Preferences decide what
            actually gets recommended.
          </p>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-ink/70">
        <input
          type="checkbox"
          checked={weatherproof}
          onChange={(e) => setWeatherproof(e.target.checked)}
          className="h-4 w-4 rounded border-black/20 text-coral focus:ring-coral"
        />
        Rain / wind resistant
      </label>

      <div>
        <p className="mb-1.5 text-sm font-semibold text-ink/70">Good for (optional)</p>
        <div className="flex flex-wrap gap-1.5">
          {TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition ${
                tags.includes(tag)
                  ? 'border-transparent bg-ink text-white'
                  : 'border-black/10 bg-white text-ink/60 hover:border-black/20'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-black/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          Add to closet
        </button>
      </div>
    </form>
  )
}
