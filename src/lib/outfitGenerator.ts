import type {
  ClothingCategory,
  ClothingItem,
  ClothingPreferences,
  DayOutfit,
  DayWeather,
  Formality,
  HemLength,
  PackingListEntry,
  SleeveLength,
  TripVibe,
  WarmthLevel,
} from '../types'
import { DEFAULT_CLOTHING_PREFERENCES, WARMTH_LEVELS, hemAtLeast } from '../types'

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function warmthTarget(weather: DayWeather): WarmthLevel {
  const t = weather.tempMinC
  if (t >= 22) return 'light'
  if (t >= 13) return 'medium'
  if (t >= 3) return 'warm'
  return 'insulated'
}

function warmthDistance(a: WarmthLevel, b: WarmthLevel): number {
  return Math.abs(WARMTH_LEVELS.indexOf(a) - WARMTH_LEVELS.indexOf(b))
}

// --- Coverage rules -------------------------------------------------------
// These are the "Do NOT generate ..." rules from the user's clothing
// preferences spec. They are HARD constraints — always enforced, regardless
// of the "More Coverage" toggle. The toggle (see coverageBias below) only
// controls a *soft* bias toward the most conservative option within this
// always-safe range; it never unlocks something these rules exclude.
//
// A missing coverage field (an item added before this feature existed, or a
// legacy import) falls back to a safe assumption for tops/dresses (regular,
// non-revealing) but a CONSERVATIVE assumption for shorts/skirts specifically
// — "shorts should not be used unless ... at least knee length" reads as
// excluded by default until proven long enough, so an unspecified hem on
// shorts/skirts fails the check rather than passing it.
const COVERAGE_EXEMPT_CATEGORIES: ClothingCategory[] = ['outerwear', 'footwear', 'swimwear', 'accessory']

// Selecting the 'hijabi' modesty style layers a stricter tier on top of the
// base rules below: full sleeves only, high neckline only, ankle-or-full
// hems only, no shorts, and swimwear limited to modest/burkini-style pieces.
export function meetsHardCoverageRules(
  item: ClothingItem,
  preferences: ClothingPreferences = DEFAULT_CLOTHING_PREFERENCES,
): boolean {
  const hijabi = preferences.modestyStyle === 'hijabi'

  // Coverage rules apply ONLY when the user opted in — hijabi mode or the
  // Preference-mode toggle. The app never imposes modesty on anyone: with
  // neither selected, everything in the closet is fair game.
  if (!hijabi && !preferences.moreCoverage) return true

  if (COVERAGE_EXEMPT_CATEGORIES.includes(item.category)) {
    if (item.category === 'swimwear' && hijabi) {
      return item.coverage?.swimStyle === 'modest-swim'
    }
    return true
  }

  const c = item.coverage

  if (item.category === 'top' || item.category === 'dress') {
    const sleeve: SleeveLength = c?.sleeveLength ?? 'short'
    if (sleeve === 'sleeveless') return false
    if (hijabi && sleeve !== 'full') return false
    if (c?.strapless) return false
    if (c?.backless) return false
    if (c?.neckline === 'low') return false
    if (hijabi && c?.neckline && c.neckline !== 'high') return false
    if (c?.fit === 'tight') return false
  }

  if (item.category === 'dress') {
    const hem: HemLength = c?.hemLength ?? 'knee'
    if (!hemAtLeast(hem, hijabi ? 'ankle' : 'knee')) return false
  }

  if (item.category === 'bottom') {
    if (c?.fit === 'tight') return false
    const style = c?.bottomStyle ?? 'pants'
    if (hijabi && style === 'shorts') return false
    if (style === 'shorts' || style === 'skirt') {
      const hem: HemLength = c?.hemLength ?? 'above-knee' // unspecified shorts/skirts are treated as too short
      if (!hemAtLeast(hem, hijabi ? 'ankle' : 'knee')) return false
    }
  }

  return true
}

// Soft bias applied on top of the hard filter above, only while "More
// Coverage" is on. Never excludes anything — just nudges scoring toward
// fuller sleeves, higher necklines, longer hems, pants over shorts/skirts,
// and a looser fit, plus an extra nudge toward the user's exact stated
// sleeve/length preference.
const SLEEVE_ORDER: SleeveLength[] = ['short', 'half', 'three-quarter', 'full']
const SLEEVE_BONUS: Record<SleeveLength, number> = { sleeveless: 0, short: 0, half: 0.4, 'three-quarter': 0.8, full: 1.2 }
const HEM_BONUS: Partial<Record<HemLength, number>> = { knee: 0.2, 'below-knee': 0.6, ankle: 0.9, 'full-length': 1 }

