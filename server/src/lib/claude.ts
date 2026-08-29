import Anthropic from '@anthropic-ai/sdk'
import { env, isClaudeConfigured } from '../env'

const MODEL = 'claude-opus-5'

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!isClaudeConfigured()) {
    throw new Error('ANTHROPIC_API_KEY is not set — AI features are unavailable until it is configured.')
  }
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey })
  return client
}

// --- Photo auto-tagging ----------------------------------------------------
// Vision call: given a photo of a garment, return the same structured shape
// the manual "Add clothing item" form collects (see ClothingItem/
// CoverageProfile in the frontend's src/types/index.ts), so the client can
// prefill the form for the user to review and adjust rather than re-typing
// everything by hand.

const TAG_TOOL: Anthropic.Tool = {
  name: 'record_clothing_item',
  description: 'Record structured attributes describing the single clothing item shown in the photo.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Short, human-readable item name, e.g. "Navy linen shirt".' },
      category: { type: 'string', enum: ['top', 'bottom', 'dress', 'outerwear', 'footwear', 'swimwear', 'accessory'] },
      gender: { type: 'string', enum: ['women', 'men', 'unisex'], description: 'Who the garment appears cut/styled for.' },
      color: { type: 'string', description: 'The dominant color as a hex code, e.g. #4d8dff.' },
      warmth: { type: 'string', enum: ['light', 'medium', 'warm', 'insulated'] },
      formality: { type: 'string', enum: ['athletic', 'casual', 'smart-casual', 'formal'] },
      weatherproof: { type: 'boolean', description: 'True if it looks rain/wind resistant (e.g. a shell jacket).' },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Any that apply: everyday, beach, city, hiking, mountains, nature, food, culture, adventure, snow, relaxation.',
      },
      coverage: {
        type: 'object',
        description: 'Only include fields relevant to this category (skip entirely for outerwear/footwear/accessory).',
        properties: {
          sleeveLength: { type: 'string', enum: ['sleeveless', 'short', 'half', 'three-quarter', 'full'] },
          strapless: { type: 'boolean' },
          backless: { type: 'boolean' },
          neckline: { type: 'string', enum: ['high', 'moderate', 'low'] },
          hemLength: { type: 'string', enum: ['mini', 'above-knee', 'knee', 'below-knee', 'ankle', 'full-length'] },
          bottomStyle: { type: 'string', enum: ['pants', 'shorts', 'skirt'] },
          pieceCount: { type: 'string', enum: ['one-piece', 'two-piece'] },
          swimStyle: { type: 'string', enum: ['one-piece', 'two-piece', 'modest-swim'] },
          fit: { type: 'string', enum: ['relaxed', 'regular', 'fitted', 'tight'] },
        },
      },
    },
    required: ['name', 'category', 'gender', 'color', 'warmth', 'formality', 'weatherproof', 'tags'],
  },
}

export interface TaggedClothingItem {
  name: string
  category: string
  gender: string
  color: string
  warmth: string
  formality: string
  weatherproof: boolean
  tags: string[]
  coverage?: Record<string, unknown>
  // Present on multi-item tagging: where this item sits in the source photo
  // (normalized 0-1), so the client can crop it out into its own image.
  boundingBox?: { x: number; y: number; w: number; h: number }
  // Multi-item tagging: the same physical garment already exists in the
  // user's closet (e.g. the same kurta photographed with different bottoms).
  alreadyInCloset?: boolean
}

export async function tagClothingPhoto(base64Image: string, mediaType: string): Promise<TaggedClothingItem> {
  const anthropic = getClient()
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [TAG_TOOL],
    tool_choice: { type: 'tool', name: 'record_clothing_item' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: base64Image },
          },
          {
            type: 'text',
            text: 'This is a photo of one clothing item from someone\'s closet. Identify its attributes and call record_clothing_item with them. Do not describe or comment on any person, body, or face that may be visible — describe only the garment itself.',
          },
        ],
      },
    ],
  })

  const toolUse = message.content.find((block) => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return structured item data.')
  }
  return toolUse.input as TaggedClothingItem
}

// --- Multi-item photo tagging -----------------------------------------------
// Same idea as tagClothingPhoto, but for photos that show a whole outfit or
// several garments at once (top + bottom + scarf + hat + jewelry laid out or
// worn): every distinct item is recorded separately so each lands in its own
// closet section.

