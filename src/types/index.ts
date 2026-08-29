// Core domain types for Heygotchu

export type ClothingCategory =
  | 'top'
  | 'bottom'
  | 'dress'
  | 'outerwear'
  | 'footwear'
  | 'swimwear'
  | 'accessory'

export const CLOTHING_CATEGORIES: ClothingCategory[] = [
  'top',
  'bottom',
  'dress',
  'outerwear',
  'footwear',
  'swimwear',
  'accessory',
]

export type WarmthLevel = 'light' | 'medium' | 'warm' | 'insulated'

export const WARMTH_LEVELS: WarmthLevel[] = ['light', 'medium', 'warm', 'insulated']

export type Formality = 'athletic' | 'casual' | 'smart-casual' | 'formal'

export const FORMALITY_LEVELS: Formality[] = ['athletic', 'casual', 'smart-casual', 'formal']

// --- Coverage & fit -------------------------------------------------------
// These describe how much an individual garment covers, independent of
// whether the wearer wants that coverage — the generator (see
// outfitGenerator.ts) is what decides whether an item is eligible based on
// the user's saved ClothingPreferences. Keeping this data on the item lets
// someone log their *real* closet honestly (sleeveless tops included) while
// Heygotchu still only ever recommends what matches their preferences.

export type SleeveLength = 'sleeveless' | 'short' | 'half' | 'three-quarter' | 'full'

export const SLEEVE_LENGTHS: SleeveLength[] = ['sleeveless', 'short', 'half', 'three-quarter', 'full']
// Options a person can pick as a *preference* — sleeveless is intentionally
// excluded here; it only ever appears as something an item can BE.
export const SLEEVE_PREFERENCE_OPTIONS: SleeveLength[] = ['short', 'half', 'three-quarter', 'full']

export type NecklineDepth = 'high' | 'moderate' | 'low'
export const NECKLINE_DEPTHS: NecklineDepth[] = ['high', 'moderate', 'low']

export type HemLength = 'mini' | 'above-knee' | 'knee' | 'below-knee' | 'ankle' | 'full-length'
export const HEM_LENGTHS: HemLength[] = ['mini', 'above-knee', 'knee', 'below-knee', 'ankle', 'full-length']
// Ordered shortest -> longest so "at least knee length" can be checked by index.
const HEM_ORDER: HemLength[] = ['mini', 'above-knee', 'knee', 'below-knee', 'ankle', 'full-length']
export function hemAtLeast(hem: HemLength, minimum: HemLength): boolean {
  return HEM_ORDER.indexOf(hem) >= HEM_ORDER.indexOf(minimum)
}

export type FitStyle = 'relaxed' | 'regular' | 'fitted' | 'tight'
export const FIT_STYLES: FitStyle[] = ['relaxed', 'regular', 'fitted', 'tight']

export type BottomStyle = 'pants' | 'shorts' | 'skirt'
export const BOTTOM_STYLES: BottomStyle[] = ['pants', 'shorts', 'skirt']

// "One-piece" vs "two-piece" garment structure — mainly meaningful for
// swimwear (one-piece swimsuit vs. bikini) and dress-category matching sets
// (jumpsuit/dress vs. a co-ord top+bottom set logged as one entry).
export type PieceCount = 'one-piece' | 'two-piece'
export const PIECE_COUNTS: PieceCount[] = ['one-piece', 'two-piece']

// Swim-specific style, since "modest"/burkini-style swimwear doesn't fit
// neatly on the sleeve/hem scale used for everyday tops and dresses.
export type SwimStyle = 'one-piece' | 'two-piece' | 'modest-swim' // modest-swim = burkini-style, full coverage
export const SWIM_STYLES: SwimStyle[] = ['one-piece', 'two-piece', 'modest-swim']

export interface CoverageProfile {
  sleeveLength?: SleeveLength // tops, dresses
  strapless?: boolean // true = strapless / spaghetti-strap / thin-strap / bare shoulders
  backless?: boolean // true = open/bare back
  neckline?: NecklineDepth // tops, dresses
  hemLength?: HemLength // dresses, and bottoms when bottomStyle is 'skirt' or 'shorts'
  bottomStyle?: BottomStyle // bottoms only
  pieceCount?: PieceCount // dresses (jumpsuit/dress vs. co-ord set)
  swimStyle?: SwimStyle // swimwear only
  fit?: FitStyle
}

// Who a garment is cut/styled for. Purely descriptive metadata — the
// coverage rules and generator apply identically regardless of this value,
// so a single account can hold a mixed closet (e.g. packing for a partner,
// or a family account) without anything being filtered out by gender.
export type ClothingGender = 'women' | 'men' | 'unisex'
export const CLOTHING_GENDERS: ClothingGender[] = ['women', 'men', 'unisex']

