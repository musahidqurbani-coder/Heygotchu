import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import Modal from './Modal'
import PhotoLightbox from './PhotoLightbox'
import { aiApi, ApiClientError, type TaggedItemResult } from '../lib/apiClient'
import { resizeImageFile, cropDataUrl } from '../lib/imageResize'
import { consumeSharedFiles } from '../lib/sharedIntake'
import {
  CLOTHING_CATEGORIES,
  CLOTHING_GENDERS,
  FORMALITY_LEVELS,
  WARMTH_LEVELS,
  type ClothingCategory,
  type ClothingGender,
  type ClothingItem,
  type CoverageProfile,
  type Formality,
  type WarmthLevel,
} from '../types'

const MAX_PHOTOS = 20

type PhotoStatus = 'queued' | 'reading' | 'done' | 'error'

interface PhotoJob {
  file: File
  preview: string // small resized data URL for the list thumbnail
  cropSource: string // higher-res copy that per-item crops are cut from
  status: PhotoStatus
  error?: string
  items: DetectedItem[]
}

interface DetectedItem {
  draft: Omit<ClothingItem, 'id' | 'createdAt'>
  included: boolean
  sleeve?: string
  // Why this row is unticked by default: the AI matched it to an existing
  // closet item, or it duplicates another photo in this same batch.
  dupNote?: string
}

// --- Batch-level duplicate detection ----------------------------------------
// The same kurta photographed twice (once with jeans, once with shorts)
// should land in the closet once. Same category + close color + similar
// name = duplicate; the first occurrence wins.

const NAME_STOPWORDS = new Set(['a', 'an', 'the', 'with', 'and', 'of', 'in'])

function nameTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !NAME_STOPWORDS.has(t)),
  )
}

function colorDistance(a: string, b: string): number {
  const parse = (h: string) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h.trim())
    if (!m) return null
    const v = parseInt(m[1], 16)
    return [v >> 16, (v >> 8) & 0xff, v & 0xff]
  }
  const ra = parse(a)
  const rb = parse(b)
  if (!ra || !rb) return 999
  return Math.sqrt((ra[0] - rb[0]) ** 2 + (ra[1] - rb[1]) ** 2 + (ra[2] - rb[2]) ** 2)
}

function looksLikeSameItem(a: Omit<ClothingItem, 'id' | 'createdAt'>, b: Omit<ClothingItem, 'id' | 'createdAt'>): boolean {
  if (a.category !== b.category) return false
  if (colorDistance(a.color, b.color) > 70) return false
  const ta = nameTokens(a.name)
  const tb = nameTokens(b.name)
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared >= 2 || (shared >= 1 && (a.name.toLowerCase().includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(a.name.toLowerCase())))
}

function markBatchDuplicates(jobs: PhotoJob[]): PhotoJob[] {
  const kept: Omit<ClothingItem, 'id' | 'createdAt'>[] = []
  return jobs.map((job) => ({
    ...job,
    items: job.items.map((it) => {
      if (!it.included) return it
      if (kept.some((k) => looksLikeSameItem(k, it.draft))) {
        return { ...it, included: false, dupNote: 'Duplicate in this batch' }
      }
      kept.push(it.draft)
      return it
    }),
  }))
}

interface BulkUploadModalProps {
  onClose: () => void
  onBulkAdd: (items: Omit<ClothingItem, 'id' | 'createdAt'>[]) => Promise<void>
}