const TAG_MULTI_TOOL: Anthropic.Tool = {
  name: 'record_clothing_items',
  description: 'Record every distinct clothing item visible in the photo, one entry per item.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        maxItems: 8,
        items: {
          type: 'object',
          properties: {
            ...(TAG_TOOL.input_schema.properties as Record<string, unknown>),
            boundingBox: {
              type: 'object',
              description:
                "This item's location in the image, as fractions of the full image size (0-1): x/y is the top-left corner, w/h the box size. Include a little margin around the garment.",
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                w: { type: 'number' },
                h: { type: 'number' },
              },
              required: ['x', 'y', 'w', 'h'],
            },
            alreadyInCloset: {
              type: 'boolean',
              description:
                "True if this garment is clearly the SAME physical item as one already listed in the user's closet (same type, color, and distinctive design) — not merely a similar style.",
            },
          },
          required: ['name', 'category', 'gender', 'color', 'warmth', 'formality', 'weatherproof', 'tags', 'boundingBox'],
        },
      },
    },
    required: ['items'],
  },
}

export async function tagClothingPhotoMulti(
  base64Image: string,
  mediaType: string,
  closetSummary: string[] = [],
): Promise<TaggedClothingItem[]> {
  const anthropic = getClient()
  const closetBlock = closetSummary.length
    ? `\n\nThe user's closet already contains these items (name | category | color):\n${closetSummary
        .slice(0, 150)
        .map((s) => `- ${s}`)
        .join('\n')}\nIf a detected garment is clearly the SAME physical item as one of these (e.g. the same white kurta photographed again with different bottoms), still record it but set alreadyInCloset: true so it isn't added twice.`
    : ''
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3072,
    tools: [TAG_MULTI_TOOL],
    tool_choice: { type: 'tool', name: 'record_clothing_items' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: base64Image },
          },
          {
            type: 'text',
            text: `This photo is from someone's closet and may show one clothing item or several (e.g. a full outfit with a top, bottom, scarf, hat, and jewelry). Record EVERY distinct garment or accessory as its own entry in record_clothing_items — a scarf, hat, or piece of jewelry belongs in the 'accessory' category with a descriptive name (e.g. "Cream wool scarf"), shoes in 'footwear'. Skip anything that isn't clothing. For each item give its boundingBox as fractions of the image (0-1) tightly around that garment plus a small margin, so it can be cropped into its own picture. Do not describe or comment on any person, body, or face that may be visible — describe only the garments.${closetBlock}`,
          },
        ],
      },
    ],
  })
  const toolUse = message.content.find((block) => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('Claude did not return structured item data.')
  const input = toolUse.input as { items?: TaggedClothingItem[] }
  return input.items ?? []
}

// --- Selfie color-palette analysis ------------------------------------------
// Vision call used by the optional onboarding step: from a selfie, derive a
// personal color palette (undertone/depth + best colors) that outfit
// suggestions can use. The photo itself is analyzed in-memory and never
// stored — only this derived palette is saved into the user's preferences.
// The prompt is deliberately narrow: coloring only, no comments on identity,
// age, ethnicity, or appearance beyond color analysis.

const COLOR_ANALYSIS_TOOL: Anthropic.Tool = {
  name: 'record_color_analysis',
  description: 'Record a personal color-palette analysis derived from the photo.',
  input_schema: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'False if no person is clearly visible enough to analyze coloring.' },
      undertone: { type: 'string', enum: ['warm', 'cool', 'neutral'] },
      depth: { type: 'string', enum: ['light', 'medium', 'deep'] },
      seasonalType: { type: 'string', description: 'A friendly seasonal-color label, e.g. "Warm Autumn", "Cool Summer".' },
      bestColors: {
        type: 'array',
        maxItems: 8,
        items: {
          type: 'object',
          properties: { hex: { type: 'string' }, name: { type: 'string' } },
          required: ['hex', 'name'],
        },
        description: '6-8 flattering clothing colors for this coloring.',
      },
      avoidColors: {
        type: 'array',
        maxItems: 4,
        items: {
          type: 'object',
          properties: { hex: { type: 'string' }, name: { type: 'string' } },
          required: ['hex', 'name'],
        },
        description: '2-4 clothing colors that tend to clash with this coloring.',
      },
      summary: { type: 'string', description: 'One warm, encouraging sentence about the palette (the colors, not the person).' },
      wardrobeDepartment: {
        type: 'string',
        enum: ['women', 'men', 'unspecified'],
        description:
          "Which clothing department appears to suit this person, judged from overall presentation — used only as a default for clothing searches, and the user can change it anytime. Use 'unspecified' when unsure.",
      },
    },
    required: ['ok'],
  },
}

