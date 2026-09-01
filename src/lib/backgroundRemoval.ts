import { removeBackground } from '@imgly/background-removal'

// Studio backdrop colors the cutout is composited onto — chosen per garment:
// light clothes sit on dark beige, dark clothes on soft cream, so the piece
// always reads clearly (a raw transparent PNG looked washed out in the app).
const SOFT_CREAM = '#f7f3ec' // behind dark garments
const DARK_BEIGE = '#cbb99a' // behind light garments

// Isolates a garment entirely in the browser (WASM segmentation model,
// downloaded once and cached — no API key, no per-call cost), then:
//   1. crops tight to the garment itself (so a full-outfit photo assigned as
//      "top" shows just the top, not the whole scene),
//   2. composites it onto a cream/beige studio backdrop picked from the
//      garment's brightness.
// Output stays PNG — that's also how already-processed photos are recognized
// (originals are JPEGs). Callers should treat failure as non-fatal and keep
// the original photo.
export async function isolateGarment(photoDataUrl: string): Promise<string> {
  const blob = await removeBackground(photoDataUrl, {
    // Run inference in a web worker so the app never stutters while photos
    // clean up in the background — on the main thread the model blocked the
    // UI for seconds per photo, which is exactly the login lag that was
    // reported. The quantized model is also ~half the download and runs
    // meaningfully faster, at thumbnail-invisible quality cost.
    proxyToWorker: true,
    model: 'isnet_quint8',
  })
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas unavailable')
    ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // One pass: bounding box of visible pixels + average garment brightness.
    let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1
    let lumSum = 0
    let opaque = 0
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4
        if (data[i + 3] > 40) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
          lumSum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          opaque++
        }
      }
    }
    // Nothing segmented (or a sliver) — keep the original photo; the caller
    // still marks the item photoCleaned in the database so it's never retried.
    if (maxX - minX < 12 || maxY - minY < 12) return photoDataUrl

    const marginX = Math.round((maxX - minX) * 0.06)
    const marginY = Math.round((maxY - minY) * 0.06)
    const sx = Math.max(0, minX - marginX)
    const sy = Math.max(0, minY - marginY)
    const sw = Math.min(canvas.width, maxX + marginX) - sx
    const sh = Math.min(canvas.height, maxY + marginY) - sy

    const lightGarment = lumSum / opaque > 150
    // Cap the output — closet thumbnails never need more than ~700px, and
    // small JPEGs are what make the save-back reliably fit the server's
    // upload limit (huge PNGs are what used to fail silently and cause the
    // same photos to re-clean on every refresh).
    const scale = Math.min(1, 700 / Math.max(sw, sh))
    const out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(sw * scale))
    out.height = Math.max(1, Math.round(sh * scale))
    const outCtx = out.getContext('2d')
    if (!outCtx) throw new Error('canvas unavailable')
    outCtx.fillStyle = lightGarment ? DARK_BEIGE : SOFT_CREAM
    outCtx.fillRect(0, 0, out.width, out.height)
    outCtx.imageSmoothingEnabled = true
    outCtx.imageSmoothingQuality = 'high'
    outCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height)
    // JPEG, not PNG: the backdrop is solid anyway, and it's 3-5× smaller.
    return out.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load isolated photo'))
    img.src = src
  })
}
