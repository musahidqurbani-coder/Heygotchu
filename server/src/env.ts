import 'dotenv/config'

// Centralized env access. Nothing here throws for *optional* integrations —
// missing Anthropic/email credentials just mean those features run in
// "dev mode" (documented in README) instead of crashing the server, mirroring
// the fallback pattern already used on the frontend for weather/images/AI
// copy. DATABASE_URL and JWT_SECRET are the only two that are truly
// required to boot.

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy server/.env.example to server/.env and fill it in.`,
    )
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',

  otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES ?? 10),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),

  // Claude API — used for photo auto-tagging and "beyond your closet"
  // suggestions. Optional: routes that need it return a clear error if
  // unset rather than crashing the server at boot.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  // Email OTP delivery. Optional — falls back to "dev mode" (the code is
  // logged server-side and returned in the API response) when unset.
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM ?? 'Heygotchu <onboarding@resend.dev>',

  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 8 * 1024 * 1024),
}

export const isEmailConfigured = () => Boolean(env.resendApiKey)
export const isClaudeConfigured = () => Boolean(env.anthropicApiKey)
