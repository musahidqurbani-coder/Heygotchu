import express from 'express'
import cors from 'cors'
import { env } from './env'
import { authRouter } from './routes/auth'
import { closetRouter } from './routes/closet'
import { preferencesRouter } from './routes/preferences'
import { eventsRouter } from './routes/events'
import { aiRouter } from './routes/ai'
import { adminRouter } from './routes/admin'
import { imagesRouter } from './routes/images'
import { shopRouter } from './routes/shop'
import { vibeRouter } from './routes/vibe'
import { errorHandler } from './middleware/errorHandler'

// The Express app, fully wired but not listening — imported both by
// src/index.ts (long-lived local/self-hosted process) and api/index.ts
// (Vercel serverless function entry).
export const app = express()

// CORS_ORIGIN is documented as comma-separated; the cors lib needs an array
// to match more than one origin, so split unless it's the wildcard.
app.use(
  cors({
    origin: env.corsOrigin === '*' ? '*' : env.corsOrigin.split(',').map((s) => s.trim()),
  }),
)
app.use(express.json({ limit: '2mb' }))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/auth', authRouter)
app.use('/closet', closetRouter)
app.use('/preferences', preferencesRouter)
app.use('/events', eventsRouter)
app.use('/ai', aiRouter)
app.use('/admin', adminRouter)
app.use('/images', imagesRouter)
app.use('/shop', shopRouter)
app.use('/vibe', vibeRouter)

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` })
})

// Must be registered last — Express identifies error-handling middleware by
// its four-argument signature.
app.use(errorHandler)