export interface ColorAnalysis {
  ok: boolean
  undertone?: 'warm' | 'cool' | 'neutral'
  depth?: 'light' | 'medium' | 'deep'
  seasonalType?: string
  bestColors?: { hex: string; name: string }[]
  avoidColors?: { hex: string; name: string }[]
  summary?: string
  wardrobeDepartment?: 'women' | 'men' | 'unspecified'
}

export async function analyzeSelfieColors(base64Image: string, mediaType: string): Promise<ColorAnalysis> {
  const anthropic = getClient()
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [COLOR_ANALYSIS_TOOL],
    tool_choice: { type: 'tool', name: 'record_color_analysis' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: base64Image },
          },
          {
            type: 'text',
            text: "This is a selfie a person shared to get a personal clothing color palette. Analyze ONLY their general coloring (skin undertone and depth, and hair/eye color where visible) and call record_color_analysis with a flattering palette of clothing colors. Also set wardrobeDepartment to the clothing department ('women' or 'men') their overall presentation suggests as a shopping default — it only pre-fills a preference they can change, so use 'unspecified' whenever it isn't obvious. Do not identify the person, and make no other comments about identity, age, ethnicity, attractiveness, or anything beyond color analysis. If no person is clearly visible, call the tool with ok=false.",
          },
        ],
      },
    ],
  })
  const toolUse = message.content.find((block) => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('Claude did not return a color analysis.')
  return toolUse.input as ColorAnalysis
}

// --- Occasion / location outfit ideas ---------------------------------------
// Builds complete outfit combinations (top + bottom, or dress/one-piece) from
// the user's real closet — referencing items by id — plus, when the closet
// falls short, specific new pieces worth getting. Respects the same hard
// coverage rules as everything else, and uses the saved color palette when
// one exists.

const OUTFITS_TOOL: Anthropic.Tool = {
  name: 'record_outfits',
  description: 'Record complete outfit combinations for the given occasion/location.',
  input_schema: {
    type: 'object',
    properties: {
      outfits: {
        type: 'array',
        maxItems: 4,
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short outfit name, e.g. "Mehndi-ready pastels".' },
            itemIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Ids of closet items making up this outfit (top+bottom or dress, plus outerwear/footwear/accessory if useful). Only use ids from the provided closet list.',
            },
            missing: {
              type: 'array',
              maxItems: 3,
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  category: { type: 'string', enum: ['top', 'bottom', 'dress', 'outerwear', 'footwear', 'swimwear', 'accessory'] },
                  color: { type: 'string', description: 'Suggested hex color.' },
                  reason: { type: 'string' },
                },
                required: ['name', 'category', 'reason'],
              },
              description: 'New pieces that would complete this outfit when the closet lacks them.',
            },
            stylingTip: { type: 'string', description: 'One short styling tip for this outfit.' },
          },
          required: ['title', 'itemIds', 'stylingTip'],
        },
      },
      generalAdvice: { type: 'string', description: '1-2 sentences of overall guidance for this occasion.' },
    },
    required: ['outfits', 'generalAdvice'],
  },
}

export interface OutfitIdea {
  title: string
  itemIds: string[]
  missing?: { name: string; category: string; color?: string; reason: string }[]
  stylingTip: string
}

export interface OutfitSuggestionContext {
  occasionLabel: string
  location?: string
  dateISO?: string
  modestyStyle: string
  coveragePreference: string
  wardrobeFocus: string
  colorAnalysis?: { seasonalType?: string; bestColors?: { hex: string; name: string }[]; avoidColors?: { hex: string; name: string }[] }
  closetLines: string[] // "id | name | category | color | formality | warmth | sleeve"
}

