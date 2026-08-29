// Base URL of the Heygotchu backend (see /server). Defaults to the backend's
// own default dev port so `npm run dev` in both folders pairs up with zero
// configuration. Override with VITE_API_URL when the backend is deployed
// somewhere else (e.g. a Render/Fly/Railway URL in production).
export const API_BASE_URL: string = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:4000'
