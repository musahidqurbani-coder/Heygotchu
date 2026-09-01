// "My Vibe": user-selectable app looks. Each vibe is a set of color-token
// overrides in index.css keyed by [data-vibe] on <html> — every Tailwind
// utility in the app reads those tokens at runtime, so switching vibes
// reskins everything instantly with no per-component work.

export interface Vibe {
  id: string
  label: string
  emoji: string
  // Swatch preview: page ground, card surface, accent.
  preview: [string, string, string]
}

export const VIBES: Vibe[] = [
  { id: 'classic', label: 'Classic', emoji: '🤍', preview: ['#e8dcc7', '#ffffff', '#ff6b5e'] },
  { id: 'noir', label: 'Noir', emoji: '🖤', preview: ['#131118', '#1e1a26', '#d8b46a'] },
  { id: 'soleil', label: 'Soleil', emoji: '🌅', preview: ['#fdf0e4', '#ffffff', '#cc6c4a'] },
  { id: 'orchid', label: 'Orchid', emoji: '🪻', preview: ['#f4ecfb', '#ffffff', '#8e6fe0'] },
  { id: 'jungalow', label: 'Jungalow', emoji: '🌿', preview: ['#f3ecdd', '#ffffff', '#c96f3b'] },
  { id: 'riviera', label: 'Riviera', emoji: '⛵', preview: ['#fbfaf5', '#ffffff', '#2456c9'] },
  { id: 'aurora', label: 'Aurora', emoji: '🌌', preview: ['#0e1026', '#1d1a38', '#7c5cff'] },
  { id: 'wardrobe', label: 'Wardrobe', emoji: '🪵', preview: ['#e9ddc8', '#fdf9ef', '#6d4a2e'] },
  { id: 'scrapbook', label: 'Scrapbook', emoji: '✂️', preview: ['#f4eefc', '#ffffff', '#8e6fe0'] },
  { id: 'bento', label: 'Bento', emoji: '🍱', preview: ['#f2f1ed', '#ffffff', '#23a094'] },
  { id: 'porcelain', label: 'Porcelain', emoji: '🕊️', preview: ['#e6eaf1', '#e6eaf1', '#4a6fdc'] },
]

const STORAGE_KEY = 'heygotchu.vibe.v1'

export function applyVibe(id: string): void {
  if (id === 'classic') delete document.documentElement.dataset.vibe
  else document.documentElement.dataset.vibe = id
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch { /* private mode — vibe resets next visit */ }
}

export function currentVibe(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && VIBES.some((v) => v.id === stored)) return stored
  } catch { /* private mode */ }
  return 'classic'
}

export function initVibe(): void {
  applyVibe(currentVibe())
}