export async function suggestOutfitCombos(ctx: OutfitSuggestionContext): Promise<{ outfits: OutfitIdea[]; generalAdvice: string }> {
  const anthropic = getClient()
  const paletteText = ctx.colorAnalysis?.bestColors?.length
    ? `Personal color palette (${ctx.colorAnalysis.seasonalType ?? 'custom'}): best colors ${ctx.colorAnalysis.bestColors.map((c) => `${c.name} ${c.hex}`).join(', ')}${ctx.colorAnalysis.avoidColors?.length ? `; avoid ${ctx.colorAnalysis.avoidColors.map((c) => c.name).join(', ')}` : ''}. Favor outfits in or near the best colors.`
    : 'No personal color palette saved — pick colors that work well together for the occasion.'

  const prompt = `Occasion: ${ctx.occasionLabel}${ctx.location ? ` in ${ctx.location}` : ''}${ctx.dateISO ? ` on ${ctx.dateISO}` : ''}.
${paletteText}
User preferences: modesty style ${ctx.modestyStyle}, coverage ${ctx.coveragePreference}, wardrobe focus ${ctx.wardrobeFocus}.

Closet (each line is: id | name | category | color | formality | warmth | sleeve):
${ctx.closetLines.map((l) => `- ${l}`).join('\n') || '(empty closet)'}

Build up to 4 complete outfits for this occasion. Each outfit should be a wearable combination — a top plus a bottom, or a dress/one-piece — plus outerwear, footwear, or accessories from the closet when they help. Reference closet items ONLY by their exact ids. CROSS-MATCH freely: these items came from different photos and were never worn together, and the best outfit often pairs a top from one photo with a bottom from another (e.g. a white kurta photographed with blue jeans may pair better with black trousers from a different photo) — when a cross-matched pairing is the win, say so in the stylingTip. When the closet is missing a key piece for a great outfit, include it in "missing" with a suggested color (respecting the palette). Consider the occasion's cultural dress conventions (e.g. festive colors for Mehndi/Sangeet/Haldi, avoid plain black/white as the main color at Indian celebrations where inauspicious, subdued colors for funerals) and the likely weather for the location and date. Hard rules regardless of preferences: no sleeveless or strapless tops/dresses, no backless items, no deep necklines, dresses/skirts knee-length or longer, no above-knee shorts. If modesty style is "hijabi": full sleeves, high necklines, ankle-or-full lengths only, and include a hijab/scarf from the closet when one exists. Call record_outfits.`

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    tools: [OUTFITS_TOOL],
    tool_choice: { type: 'tool', name: 'record_outfits' },
    messages: [{ role: 'user', content: prompt }],
  })

  const toolUse = message.content.find((block) => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') return { outfits: [], generalAdvice: '' }
  return toolUse.input as { outfits: OutfitIdea[]; generalAdvice: string }
}

// --- Mini travel itinerary ---------------------------------------------------
// Day-by-day trip plan ideas sized to the vacation length — the "mini travel
// planner" shown on every generated trip.

const ITINERARY_TOOL: Anthropic.Tool = {
  name: 'record_itinerary',
  description: 'Record a day-by-day travel plan for the trip.',
  input_schema: {
    type: 'object',
    properties: {
      overview: { type: 'string', description: '1-2 sentence overview of how the trip is paced.' },
      days: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            day: { type: 'number', description: '1-based day number.' },
            title: { type: 'string', description: 'Short theme for the day, e.g. "Old town & street food".' },
            activities: {
              type: 'array',
              maxItems: 3,
              items: { type: 'string' },
              description: '2-3 concrete activity suggestions for this day.',
            },
            tip: { type: 'string', description: 'One practical tip for the day (timing, booking, what to carry).' },
          },
          required: ['day', 'title', 'activities'],
        },
      },
    },
    required: ['overview', 'days'],
  },
}

export interface ItineraryDay {
  day: number
  title: string
  activities: string[]
  tip?: string
}

export async function suggestItinerary(ctx: {
  destination: string
  dayCount: number
  vibes: string[]
  startDate?: string
}): Promise<{ overview: string; days: ItineraryDay[] }> {
  const anthropic = getClient()
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    tools: [ITINERARY_TOOL],
    tool_choice: { type: 'tool', name: 'record_itinerary' },
    messages: [
      {
        role: 'user',
        content: `Plan a ${ctx.dayCount}-day trip to ${ctx.destination}${ctx.startDate ? ` starting ${ctx.startDate}` : ''}. Traveler interests: ${ctx.vibes.join(', ') || 'general sightseeing'}. Create exactly ${ctx.dayCount} days (day 1 = arrival day, last day = departure day — keep those lighter). Suggest real, well-known places and experiences for this destination where you know them; keep each activity to one short sentence. Call record_itinerary.`,
      },
    ],
  })
  const toolUse = message.content.find((block) => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('Claude did not return an itinerary.')
  return toolUse.input as { overview: string; days: ItineraryDay[] }
}