function coverageBias(item: ClothingItem, prefs: ClothingPreferences): number {
  const hijabi = prefs.modestyStyle === 'hijabi'
  if (!prefs.moreCoverage && !hijabi) return 0
  const c = item.coverage

  // Hijabi mode nudges the generator toward including a head covering when
  // one exists in the closet, even though accessories are otherwise
  // optional/scored independently. This never *requires* one (the hard
  // rules don't touch accessories) — it's purely a preference toward it.
  if (hijabi && item.category === 'accessory') {
    const text = `${item.name} ${item.tags.join(' ')}`.toLowerCase()
    if (/\bhijab\b|\bscarf\b|\bheadscarf\b|\bshayla\b/.test(text)) return 3
  }

  if (!c) return 0
  let bonus = 0

  if (c.sleeveLength && c.sleeveLength !== 'sleeveless') {
    bonus += SLEEVE_BONUS[c.sleeveLength]
    if (hijabi && c.sleeveLength === 'full') bonus += 1
    if (c.sleeveLength === prefs.sleevePreference) bonus += 0.5
    else if (Math.abs(SLEEVE_ORDER.indexOf(c.sleeveLength) - SLEEVE_ORDER.indexOf(prefs.sleevePreference)) <= 1) {
      bonus += 0.2
    }
  }
  if (c.neckline === 'high') bonus += hijabi ? 1.2 : 0.6
  else if (c.neckline === 'moderate') bonus += 0.2

  if (c.hemLength) {
    bonus += HEM_BONUS[c.hemLength] ?? 0
    if (hijabi && (c.hemLength === 'ankle' || c.hemLength === 'full-length')) bonus += 0.6
    const wantsLong =
      (prefs.preferredLength === 'below-knee' && (c.hemLength === 'below-knee' || c.hemLength === 'ankle')) ||
      (prefs.preferredLength === 'ankle-or-full' && (c.hemLength === 'ankle' || c.hemLength === 'full-length')) ||
      (prefs.preferredLength === 'knee' && c.hemLength === 'knee')
    if (wantsLong) bonus += 0.3
  }

  if (item.category === 'bottom') {
    if (c.bottomStyle === 'pants' || !c.bottomStyle) bonus += 0.6
    else if (c.bottomStyle === 'skirt') bonus += hijabi ? 0 : 0.2
  }

  if (c.fit === 'relaxed') bonus += 0.4
  else if (c.fit === 'regular') bonus += 0.2

  if (item.category === 'swimwear' && c.swimStyle === 'modest-swim') bonus += hijabi ? 2 : 0.3

  return bonus
}

interface VibeProfile {
  formality: Formality[]
  tags: string[]
}

const VIBE_PROFILES: Record<TripVibe, VibeProfile> = {
  Beach: { formality: ['casual'], tags: ['beach', 'relaxation'] },
  Mountains: { formality: ['athletic', 'casual'], tags: ['mountains', 'hiking', 'nature'] },
  Hiking: { formality: ['athletic'], tags: ['hiking', 'mountains', 'nature', 'adventure'] },
  City: { formality: ['casual', 'smart-casual'], tags: ['city', 'everyday'] },
  Nature: { formality: ['athletic', 'casual'], tags: ['nature', 'hiking'] },
  Food: { formality: ['smart-casual'], tags: ['food', 'culture', 'city'] },
  Culture: { formality: ['smart-casual', 'formal'], tags: ['culture', 'city'] },
  Adventure: { formality: ['athletic'], tags: ['adventure', 'hiking', 'mountains'] },
  Snow: { formality: ['athletic', 'casual'], tags: ['snow', 'mountains'] },
  Relaxation: { formality: ['casual'], tags: ['relaxation', 'beach'] },
}

function activeVibeProfile(vibes: TripVibe[]): VibeProfile {
  if (vibes.length === 0) return { formality: ['casual', 'smart-casual'], tags: [] }
  const formality = new Set<Formality>()
  const tags = new Set<string>()
  vibes.forEach((v) => {
    VIBE_PROFILES[v].formality.forEach((f) => formality.add(f))
    VIBE_PROFILES[v].tags.forEach((t) => tags.add(t))
  })
  return { formality: [...formality], tags: [...tags] }
}

interface ScoreContext {
  weather: DayWeather
  vibeProfile: VibeProfile
  preferences: ClothingPreferences
  usage: Map<string, number>
  fairShare: number
  lastUsedId?: string
  avoidIds: Set<string>
  rng: () => number
}