function toDraft(tagged: TaggedItemResult, photo: string): DetectedItem {
  const coverage = (tagged.coverage ?? undefined) as CoverageProfile | undefined
  return {
    included: !tagged.alreadyInCloset,
    dupNote: tagged.alreadyInCloset ? 'Already in closet' : undefined,
    sleeve: coverage?.sleeveLength,
    draft: {
      name: tagged.name || 'Clothing item',
      category: CLOTHING_CATEGORIES.includes(tagged.category as ClothingCategory)
        ? (tagged.category as ClothingCategory)
        : 'accessory',
      gender: CLOTHING_GENDERS.includes(tagged.gender as ClothingGender) ? (tagged.gender as ClothingGender) : 'unisex',
      color: /^#[0-9a-fA-F]{6}$/.test(tagged.color) ? tagged.color.toLowerCase() : '#8a8a8a',
      warmth: WARMTH_LEVELS.includes(tagged.warmth as WarmthLevel) ? (tagged.warmth as WarmthLevel) : 'medium',
      formality: FORMALITY_LEVELS.includes(tagged.formality as Formality) ? (tagged.formality as Formality) : 'casual',
      weatherproof: Boolean(tagged.weatherproof),
      tags: Array.isArray(tagged.tags) ? tagged.tags.slice(0, 12) : [],
      coverage,
      photo,
      source: 'ai-tagged',
    },
  }
}

