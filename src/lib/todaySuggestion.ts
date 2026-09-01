import type { ClothingItem, ClothingPreferences, DayOutfit, Formality } from '../types'
import { DEFAULT_CLOTHING_PREFERENCES } from '../types'
import { meetsHardCoverageRules } from './outfitGenerator'

// A lightweight, no-AI "what to wear today" pick: one style chip (Casual,
// Office, Party, Athletic) in, one outfit out, drawn straight from the
// closet — no weather, no trip context, no Claude call. Reuses the same
// hard coverage rules as the trip/occasion generator so nothing excluded by
// modesty preferences can be suggested here either.
// The style tag Claude's tagging rubric attaches for each chip — a direct
// tag hit outranks a mere formality match.
const STYLE_TAGS: Record<Formality, string[]> = {
  casual: ['everyday'],
  'smart-casual': ['office'],
  formal: ['party', 'festive'],
  athletic: ['sports'],
}

function bestMatch(pool: ClothingItem[], categories: ClothingItem['category'][], style: Formality, exclude: Set<string>): ClothingItem | null {
  const candidates = pool.filter((i) => categories.includes(i.category) && !exclude.has(i.id))
  if (candidates.length === 0) return null
  const dressy = style === 'smart-casual' || style === 'formal'
  let best: ClothingItem | null = null
  let bestScore = -Infinity
  for (const item of candidates) {
    let score = item.formality === style ? 2 : item.formality === 'casual' ? 0.4 : 0
    if (item.tags.some((t) => STYLE_TAGS[style].includes(t))) score += 3
    // Never pair a dressy pick with rain gear or gym wear: rain boots at the
    // office was a real (bad) suggestion this guards against.
    if (dressy && (item.tags.includes('rain') || item.tags.includes('sports') || item.formality === 'athletic')) {
      score -= item.category === 'footwear' ? 8 : 4
    }
    if (dressy && item.weatherproof && item.category === 'footwear') score -= 4
    score += Math.random() * 0.6
    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }
  return best
}

export function suggestTodayOutfit(
  closet: ClothingItem[],
  style: Formality,
  preferences: ClothingPreferences = DEFAULT_CLOTHING_PREFERENCES,
): DayOutfit {
  const eligible = closet.filter((item) => meetsHardCoverageRules(item, preferences))
  const items: ClothingItem[] = []
  const notes: string[] = []
  const used = () => new Set(items.map((i) => i.id))

  const preferDress = eligible.some((i) => i.category === 'dress') && Math.random() < 0.35
  if (preferDress) {
    const dress = bestMatch(eligible, ['dress'], style, used())
    if (dress) items.push(dress)
  }
  if (!items.some((i) => i.category === 'dress')) {
    const top = bestMatch(eligible, ['top'], style, used())
    if (top) items.push(top)
    else notes.push('No matching top in your closet — try a different style or add more tops.')
    const bottom = bestMatch(eligible, ['bottom'], style, used())
    if (bottom) items.push(bottom)
  }
  const footwear = bestMatch(eligible, ['footwear'], style, used())
  if (footwear) items.push(footwear)
  const outer = bestMatch(eligible, ['outerwear'], style, used())
  if (outer && Math.random() < 0.4) items.push(outer)
  const accessory = bestMatch(eligible, ['accessory'], style, used())
  if (accessory && Math.random() < 0.5) items.push(accessory)

  return {
    date: new Date().toISOString().slice(0, 10),
    dayIndex: 0,
    weather: null,
    vibe: null,
    items,
    notes,
  }
}
