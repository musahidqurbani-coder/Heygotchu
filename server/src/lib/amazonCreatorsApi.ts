// Amazon Creators API client — the OAuth2-based replacement for PA-API v5.
// Docs: https://affiliate-program.amazon.com/creatorsapi/docs
//
// Auth is Login-with-Amazon client-credentials grant. The credential
// "version" (3.1/3.2/3.3) only picks which regional LwA token endpoint to
// call — the resulting token still works against any Amazon marketplace, as
// long as a valid partnerTag exists for that marketplace and Creators API
// access was approved there.

const TOKEN_ENDPOINT = 'https://api.amazon.co.uk/auth/o2/token' // v3.2 (EU/India region group)
const API_BASE = 'https://creatorsapi.amazon'
const MARKETPLACE = 'www.amazon.in'

interface CachedToken {
  accessToken: string
  expiresAt: number // epoch ms
}

let cachedToken: CachedToken | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken
  }

  const clientId = process.env.CREATORSAPI_CLIENT_ID
  const clientSecret = process.env.CREATORSAPI_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Amazon Creators API is not configured (CREATORSAPI_CLIENT_ID/SECRET missing).')
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'creatorsapi::default',
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Amazon LwA token request failed (${res.status}): ${body}`)
  }
  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return cachedToken.accessToken
}

export interface AmazonProduct {
  asin: string
  title: string
  image?: string
  price?: string
  detailPageURL: string // already carries the partnerTag — the real affiliate link
}

// Searches Amazon Fashion for products matching a free-text query (built
// from color palette + occasion/destination + gender). Returns up to
// `count` items with images and prices, ready to render as "Shop the look."
export async function searchFashionProducts(query: string, count = 5): Promise<AmazonProduct[]> {
  const partnerTag = process.env.CREATORSAPI_PARTNER_TAG
  if (!partnerTag) {
    throw new Error('Amazon Creators API is not configured (CREATORSAPI_PARTNER_TAG missing).')
  }
  const accessToken = await getAccessToken()

  const res = await fetch(`${API_BASE}/catalog/v1/searchItems`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-marketplace': MARKETPLACE,
    },
    body: JSON.stringify({
      partnerTag,
      marketplace: MARKETPLACE,
      keywords: query,
      searchIndex: 'Fashion',
      itemCount: Math.min(Math.max(count, 1), 10),
      resources: ['images.primary.large', 'itemInfo.title', 'offersV2.listings.price'],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Amazon SearchItems failed (${res.status}): ${body}`)
  }

  const data = (await res.json()) as {
    searchResult?: {
      items?: {
        asin: string
        detailPageURL: string
        images?: { primary?: { large?: { url?: string } } }
        itemInfo?: { title?: { displayValue?: string } }
        offersV2?: { listings?: { price?: { money?: { displayAmount?: string } } }[] }
      }[]
    }
  }

  return (data.searchResult?.items ?? []).map((item) => ({
    asin: item.asin,
    title: item.itemInfo?.title?.displayValue ?? 'Amazon Fashion item',
    image: item.images?.primary?.large?.url,
    price: item.offersV2?.listings?.[0]?.price?.money?.displayAmount,
    detailPageURL: item.detailPageURL,
  }))
}
