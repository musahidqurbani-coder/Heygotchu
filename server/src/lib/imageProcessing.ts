import sharp from 'sharp'

// Phone photos routinely carry an EXIF orientation tag (e.g. "rotate 90° for
// display") instead of storing pixels already rotated. Claude's vision API
// reads the raw pixel grid and ignores that tag, but the browser's canvas
// (used to crop each detected garment out of the photo — see
// src/lib/imageResize.ts) auto-rotates on decode. Left unfixed, a bounding
// box Claude reports against the untouched sensor orientation gets applied
// to an already-rotated crop source, cutting out the wrong — often sideways
// — region. Normalizing here, before the image ever reaches Claude, makes
// both sides agree on the same "as a person would view it" orientation.
export async function normalizeOrientation(buffer: Buffer): Promise<{ buffer: Buffer; mediaType: string }> {
  try {
    const normalized = await sharp(buffer).rotate().jpeg({ quality: 92 }).toBuffer()
    return { buffer: normalized, mediaType: 'image/jpeg' }
  } catch {
    // Not a format sharp can decode (rare) — fall back to the original bytes
    // rather than failing the whole tagging request.
    return { buffer, mediaType: 'image/jpeg' }
  }
}
