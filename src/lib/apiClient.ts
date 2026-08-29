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
  role: 'user' | 'admin'
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
  forgotPassword: (email: string) =>
    request<{ sent: boolean; userId: string; delivered: boolean; devCode?: string; expiresAt: string }>(
      '/auth/forgot-password',
      { method: 'POST', body: JSON.stringify({ email }) },
    ),
  resetPassword: (userId: string, code: string, newPassword: string) =>
    request<{ token: string; user: PublicUser }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ userId, code, newPassword }),
    }),
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

// --- Inspiration images ------------------------------------------------------

export interface ExampleImage {
  thumb: string
  url?: string
  pageUrl?: string
  alt?: string
}

export const imagesApi = {
  // Returns up to 5 example photos for a query; throws a 404 ApiClientError
  // when no image provider is configured server-side (callers fall back to
  // an external search link).
  examples: (query: string) =>
    request<{ examples: ExampleImage[] }>(`/images/examples?query=${encodeURIComponent(query)}`).then(
      (r) => r.examples,
    ),
}

// --- Admin (family management) ----------------------------------------------

export interface AdminUserSummary {
  id: string
  email: string
  verified: boolean
  role: 'user' | 'admin'
  createdAt: string
  closetCount: number
  planCount: number
  hasPreferences: boolean
}

export interface AdminUserDetail {
  id: string
  email: string
  verified: boolean
  role: 'user' | 'admin'
  createdAt: string
  closet: { id: string; name: string; category: string; color: string; photo?: string; source: string; createdAt: string }[]
  preferences: Record<string, unknown> | null
  plans: { id: string; mode: string; title: string; createdAt: string }[]
}

export const adminApi = {
  listUsers: () => request<{ users: AdminUserSummary[] }>('/admin/users').then((r) => r.users),
  getUser: (id: string) => request<{ user: AdminUserDetail }>(`/admin/users/${id}`).then((r) => r.user),
  removeUser: (id: string) => request<{ deleted: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),
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

export interface ColorAnalysisResult {
  ok: boolean
  undertone?: 'warm' | 'cool' | 'neutral'
  depth?: 'light' | 'medium' | 'deep'
  seasonalType?: string
  bestColors?: { hex: string; name: string }[]
  avoidColors?: { hex: string; name: string }[]
  summary?: string
}

export interface OutfitIdeaResult {
  title: string
  itemIds: string[]
  missing?: { name: string; category: string; color?: string; reason: string }[]
  stylingTip: string
}

export interface OutfitsResponse {
  outfits: OutfitIdeaResult[]
  generalAdvice: string
  occasionLabel: string
}

export const aiApi = {
  tagPhoto: (file: File) => {
    const form = new FormData()
    form.append('photo', file)
    return request<{ item: TaggedItemResult }>('/ai/tag-photo', { method: 'POST', body: form }, 60_000).then(
      (r) => r.item,
    )
  },
  suggest: (contextLabel: string) =>
    request<{ suggestions: SuggestedItemResult[] }>('/ai/suggest', {
      method: 'POST',
      body: JSON.stringify({ contextLabel }),
    }).then((r) => r.suggestions),
  tagPhotoMulti: (file: File) => {
    const form = new FormData()
    form.append('photo', file)
    return request<{ items: TaggedItemResult[] }>('/ai/tag-photo-multi', { method: 'POST', body: form }, 90_000).then(
      (r) => r.items,
    )
  },
  analyzeSelfie: (file: File) => {
    const form = new FormData()
    form.append('selfie', file)
    return request<{ analysis: ColorAnalysisResult }>('/ai/analyze-selfie', { method: 'POST', body: form }, 60_000).then(
      (r) => r.analysis,
    )
  },
  outfits: (payload: { occasionId?: string; occasionLabel?: string; location?: string; dateISO?: string }) =>
    request<OutfitsResponse>('/ai/outfits', { method: 'POST', body: JSON.stringify(payload) }, 90_000),
}
