// Downscales an uploaded photo before it goes into localStorage, since raw
// phone photos can be several MB each and localStorage is typically capped
// around 5-10MB total.
export function resizeImageFile(file: File, maxSize = 320, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not load image'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas not supported'))
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

// Crops a region (given as fractions 0-1 of the full image) out of a data
// URL into its own image — used to give each AI-detected garment in a
// multi-item photo its own picture. Falls back to the original when the box
// is degenerate or cropping fails.
export function cropDataUrl(
  dataUrl: string,
  box: { x: number; y: number; w: number; h: number },
  maxSize = 320,
  quality = 0.75,
): Promise<string> {
  return new Promise((resolve) => {
    const clamp = (v: number) => Math.min(1, Math.max(0, v))
    const x = clamp(box.x)
    const y = clamp(box.y)
    const w = Math.min(clamp(box.w), 1 - x)
    const h = Math.min(clamp(box.h), 1 - y)
    // A box this small (or inverted) is almost certainly a bad detection —
    // keep the full photo rather than a sliver.
    if (w < 0.05 || h < 0.05) {
      resolve(dataUrl)
      return
    }
    const img = new Image()
    img.onerror = () => resolve(dataUrl)
    img.onload = () => {
      try {
        const sx = img.width * x
        const sy = img.height * y
        const sw = img.width * w
        const sh = img.height * h
        const scale = Math.min(1, maxSize / Math.max(sw, sh))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(sw * scale))
        canvas.height = Math.max(1, Math.round(sh * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(dataUrl)
          return
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch {
        resolve(dataUrl)
      }
    }
    img.src = dataUrl
  })
}