export interface ClothingItem {
  id: string
  name: string
  category: ClothingCategory
  gender: ClothingGender
  color: string // hex value, e.g. #4d8dff
  warmth: WarmthLevel
  formality: Formality
  weatherproof: boolean
  tags: string[]
  coverage?: CoverageProfile
  photo?: string // data URL, optional
  source?: 'manual' | 'ai-tagged' // how this item's details were entered
  createdAt: number
}

// --- Clothing preferences ---------------------------------------------
// A saved, reusable profile that's automatically applied to every future
// outfit generation. "More Coverage" is a soft bias layered on top of the
// generator's always-on hard rules (no sleeveless/strapless/mini/deep-cut
// items are ever recommended, toggle or not) — turning it off simply stops
// biasing toward the most conservative option within that always-safe range.

export type ClothingSize = 'XXS' | 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'custom'
export const CLOTHING_SIZES: ClothingSize[] = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'custom']

export type PreferredLength = 'knee' | 'below-knee' | 'ankle-or-full'
export const PREFERRED_LENGTHS: PreferredLength[] = ['knee', 'below-knee', 'ankle-or-full']

export type CoveragePreference = 'modest' | 'balanced' | 'relaxed'
export const COVERAGE_PREFERENCES: CoveragePreference[] = ['modest', 'balanced', 'relaxed']

export const STYLE_PREFERENCE_OPTIONS = [
  'Casual',
  'Classic & polished',
  'Boho',
  'Sporty & athletic',
  'Trendy',
  'Minimalist',
] as const
export type StylePreference = (typeof STYLE_PREFERENCE_OPTIONS)[number]

export interface BodyMeasurements {
  unit: 'cm' | 'in'
  heightCm?: number
  bust?: number
  waist?: number
  hips?: number
}

// A modesty style preference, most relevant to hijab-wearing users but
// available to anyone. Selecting 'hijabi' layers an even stricter tier on
// top of the hard coverage rules and the More Coverage bias: full sleeves
// only, high neckline only, ankle-or-full length only, no shorts, and
// swimwear is limited to modest/burkini-style pieces. It also nudges the
// generator to include a head covering (e.g. a hijab/scarf tagged
// accessory) when one exists in the closet, and steers AI "beyond your
// closet" suggestions toward hijab-friendly pieces.
export type ModestyStyle = 'hijabi' | 'non-hijabi' | 'no-preference'
export const MODESTY_STYLES: ModestyStyle[] = ['hijabi', 'non-hijabi', 'no-preference']

export interface ClothingPreferences {
  size: ClothingSize
  customSize?: string // used when size === 'custom'
  measurementsEnabled: boolean
  measurements: BodyMeasurements
  preferredLength: PreferredLength
  sleevePreference: SleeveLength // never 'sleeveless' — see SLEEVE_PREFERENCE_OPTIONS
  coveragePreference: CoveragePreference
  modestyStyle: ModestyStyle
  wardrobeFocus: ClothingGender // which department to default new items/suggestions to
  stylePreferences: StylePreference[]
  moreCoverage: boolean // the "More Coverage" toggle — defaults to true
}

export const DEFAULT_CLOTHING_PREFERENCES: ClothingPreferences = {
  size: 'M',
  measurementsEnabled: false,
  measurements: { unit: 'cm' },
  preferredLength: 'knee',
  sleevePreference: 'three-quarter',
  coveragePreference: 'modest',
  modestyStyle: 'no-preference',
  wardrobeFocus: 'unisex',
  stylePreferences: [],
  moreCoverage: true,
}

export type TripVibe =
  | 'Beach'
  | 'Mountains'
  | 'Hiking'
  | 'City'
  | 'Nature'
  | 'Food'
  | 'Culture'
  | 'Adventure'
  | 'Snow'
  | 'Relaxation'

export const TRIP_VIBES: TripVibe[] = [
  'Beach',
  'Mountains',
  'Hiking',
  'City',
  'Nature',
  'Food',
  'Culture',
  'Adventure',
  'Snow',
  'Relaxation',
]

export type WeatherCondition =
  | 'sunny'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rainy'
  | 'stormy'
  | 'snowy'
  | 'foggy'

export interface DayWeather {
  date: string // ISO yyyy-mm-dd
  tempMaxC: number
  tempMinC: number
  precipitationChance: number // 0-100
  windKph: number
  condition: WeatherCondition
}

export interface GeocodedPlace {
  name: string
  country: string
  admin1?: string
  latitude: number
  longitude: number
  timezone?: string
}

export interface DayOutfit {
  date: string
  dayIndex: number
  weather: DayWeather | null
  vibe: TripVibe | null
  items: ClothingItem[]
  notes: string[]
}

export interface PackingListEntry {
  item: ClothingItem
  wearCount: number
}

export interface TripPlan {
  id: string
  destination: string
  place: GeocodedPlace | null
  startDate: string
  endDate: string
  vibes: TripVibe[]
  palette: { hex: string; name: string }[]
  vibeSummary: string
  days: DayOutfit[]
  packingList: PackingListEntry[]
  gaps: string[]
  weatherSource: 'live' | 'estimated'
  heroImage: string
  createdAt: number
}
