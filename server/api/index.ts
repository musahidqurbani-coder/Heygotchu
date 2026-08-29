import { app } from '../src/app'

// Vercel serverless entry — every route is rewritten here (see
// server/vercel.json) and Express does its own path routing from req.url.
export default app
