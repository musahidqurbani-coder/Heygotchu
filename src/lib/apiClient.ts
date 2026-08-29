import type { ClothingItem, ClothingPreferences } from '../types'
import { API_BASE_URL } from './apiConfig'
import { fetchWithTimeout } from './fetchWithTimeout'

// Thin client for the Heygotchu backend (see /server). Every authenticated
// call reads the token from getToken() (wired up by AuthContext) and sends
// it as a Bearer token — the server uses it to scope every query to that
// user, which is what keeps each account's closet/preferences/trips
// isolated from every other account.

export class ApiClientError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let getToken: () => string | null = () => null
export function setTokenGetter(fn: () => string | null) {
  getToken = fn
}

async function request<T>(path: string, options: RequestInit = {}, timeoutMs = 10_000): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let res: Response
  try {
    res = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...options, headers }, timeoutMs)
  } catch {
    throw new ApiClientError(0, 'Could not reach the Heygotchu server. Check your connection and try again.')
  }

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    const message = (body && typeof body === 'object' && 'error' in body && String(body.error)) || `Request failed (${res.status}).`
    throw new ApiClientError(res.status, message)
  }
  return body as T
}

// --- Auth --------------------------------------------------------------

export interface PublicUser {
  id: string
  email: string
  verified: boolean
}

export const authApi = {
  signup: (email: string, password: string) =>
    request<{ user: PublicUser; message: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  sendOtp: (identifier: { userId?: string; email?: string }) =>
    request<{ sent: boolean; userId: string; delivered: boolean; devCode?: string; expiresAt: string }>(
      '/auth/send-otp',
      { method: 'POST', body: JSON.stringify(identifier) },
    ),
  verifyOtp: (userId: string, code: string) =>
    request<{ token: string; user: PublicUser }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ userId, code }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: PublicUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: PublicUser }>('/auth/me'),
}

// --- Closet --------------------------------------------------------------

export const closetApi = {
  list: () => request<{ items: ClothingItem[] }>('/closet').then((r) => r.items),
  create: (item: Omit<ClothingItem, 'id' | 'createdAt'>) =>
    request<{ item: ClothingItem }>('/closet', { method: 'POST', body: JSON.stringify(item) }).then((r) => r.item),
  remove: (id: string) => request<void>(`/closet/${id}`, { method: 'DELETE' }),
}

// --- Preferences -----------------------------------------------------------

export const preferencesApi = {
  get: () => request<{ preferences: ClothingPreferences | null }>('/preferences').then((r) => r.preferences),
  save: (preferences: ClothingPreferences) =>
    request<{ preferences: ClothingPreferences }>('/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    }).then((r) => r.preferences),
}

// --- Events (saved trips & occasions) ---------------------------------------

export interface EventPlanRecord {
  id: string
  mode: 'destination' | 'occasion'
  title: string
  data: Record<string, unknown>
  createdAt: number
}

export interface OccasionType {
  id: string
  label: string
  category: string
  defaultFormality: string
}

export const eventsApi = {
  list: () => request<{ plans: EventPlanRecord[] }>('/events').then((r) => r.plans),
  create: (mode: 'destination' | 'occasion', title: string, data: Record<string, unknown>) =>
    request<{ plan: EventPlanRecord }>('/events', {
      method: 'POST',
      body: JSON.stringify({ mode, title, data }),
    }).then((r) => r.plan),
  remove: (id: string) => request<void>(`/events/${id}`, { method: 'DELETE' }),
  occasionTypes: () => request<{ occasionTypes: OccasionType[] }>('/events/occasion-types').then((r) => r.occasionTypes),
}

// --- AI --------------------------------------------------------------------

export interface TaggedItemResult {
  name: string
  category: string
  gender: string
  color: string
  warmth: string
  formality: string
  weatherproof: boolean
  tags: string[]
  coverage?: Record<string, unknown>
}

export interface SuggestedItemResult {
  name: string
  category: string
  gender: string
  color?: string
  formality: string
  reason: string
}

export const aiApi = {
  tagPhoto: (file: File) => {
    const form = new FormData()
    form.append('photo', file)
    return request<{ item: TaggedItemResult }>('/ai/tag-photo', { method: 'POST', body: form }, 30_000).then(
      (r) => r.item,
    )
  },
  suggest: (contextLabel: string) =>
    request<{ suggestions: SuggestedItemResult[] }>('/ai/suggest', {
      method: 'POST',
      body: JSON.stringify({ contextLabel }),
    }).then((r) => r.suggestions),
}
