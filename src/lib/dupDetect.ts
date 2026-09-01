import type { ClothingItem } from '../types'

// Cross-upload duplicate detection: the same kurta photographed on different
// days should live in the closet once. Same category + close color + shared
// name words = likely the same physical garment. Shared with the bulk-upload
// batch dedupe so one photo-session and the whole closet use the same rules.

const NAME_STOPWORDS = new Set(['a', 'an', 'the', 'with', 'and', 'of', 'in'])

export function nameTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !NAME_STOPWORDS.has(t)),
  )
}

export function colorDistance(a: string, b: string): number {
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

type ItemLike = Pick<ClothingItem, 'name' | 'category' | 'color'>

export function looksLikeSameItem(a: ItemLike, b: ItemLike): boolean {
  if (a.category !== b.category) return false
  if (colorDistance(a.color, b.color) > 70) return false
  const ta = nameTokens(a.name)
  const tb = nameTokens(b.name)
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return (
    shared >= 2 ||
    (shared >= 1 &&
      (a.name.toLowerCase().includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(a.name.toLowerCase())))
  )
}

// Groups likely-duplicate closet items. Each group is sorted oldest-first —
// the first entry is the keeper, the rest are removal candidates.
export function findDuplicateGroups(closet: ClothingItem[]): ClothingItem[][] {
  const sorted = [...closet].sort((a, b) => a.createdAt - b.createdAt)
  const grouped = new Set<string>()
  const groups: ClothingItem[][] = []
  for (let i = 0; i < sorted.length; i++) {
    if (grouped.has(sorted[i].id)) continue
    const group = [sorted[i]]
    for (let j = i + 1; j < sorted.length; j++) {
      if (grouped.has(sorted[j].id)) continue
      if (looksLikeSameItem(sorted[i], sorted[j])) {
        group.push(sorted[j])
        grouped.add(sorted[j].id)
      }
    }
    if (group.length > 1) {
      groups.push(group)
      grouped.add(sorted[i].id)
    }
  }
  return groups
}