// --- Beyond-your-closet suggestions ----------------------------------------
// Text call: given the trip/occasion context, the user's coverage
// preferences, and a summary of what's already in their closet, suggest a
// small number of NEW items worth adding — never violating the same hard
// coverage rules the generator itself enforces.

const SUGGEST_TOOL: Anthropic.Tool = {
  name: 'suggest_items',
  description: 'Suggest new clothing items the user could add to their closet for this context.',
  input_schema: {
    type: 'object',
    properties: {
      suggestions: {
        type: 'array',
        maxItems: 6,
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            category: { type: 'string', enum: ['top', 'bottom', 'dress', 'outerwear', 'footwear', 'swimwear', 'accessory'] },
            gender: { type: 'string', enum: ['women', 'men', 'unisex'] },
            color: { type: 'string', description: 'A suggested hex color.' },
            formality: { type: 'string', enum: ['athletic', 'casual', 'smart-casual', 'formal'] },
            reason: { type: 'string', description: 'One short sentence on why this fits the context.' },
          },
          required: ['name', 'category', 'gender', 'formality', 'reason'],
        },
      },
    },
    required: ['suggestions'],
  },
}

export interface SuggestionContext {
  contextLabel: string // e.g. "Trip to Bali, Beach vibe, 28-32°C" or "Occasion: Wedding (guest)"
  modestyStyle: string
  coveragePreference: string
  sleevePreference: string
  preferredLength: string
  wardrobeFocus: string
  closetSummary: string[] // short strings like "White cotton tee (top, casual)"
}

export interface SuggestedItem {
  name: string
  category: string
  gender: string
  color?: string
  formality: string
  reason: string
}

// --- Trip "Travel Vibe" description ----------------------------------------
// Plain-text call, migrated from the old /api/ai-describe.js (which used
// OpenAI) — switched to Claude so the whole server has one AI provider.

export async function generateTripVibeDescription(
  destination: string,
  vibes: string[],
  days: { tempMaxC: number; tempMinC: number; condition: string }[],
): Promise<string> {
  const anthropic = getClient()
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 90,
    messages: [
      {
        role: 'user',
        content: `Write one upbeat, specific sentence (max 35 words, no hashtags) describing the travel atmosphere of a trip to ${destination}. Interests: ${vibes.join(', ') || 'general travel'}. Weather snapshot: ${JSON.stringify(days.slice(0, 3))}. Reply with only the sentence, nothing else.`,
      },
    ],
  })
  const textBlock = message.content.find((block) => block.type === 'text')
  const description = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : ''
  if (!description) throw new Error('Claude did not return a description.')
  return description
}

export async function suggestBeyondCloset(ctx: SuggestionContext): Promise<SuggestedItem[]> {
  const anthropic = getClient()
  const prompt = `Context: ${ctx.contextLabel}
User's saved clothing preferences:
- Modesty style: ${ctx.modestyStyle}
- Coverage preference: ${ctx.coveragePreference}
- Sleeve preference: ${ctx.sleevePreference}
- Preferred length: ${ctx.preferredLength}
- Wardrobe focus: ${ctx.wardrobeFocus}

Current closet (${ctx.closetSummary.length} items):
${ctx.closetSummary.map((s) => `- ${s}`).join('\n') || '(empty)'}

Suggest up to 4 NEW items (not already in the closet) that would round out this person's options for the context above. Every suggestion MUST respect these hard rules regardless of preferences: no sleeveless or strapless/spaghetti-strap tops or dresses, no backless tops or dresses, no deep/low necklines, no mini skirts or above-knee shorts/dresses — dresses and skirts knee-length or longer. If modesty style is "hijabi", go further: full sleeves, high neckline, ankle-or-full length, no shorts, and swimwear only as modest/burkini-style. Call suggest_items with the result.`

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [SUGGEST_TOOL],
    tool_choice: { type: 'tool', name: 'suggest_items' },
    messages: [{ role: 'user', content: prompt }],
  })

  const toolUse = message.content.find((block) => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') return []
  const input = toolUse.input as { suggestions?: SuggestedItem[] }
  return input.suggestions ?? []
}
