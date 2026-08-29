import Anthropic from '@anthropic-ai/sdk'
import { env, isClaudeConfigured } from '../env'

const MODEL = 'claude-sonnet-4-5'

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
