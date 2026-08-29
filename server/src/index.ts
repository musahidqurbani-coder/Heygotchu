import express from 'express'
import cors from 'cors'
import { env } from './env'
import { authRouter } from './routes/auth'
import { closetRouter } from './routes/closet'
import { preferencesRouter } from './routes/preferences'
import { eventsRouter } from './routes/events'
import { aiRouter } from './routes/ai'
import { imagesRouter } from './routes/images'
import { vibeRouter } from './routes/vibe'
import { errorHandler } from './middleware/errorHandler'

const app = express()

app.use(cors({ origin: env.corsOrigin }))
app.use(express.json({ limit: '2mb' }))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/auth', authRouter)
app.use('/closet', closetRouter)
app.use('/preferences', preferencesRouter)
app.use('/events', eventsRouter)
app.use('/ai', aiRouter)
app.use('/images', imagesRouter)
app.use('/vibe', vibeRouter)

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` })
})

// Must be registered last — Express identifies error-handling middleware by
// its four-argument signature.
app.use(errorHandler)

app.listen(env.port, () => {
  console.log(`Heygotchu API listening on http://localhost:${env.port}`)
})
