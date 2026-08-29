// Mirrors the frontend's DEFAULT_CLOTHING_PREFERENCES (src/types/index.ts)
// for the case where a user has no saved preferences record yet — only the
// fields the AI suggestion prompt actually reads.
export const DEFAULT_PREFERENCES_FALLBACK: Record<string, unknown> = {
  modestyStyle: 'no-preference',
  coveragePreference: 'modest',
  sleevePreference: 'three-quarter',
  preferredLength: 'knee',
  wardrobeFocus: 'unisex',
}