// Bulk closet import: up to 20 photos at once. Each photo can contain a
// whole outfit — every detected piece (top, bottom, scarf, hat, jewelry…)
// becomes its own row, reviewable before anything is saved.
export default function BulkUploadModal({ onClose, onBulkAdd }: BulkUploadModalProps) {
  const [jobs, setJobs] = useState<PhotoJob[]>([])
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState<string | undefined>(undefined)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    await processFiles(Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/')))
  }

  // Photos can also arrive via the phone's share sheet (Web Share Target) —
  // e.g. images saved from Instagram, shared straight into Heygotchu.
  useEffect(() => {
    void consumeSharedFiles().then((files) => {
      if (files.length > 0) void processFiles(files)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function processFiles(files: File[]) {
    if (files.length === 0) return
    const limited = files.slice(0, MAX_PHOTOS)
    setNote(files.length > MAX_PHOTOS ? `Only the first ${MAX_PHOTOS} photos were taken.` : undefined)

    const prepared: PhotoJob[] = []
    for (const file of limited) {
      try {
        prepared.push({
          file,
          preview: await resizeImageFile(file),
          cropSource: await resizeImageFile(file, 1600, 0.85),
          status: 'queued',
          items: [],
        })
      } catch {
        // unreadable image — skip it
      }
    }
    setJobs(prepared)
    setProcessing(true)

    // Process with a small concurrency so 20 photos don't take forever, but
    // the API isn't hammered either.
    let index = 0
    async function worker() {
      while (index < prepared.length) {
        const i = index++
        setJobs((prev) => prev.map((j, k) => (k === i ? { ...j, status: 'reading' } : j)))
        try {
          const tagged = await aiApi.tagPhotoMulti(prepared[i].file)
          // Each detected garment gets cropped out of the photo into its own
          // image, so a single outfit shot becomes visually separate items.
          const items = await Promise.all(
            tagged.map(async (t) =>
              toDraft(t, t.boundingBox ? await cropDataUrl(prepared[i].cropSource, t.boundingBox) : prepared[i].preview),
            ),
          )
          setJobs((prev) =>
            prev.map((j, k) =>
              k === i
                ? { ...j, status: 'done', items, error: items.length === 0 ? 'No clothing detected' : undefined }
                : j,
            ),
          )
        } catch (err) {
          const message =
            err instanceof ApiClientError ? err.message : 'Could not read this photo.'
          setJobs((prev) => prev.map((j, k) => (k === i ? { ...j, status: 'error', error: message } : j)))
          if (err instanceof ApiClientError && err.status === 429) {
            index = prepared.length // stop the queue — daily limit reached
          }
        }
      }
    }
    await Promise.all([worker(), worker(), worker()])
    // With every photo read, catch the same garment appearing across
    // different photos in this batch (first occurrence stays ticked).
    setJobs((prev) => markBatchDuplicates(prev))
    setProcessing(false)
  }

  function toggleItem(jobIdx: number, itemIdx: number) {
    setJobs((prev) =>
      prev.map((j, k) =>
        k === jobIdx
          ? { ...j, items: j.items.map((it, m) => (m === itemIdx ? { ...it, included: !it.included } : it)) }
          : j,
      ),
    )
  }

  const selected = jobs.flatMap((j) => j.items.filter((i) => i.included).map((i) => i.draft))

  async function handleSave() {
    if (selected.length === 0) return
    setSaving(true)
    try {
      await onBulkAdd(selected)
      onClose()
    } catch {
      setNote('Some items could not be saved — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Bulk upload 📸" onClose={onClose}>
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <>
            <p className="text-sm text-ink/70">
              Pick up to {MAX_PHOTOS} photos. Each photo can show one item or a whole outfit — tops, bottoms,
              scarves, hats, and jewelry are detected separately and each becomes its own closet item.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-black/15 bg-cloud px-5 py-10 text-sm font-semibold text-ink/60 transition hover:border-coral hover:text-coral"
            >
              📷 Choose photos ({MAX_PHOTOS} max)
            </button>
          </>
        ) : (
          <>
            {note && <p className="rounded-xl bg-sun/20 px-3.5 py-2.5 text-sm text-ink/70">{note}</p>}
            {processing && (
              <p className="rounded-xl bg-sky/10 px-3.5 py-2.5 text-sm font-medium text-sky">
                ✨ Reading {jobs.filter((j) => j.status === 'reading').length > 0 ? 'photos' : 'queue'}… (
                {jobs.filter((j) => j.status === 'done' || j.status === 'error').length}/{jobs.length} done)
              </p>
            )}
            <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
              {jobs.map((job, jobIdx) => (
                <div key={jobIdx} className="rounded-2xl bg-cloud p-3 ring-1 ring-black/5">
                  <div className="flex items-center gap-3">
                    <img src={job.preview} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    <p className="text-xs font-medium text-ink/50">
                      {job.status === 'queued' && 'Waiting…'}
                      {job.status === 'reading' && '✨ Detecting items…'}
                      {job.status === 'done' && `${job.items.length} item${job.items.length === 1 ? '' : 's'} found`}
                      {job.status === 'error' && <span className="text-coral">{job.error}</span>}
                      {job.status === 'done' && job.error && <span className="text-coral"> — {job.error}</span>}
                    </p>
                  </div>
                  {job.items.length > 0 && (
                    <div className="mt-2 divide-y divide-black/5">
                      {job.items.map((it, itemIdx) => (
                        <div key={itemIdx} className="flex items-center gap-2.5 py-2">
                          <input
                            type="checkbox"
                            checked={it.included}
                            onChange={() => toggleItem(jobIdx, itemIdx)}
                            className="h-4 w-4 shrink-0 rounded border-black/20 text-coral focus:ring-coral"
                          />
                          {it.draft.photo && (
                            <button
                              type="button"
                              onClick={() => setLightbox({ src: it.draft.photo!, alt: it.draft.name })}
                              aria-label={`View ${it.draft.name} crop full size`}
                              className="shrink-0 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                            >
                              <img src={it.draft.photo} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-black/10" />
                            </button>
                          )}
                          <span
                            className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10"
                            style={{ backgroundColor: it.draft.color }}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{it.draft.name}</span>
                          {it.dupNote && (
                            <span className="shrink-0 rounded-full bg-sun/25 px-2 py-0.5 text-[11px] font-semibold text-ink/60">
                              {it.dupNote}
                            </span>
                          )}
                          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold capitalize text-ink/60 ring-1 ring-black/10">
                            {it.draft.category}
                          </span>
                          {it.sleeve && (
                            <span className="hidden shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-ink/50 ring-1 ring-black/10 sm:inline">
                              {it.sleeve}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleSave}
              disabled={processing || saving || selected.length === 0}
              className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {saving
                ? 'Adding to closet…'
                : processing
                  ? 'Detecting…'
                  : `Add ${selected.length} item${selected.length === 1 ? '' : 's'} to closet`}
            </button>
          </>
        )}
      </div>
      {lightbox && <PhotoLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </Modal>
  )
}