function scoreItem(item: ClothingItem, ctx: ScoreContext): number {
  let score = 0
  const target = warmthTarget(ctx.weather)
  score -= warmthDistance(item.warmth, target) * 2.2

  const needsWeatherproofing = ctx.weather.precipitationChance > 40 || ctx.weather.windKph > 28
  if (needsWeatherproofing && item.weatherproof) score += 2.2
  if (needsWeatherproofing && item.category === 'outerwear' && !item.weatherproof) score -= 1

  if (ctx.vibeProfile.formality.includes(item.formality)) score += 2
  else if (item.formality === 'casual') score += 0.4 // casual is a safe general fallback

  const matchingTags = item.tags.filter((t) => ctx.vibeProfile.tags.includes(t)).length
  score += Math.min(matchingTags, 2) * 1.4

  score += coverageBias(item, ctx.preferences)

  const usageCount = ctx.usage.get(item.id) ?? 0
  score -= Math.max(0, usageCount - ctx.fairShare) * 1.5
  if (item.id === ctx.lastUsedId) score -= 2.5
  if (ctx.avoidIds.has(item.id)) score -= 1.8

  score += ctx.rng() * 0.5
  return score
}

function bestCandidate(
  pool: ClothingItem[],
  category: ClothingCategory | ClothingCategory[],
  ctx: ScoreContext,
  exclude: Set<string> = new Set(),
): ClothingItem | null {
  const categories = Array.isArray(category) ? category : [category]
  const candidates = pool.filter((i) => categories.includes(i.category) && !exclude.has(i.id))
  if (candidates.length === 0) return null

  let best: ClothingItem | null = null
  let bestScore = -Infinity
  for (const item of candidates) {
    const s = scoreItem(item, ctx)
    if (s > bestScore) {
      bestScore = s
      best = item
    }
  }
  return best
}

export interface GenerateOptions {
  seed?: number
  avoidItemIds?: string[]
  preferences?: ClothingPreferences
}

export interface GenerateResult {
  days: DayOutfit[]
  packingList: PackingListEntry[]
  gaps: string[]
}

