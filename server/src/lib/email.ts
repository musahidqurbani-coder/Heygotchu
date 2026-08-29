import { env, isEmailConfigured } from '../env'

export interface SendResult {
  delivered: boolean // true = actually sent via a real provider
  devCode?: string // present only in dev-mode fallback, so the API response can surface it
}

// Real implementation uses Resend's HTTP API directly (no SDK dependency —
// it's a single POST). Any SMTP-based provider works the same shape; Resend
// was picked because it needs nothing but an API key, no server setup.
async function sendViaResend(to: string, subject: string, text: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.emailFrom, to: [to], subject, text }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend API error (${res.status}): ${body}`)
  }
}

export async function sendOtpEmail(to: string, code: string): Promise<SendResult> {
  const subject = 'Your Heygotchu verification code'
  const text = `Your Heygotchu verification code is ${code}. It expires in ${env.otpExpiryMinutes} minutes.`

  if (!isEmailConfigured()) {
    // Dev mode: no RESEND_API_KEY configured. Log it server-side and hand it
    // back in the API response so signup/login flows keep working end-to-end
    // during development, exactly like the frontend's weather/image/AI
    // fallbacks when a key is missing.
    console.log(`[dev-mode email OTP] to=${to} code=${code}`)
    return { delivered: false, devCode: code }
  }

  await sendViaResend(to, subject, text)
  return { delivered: true }
}
