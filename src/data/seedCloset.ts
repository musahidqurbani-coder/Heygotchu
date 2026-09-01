import type { ClothingItem } from '../types'
import { makeId } from '../lib/id'

// A realistic starter wardrobe so the generator has something to work with
// the moment someone opens the app, before they've added their own clothes.
//
// Coverage data is honest, not curated to please the generator — most items
// are full-coverage, but "Silky camisole" (sleeveless, thin-strap), "Linen
// shorts" (above-knee), and "Backless halter top" (open back) are
// deliberately included so you can see the coverage rules actually excluding
// items rather than every item happening to pass. A mix of women's, men's,
// and unisex items is included, plus a hijab and a modest swim set, so
// Hijabi-mode and gender-focused wardrobes both have something to work with.
export function buildStarterCloset(): ClothingItem[] {
  const now = Date.now()
  const base: Omit<ClothingItem, 'id' | 'createdAt'>[] = [
    { name: 'White cotton tee', category: 'top', gender: 'unisex', color: '#f5f5f0', warmth: 'light', formality: 'casual', weatherproof: false, tags: ['everyday', 'city', 'beach'], coverage: { sleeveLength: 'short', strapless: false, neckline: 'moderate', fit: 'regular' } },
    { name: 'Black fitted tee', category: 'top', gender: 'women', color: '#181818', warmth: 'light', formality: 'casual', weatherproof: false, tags: ['everyday', 'city'], coverage: { sleeveLength: 'short', strapless: false, neckline: 'moderate', fit: 'fitted' } },
    { name: 'Linen button-up', category: 'top', gender: 'men', color: '#e4d9c3', warmth: 'light', formality: 'smart-casual', weatherproof: false, tags: ['food', 'culture', 'beach'], coverage: { sleeveLength: 'full', strapless: false, neckline: 'high', fit: 'relaxed' } },
    { name: 'Merino crewneck sweater', category: 'top', gender: 'unisex', color: '#4a5a6a', warmth: 'warm', formality: 'smart-casual', weatherproof: false, tags: ['city', 'culture'], coverage: { sleeveLength: 'full', strapless: false, neckline: 'high', fit: 'regular' } },
    { name: 'Thermal base layer', category: 'top', gender: 'unisex', color: '#7d7d7d', warmth: 'insulated', formality: 'athletic', weatherproof: false, tags: ['snow', 'mountains', 'hiking'], coverage: { sleeveLength: 'full', strapless: false, neckline: 'high', fit: 'fitted' } },
    { name: 'Half-sleeve blouse', category: 'top', gender: 'women', color: '#9db4a8', warmth: 'light', formality: 'smart-casual', weatherproof: false, tags: ['food', 'city', 'culture'], coverage: { sleeveLength: 'half', strapless: false, neckline: 'moderate', fit: 'regular' } },
    { name: 'Silky camisole', category: 'top', gender: 'women', color: '#c98fa0', warmth: 'light', formality: 'smart-casual', weatherproof: false, tags: ['food', 'city'], coverage: { sleeveLength: 'sleeveless', strapless: true, neckline: 'moderate', fit: 'fitted' } },
    { name: 'Backless halter top', category: 'top', gender: 'women', color: '#8a3b5a', warmth: 'light', formality: 'casual', weatherproof: false, tags: ['beach', 'relaxation'], coverage: { sleeveLength: 'sleeveless', strapless: false, backless: true, neckline: 'moderate', fit: 'fitted' } },

    { name: 'Slim chinos', category: 'bottom', gender: 'men', color: '#c2b280', warmth: 'medium', formality: 'smart-casual', weatherproof: false, tags: ['city', 'culture', 'food'], coverage: { bottomStyle: 'pants', fit: 'regular' } },
    { name: 'Denim jeans', category: 'bottom', gender: 'unisex', color: '#3b5170', warmth: 'medium', formality: 'casual', weatherproof: false, tags: ['everyday', 'city'], coverage: { bottomStyle: 'pants', fit: 'regular' } },
    { name: 'Wide-leg trousers', category: 'bottom', gender: 'women', color: '#d8cfc0', warmth: 'light', formality: 'smart-casual', weatherproof: false, tags: ['city', 'culture', 'relaxation'], coverage: { bottomStyle: 'pants', fit: 'relaxed' } },
    { name: 'Knee-length linen shorts', category: 'bottom', gender: 'unisex', color: '#e8e0cf', warmth: 'light', formality: 'casual', weatherproof: false, tags: ['beach', 'relaxation'], coverage: { bottomStyle: 'shorts', hemLength: 'knee', fit: 'regular' } },
    { name: 'Linen shorts', category: 'bottom', gender: 'men', color: '#d9c9a8', warmth: 'light', formality: 'casual', weatherproof: false, tags: ['beach', 'relaxation'], coverage: { bottomStyle: 'shorts', hemLength: 'above-knee', fit: 'regular' } },
    { name: 'Hiking trousers', category: 'bottom', gender: 'unisex', color: '#5c5347', warmth: 'medium', formality: 'athletic', weatherproof: true, tags: ['hiking', 'mountains', 'nature', 'adventure'], coverage: { bottomStyle: 'pants', fit: 'relaxed' } },
    { name: 'Thermal leggings', category: 'bottom', gender: 'unisex', color: '#2b2b2b', warmth: 'insulated', formality: 'athletic', weatherproof: false, tags: ['snow', 'mountains'], coverage: { bottomStyle: 'pants', fit: 'fitted' } },
    { name: 'Tailored trousers', category: 'bottom', gender: 'men', color: '#22262b', warmth: 'medium', formality: 'formal', weatherproof: false, tags: ['culture', 'city'], coverage: { bottomStyle: 'pants', fit: 'fitted' } },
    { name: 'Midi skirt', category: 'bottom', gender: 'women', color: '#7a5c45', warmth: 'medium', formality: 'smart-casual', weatherproof: false, tags: ['culture', 'city', 'food'], coverage: { bottomStyle: 'skirt', hemLength: 'below-knee', fit: 'regular' } },

    { name: 'Wrap sundress', category: 'dress', gender: 'women', color: '#e2712b', warmth: 'light', formality: 'casual', weatherproof: false, tags: ['beach', 'relaxation', 'food'], coverage: { sleeveLength: 'short', strapless: false, neckline: 'moderate', hemLength: 'knee', fit: 'regular', pieceCount: 'one-piece' } },
    { name: 'Little black dress', category: 'dress', gender: 'women', color: '#111111', warmth: 'medium', formality: 'formal', weatherproof: false, tags: ['culture', 'food', 'city'], coverage: { sleeveLength: 'three-quarter', strapless: false, neckline: 'moderate', hemLength: 'knee', fit: 'fitted', pieceCount: 'one-piece' } },
    { name: 'Long-sleeve midi dress', category: 'dress', gender: 'women', color: '#3c4a5c', warmth: 'medium', formality: 'smart-casual', weatherproof: false, tags: ['culture', 'city'], coverage: { sleeveLength: 'full', strapless: false, neckline: 'high', hemLength: 'below-knee', fit: 'regular', pieceCount: 'one-piece' } },
    { name: 'Maxi abaya dress', category: 'dress', gender: 'women', color: '#2b2b33', warmth: 'medium', formality: 'smart-casual', weatherproof: false, tags: ['culture', 'city', 'relaxation'], coverage: { sleeveLength: 'full', strapless: false, neckline: 'high', hemLength: 'ankle', fit: 'relaxed', pieceCount: 'one-piece' } },
    { name: 'Co-ord two-piece set', category: 'dress', gender: 'women', color: '#c7a35a', warmth: 'light', formality: 'smart-casual', weatherproof: false, tags: ['food', 'city', 'culture'], coverage: { sleeveLength: 'three-quarter', strapless: false, neckline: 'moderate', hemLength: 'below-knee', fit: 'regular', pieceCount: 'two-piece' } },

    { name: 'Packable rain shell', category: 'outerwear', gender: 'unisex', color: '#2f6e51', warmth: 'medium', formality: 'athletic', weatherproof: true, tags: ['hiking', 'mountains', 'nature', 'adventure', 'city'] },
    { name: 'Wool peacoat', category: 'outerwear', gender: 'unisex', color: '#1c2733', warmth: 'warm', formality: 'smart-casual', weatherproof: false, tags: ['city', 'culture'] },
    { name: 'Puffer jacket', category: 'outerwear', gender: 'unisex', color: '#0f2a4a', warmth: 'insulated', formality: 'casual', weatherproof: true, tags: ['snow', 'mountains'] },
    { name: 'Denim jacket', category: 'outerwear', gender: 'unisex', color: '#4a637d', warmth: 'medium', formality: 'casual', weatherproof: false, tags: ['everyday', 'city'] },
    { name: 'Lightweight cardigan', category: 'outerwear', gender: 'women', color: '#cbb994', warmth: 'medium', formality: 'smart-casual', weatherproof: false, tags: ['food', 'culture', 'relaxation'] },

    { name: 'White sneakers', category: 'footwear', gender: 'unisex', color: '#f2f2f2', warmth: 'medium', formality: 'casual', weatherproof: false, tags: ['everyday', 'city'] },
    { name: 'Leather loafers', category: 'footwear', gender: 'men', color: '#5a3825', warmth: 'medium', formality: 'smart-casual', weatherproof: false, tags: ['culture', 'food', 'city'] },
    { name: 'Trail hiking boots', category: 'footwear', gender: 'unisex', color: '#4b3b2c', warmth: 'warm', formality: 'athletic', weatherproof: true, tags: ['hiking', 'mountains', 'nature', 'adventure'] },
    { name: 'Leather sandals', category: 'footwear', gender: 'unisex', color: '#8a5a3b', warmth: 'light', formality: 'casual', weatherproof: false, tags: ['beach', 'relaxation'] },
    { name: 'Insulated snow boots', category: 'footwear', gender: 'unisex', color: '#1a1a1a', warmth: 'insulated', formality: 'athletic', weatherproof: true, tags: ['snow', 'mountains'] },

    { name: 'One-piece swimsuit', category: 'swimwear', gender: 'women', color: '#0d5c63', warmth: 'light', formality: 'casual', weatherproof: false, tags: ['beach', 'relaxation'], coverage: { swimStyle: 'one-piece' } },
    { name: 'Two-piece bikini', category: 'swimwear', gender: 'women', color: '#d97b8c', warmth: 'light', formality: 'casual', weatherproof: false, tags: ['beach', 'relaxation'], coverage: { swimStyle: 'two-piece' } },
    { name: 'Modest swim set (burkini)', category: 'swimwear', gender: 'women', color: '#1e3a4c', warmth: 'light', formality: 'casual', weatherproof: false, tags: ['beach', 'relaxation'], coverage: { swimStyle: 'modest-swim' } },
    { name: 'Men’s swim trunks', category: 'swimwear', gender: 'men', color: '#2e5c4a', warmth: 'light', formality: 'casual', weatherproof: false, tags: ['beach', 'relaxation'], coverage: { swimStyle: 'one-piece' } },

    { name: 'Straw hat', category: 'accessory', gender: 'unisex', color: '#d8b878', warmth: 'light', formality: 'casual', weatherproof: false, tags: ['beach', 'relaxation'] },
    { name: 'Wool beanie', category: 'accessory', gender: 'unisex', color: '#762c2c', warmth: 'insulated', formality: 'casual', weatherproof: false, tags: ['snow', 'mountains'] },
    { name: 'Crossbody bag', category: 'accessory', gender: 'unisex', color: '#7a4b32', warmth: 'light', formality: 'smart-casual', weatherproof: false, tags: ['city', 'culture', 'food'] },
    { name: 'Sunglasses', category: 'accessory', gender: 'unisex', color: '#20201f', warmth: 'light', formality: 'casual', weatherproof: false, tags: ['beach', 'city', 'relaxation'] },
    { name: 'Silk scarf', category: 'accessory', gender: 'women', color: '#a13f56', warmth: 'medium', formality: 'formal', weatherproof: false, tags: ['culture', 'city'] },
    { name: 'Everyday hijab', category: 'accessory', gender: 'women', color: '#3d3d55', warmth: 'medium', formality: 'casual', weatherproof: false, tags: ['everyday', 'city', 'culture'] },
  ]

  return base.map((item, i) => ({
    ...item,
    // 'starter' marks pre-loaded inventory so "Purge starter items" can
    // remove exactly these later without touching the user's own clothes.
    tags: [...item.tags, 'starter'],
    id: makeId('cloth'),
    createdAt: now - (base.length - i),
  }))
}