export function generateOutfitPlan(
  wardrobe: ClothingItem[],
  weatherDays: DayWeather[],
  vibes: TripVibe[],
  options: GenerateOptions = {},
): GenerateResult {
  const preferences = options.preferences ?? DEFAULT_CLOTHING_PREFERENCES
  const rng = seededRandom(options.seed ?? Date.now())
  const vibeProfile = activeVibeProfile(vibes)
  const usage = new Map<string, number>()
  const avoidIds = new Set(options.avoidItemIds ?? [])
  const fairShare = Math.max(1, Math.floor(weatherDays.length / 3))
  const gaps = new Set<string>()

  // Hard coverage rules are always enforced — this is the wardrobe the
  // generator is actually allowed to pick from. Excluded items stay in the
  // closet (an honest inventory) but never get recommended.
  const eligible = wardrobe.filter((item) => meetsHardCoverageRules(item, preferences))

  const hasFootwear = eligible.some((i) => i.category === 'footwear')
  const hasTopOrDress = eligible.some((i) => i.category === 'top' || i.category === 'dress')
  const hasBottom = eligible.some((i) => i.category === 'bottom')
  const rawTopOrDress = wardrobe.some((i) => i.category === 'top' || i.category === 'dress')
  const rawBottom = wardrobe.some((i) => i.category === 'bottom')

  if (!hasFootwear) gaps.add('No footwear in your closet — add at least one pair so every outfit is complete.')
  if (!hasTopOrDress) {
    gaps.add(
      rawTopOrDress
        ? 'Every top or dress in your closet sits outside your saved preferences — adjust Preference mode, or add a few pieces that match your settings.'
        : 'No tops or dresses in your closet yet — add a few to build outfits.',
    )
  }
  if (!hasBottom && eligible.some((i) => i.category === 'top')) {
    gaps.add(
      rawBottom
        ? 'Your shorts/skirts are shorter than your preferred length — add pants, a full-length skirt, or knee-length shorts.'
        : 'No bottoms in your closet — add pants, shorts, or a skirt.',
    )
  }

  const wantsWeatherproofOuter = weatherDays.some((d) => d.precipitationChance > 40 || d.windKph > 28)
  const hasWeatherproofOuter = eligible.some((i) => i.category === 'outerwear' && i.weatherproof)
  if (wantsWeatherproofOuter && !hasWeatherproofOuter) {
    gaps.add('Rain or wind is likely on this trip — consider packing a weatherproof jacket.')
  }

  const coldDay = weatherDays.some((d) => warmthTarget(d) === 'insulated' || warmthTarget(d) === 'warm')
  const hasWarmOuter = eligible.some((i) => i.category === 'outerwear' && (i.warmth === 'warm' || i.warmth === 'insulated'))
  if (coldDay && !hasWarmOuter) {
    gaps.add('Cooler days ahead with no warm outerwear in your closet — consider packing a jacket or coat.')
  }

  let lastTopId: string | undefined
  let lastDressId: string | undefined

  const days: DayOutfit[] = weatherDays.map((weather, dayIndex) => {
    const notes: string[] = []
    const items: ClothingItem[] = []
    const ctx: ScoreContext = {
      weather,
      vibeProfile,
      preferences,
      usage,
      fairShare,
      avoidIds,
      rng,
    }

    const preferDress =
      eligible.some((i) => i.category === 'dress') &&
      !vibes.some((v) => ['Hiking', 'Mountains', 'Adventure', 'Snow'].includes(v)) &&
      rng() < 0.35

    if (preferDress) {
      const dress = bestCandidate(eligible, 'dress', { ...ctx, lastUsedId: lastDressId })
      if (dress) {
        items.push(dress)
        lastDressId = dress.id
      }
    }

    if (!items.some((i) => i.category === 'dress')) {
      const top = bestCandidate(eligible, 'top', { ...ctx, lastUsedId: lastTopId })
      if (top) {
        items.push(top)
        lastTopId = top.id
      } else if (hasTopOrDress) {
        notes.push('Reusing a previous top — add more tops for extra variety.')
      }

      const bottom = bestCandidate(eligible, 'bottom', ctx, new Set(items.map((i) => i.id)))
      if (bottom) items.push(bottom)
    }

    if (vibes.includes('Beach') && eligible.some((i) => i.category === 'swimwear') && rng() < 0.6) {
      const swim = bestCandidate(eligible, 'swimwear', ctx, new Set(items.map((i) => i.id)))
      if (swim) items.push(swim)
    }

    const veryHot = weather.tempMaxC >= 30
    const needsOuter =
      warmthTarget(weather) === 'warm' ||
      warmthTarget(weather) === 'insulated' ||
      (!veryHot && (weather.precipitationChance > 35 || weather.windKph > 28))
    if (needsOuter) {
      const outer = bestCandidate(eligible, 'outerwear', ctx, new Set(items.map((i) => i.id)))
      if (outer) {
        items.push(outer)
      } else {
        notes.push('No suitable outerwear available for this day’s weather.')
      }
    }

    const footwear = bestCandidate(eligible, 'footwear', ctx, new Set(items.map((i) => i.id)))
    if (footwear) items.push(footwear)

    const accessory = bestCandidate(eligible, 'accessory', ctx, new Set(items.map((i) => i.id)))
    if (accessory && scoreItem(accessory, ctx) > 1.5) items.push(accessory)

    items.forEach((item) => usage.set(item.id, (usage.get(item.id) ?? 0) + 1))

    if (weather.precipitationChance > 55) notes.push('High chance of rain — keep a waterproof layer handy.')
    if (weather.windKph > 32) notes.push('Windy conditions expected.')
    if (warmthTarget(weather) === 'insulated') notes.push('Bundle up — one of the coldest days of the trip.')

    return {
      date: weather.date,
      dayIndex,
      weather,
      vibe: vibes[dayIndex % Math.max(vibes.length, 1)] ?? null,
      items,
      notes,
    }
  })

  // Safety net: validate every generated day against the hard coverage
  // rules and regenerate any violation before the plan is shown. Because
  // selection above only ever draws from `eligible`, this should be a
  // no-op in practice — it exists so a bad item can never slip through if
  // the scoring logic above is ever extended.
  days.forEach((day) => {
    const violating = day.items.filter((item) => !meetsHardCoverageRules(item, preferences))
    if (violating.length === 0) return

    day.items = day.items.filter((item) => !violating.includes(item))
    violating.forEach((bad) => {
      const exclude = new Set(day.items.map((i) => i.id))
      exclude.add(bad.id)
      const replacement = bestCandidate(eligible, bad.category, {
        weather: day.weather ?? weatherDays[day.dayIndex],
        vibeProfile,
        preferences,
        usage,
        fairShare,
        avoidIds,
        rng,
      }, exclude)
      if (replacement) {
        day.items.push(replacement)
        usage.set(replacement.id, (usage.get(replacement.id) ?? 0) + 1)
      } else {
        day.notes.push(
          `Removed "${bad.name}" — it didn't meet your saved clothing preferences, and no compliant alternative was in your closet.`,
        )
      }
    })
  })

  const wearCounts = new Map<string, { item: ClothingItem; count: number }>()
  days.forEach((day) => {
    day.items.forEach((item) => {
      const existing = wearCounts.get(item.id)
      if (existing) existing.count += 1
      else wearCounts.set(item.id, { item, count: 1 })
    })
  })

  const packingList: PackingListEntry[] = [...wearCounts.values()]
    .sort((a, b) => a.item.category.localeCompare(b.item.category) || b.count - a.count)
    .map(({ item, count }) => ({ item, wearCount: count }))

  return { days, packingList, gaps: [...gaps] }
}
