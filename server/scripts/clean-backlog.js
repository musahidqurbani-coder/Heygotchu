// One-off backlog cleaner: serves a tiny page that runs the same
// background-removal pipeline the app uses (worker + quint8 + crop +
// cream/beige backdrop + ≤700px JPEG) over every uncleaned closet photo in
// the database, POSTing each result back so it's written with
// photoCleaned=true. Run me, open http://localhost:8124, wait for "ALL
// DONE", then no user's login ever has cleanup work again.
const http = require('http')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const PAGE = `<!doctype html><meta charset="utf-8"><title>Backlog cleaner</title>
<body style="font-family:monospace;background:#111;color:#8f8;padding:20px">
<h3>Heygotchu backlog cleaner</h3><pre id="log">starting…</pre>
<script type="module">
import { removeBackground } from 'https://esm.sh/@imgly/background-removal@1.7.0'
const log = (m) => { document.getElementById('log').textContent += '\\n' + m }

const SOFT_CREAM = '#f7f3ec', DARK_BEIGE = '#cbb99a'
async function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
}
async function clean(dataUrl) {
  const blob = await removeBackground(dataUrl, { proxyToWorker: true, model: 'isnet_quint8' })
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 0, c.width, c.height)
    let minX = c.width, minY = c.height, maxX = -1, maxY = -1, lum = 0, op = 0
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4
      if (data[i + 3] > 40) {
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
        lum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; op++
      }
    }
    if (maxX - minX < 12 || maxY - minY < 12) return dataUrl
    const mx = Math.round((maxX - minX) * 0.06), my = Math.round((maxY - minY) * 0.06)
    const sx = Math.max(0, minX - mx), sy = Math.max(0, minY - my)
    const sw = Math.min(c.width, maxX + mx) - sx, sh = Math.min(c.height, maxY + my) - sy
    const scale = Math.min(1, 700 / Math.max(sw, sh))
    const out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(sw * scale)); out.height = Math.max(1, Math.round(sh * scale))
    const o = out.getContext('2d')
    o.fillStyle = (lum / op > 150) ? DARK_BEIGE : SOFT_CREAM
    o.fillRect(0, 0, out.width, out.height)
    o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high'
    o.drawImage(c, sx, sy, sw, sh, 0, 0, out.width, out.height)
    return out.toDataURL('image/jpeg', 0.85)
  } finally { URL.revokeObjectURL(url) }
}

const items = await (await fetch('/uncleaned')).json()
log(items.length + ' photos to clean')
let done = 0, failed = 0
for (const it of items) {
  try {
    const cleaned = await clean(it.photo)
    const r = await fetch('/cleaned', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: it.id, photo: cleaned }) })
    if (!r.ok) throw new Error('write ' + r.status)
    done++
    log(done + '/' + items.length + ' ✓ ' + it.id + '  (' + Math.round(cleaned.length / 1024) + 'KB)')
  } catch (e) {
    failed++
    log('FAILED ' + it.id + ': ' + e.message)
  }
}
log('ALL DONE — cleaned ' + done + ', failed ' + failed)
document.title = 'DONE ' + done + '/' + items.length
</script>`

http
  .createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'content-type': 'text/html' })
        return res.end(PAGE)
      }
      if (req.method === 'GET' && req.url === '/uncleaned') {
        const rows = await prisma.clothingItem.findMany({
          where: { photoCleaned: false, photo: { startsWith: 'data:image/jpeg' } },
          select: { id: true, photo: true },
        })
        res.writeHead(200, { 'content-type': 'application/json' })
        return res.end(JSON.stringify(rows))
      }
      if (req.method === 'GET' && req.url === '/status') {
        const remaining = await prisma.clothingItem.count({
          where: { photoCleaned: false, photo: { startsWith: 'data:image/jpeg' } },
        })
        res.writeHead(200, { 'content-type': 'application/json' })
        return res.end(JSON.stringify({ remaining }))
      }
      if (req.method === 'POST' && req.url === '/cleaned') {
        let body = ''
        for await (const chunk of req) body += chunk
        const { id, photo } = JSON.parse(body)
        await prisma.clothingItem.update({ where: { id }, data: { photo, photoCleaned: true } })
        res.writeHead(200)
        return res.end('ok')
      }
      res.writeHead(404)
      res.end()
    } catch (e) {
      console.error(e)
      res.writeHead(500)
      res.end(String(e.message))
    }
  })
  .listen(8124, () => console.log('backlog cleaner on http://localhost:8124'))
