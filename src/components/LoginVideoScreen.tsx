import { useEffect, useRef, useState, type FormEvent } from 'react'
import loginPoster from '../assets/login-poster.jpg'

const INTRO_SEEN_KEY = 'heygotchu.loginIntroSeen.v1'

// These positions were measured directly off the video's own last frame
// (in pixels, on the source 1280x720 clip) and converted to percentages, so
// the real, functional inputs below land exactly on top of the Email/
// Password boxes the video draws. If the source video is ever re-exported
// at a different layout, re-measure and update these.
const EMAIL_BOX = { left: 41.02, top: 26.11, width: 48.83, height: 14.31 }
const PASSWORD_BOX = { left: 41.02, top: 44.44, width: 48.83, height: 14.31 }
const FORGOT_LINK = { left: 41.5, top: 60.5, width: 19.5, height: 7.5 }
const SIGNUP_LINK = { left: 63.5, top: 60.5, width: 25.5, height: 7.5 }

interface LoginVideoScreenProps {
  loginEmail: string
  setLoginEmail: (v: string) => void
  loginPassword: string
  setLoginPassword: (v: string) => void
  onSubmit: (e: FormEvent) => void
  busy: boolean
  onGoSignup: () => void
  onForgotPassword?: () => void
}

export default function LoginVideoScreen({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  onSubmit,
  busy,
  onGoSignup,
  onForgotPassword,
}: LoginVideoScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const alreadySeen = typeof window !== 'undefined' && sessionStorage.getItem(INTRO_SEEN_KEY) === '1'

  const [formReady, setFormReady] = useState(reducedMotion || alreadySeen)
  const [showSkip, setShowSkip] = useState(false)

  useEffect(() => {
    if (formReady) return
    const t = setTimeout(() => setShowSkip(true), 1800)
    return () => clearTimeout(t)
  }, [formReady])

  function finishIntro() {
    setFormReady(true)
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1')
    } catch {
      // ignore — sessionStorage can be unavailable (private mode etc.); the
      // video will just replay on the next screen visit, which is harmless.
    }
  }

  function handleSkip() {
    const v = videoRef.current
    if (v) {
      v.pause()
      v.currentTime = v.duration || v.currentTime
    }
    finishIntro()
  }

  const inputBoxStyle = (box: { left: number; top: number; width: number; height: number }) => ({
    left: `${box.left}%`,
    top: `${box.top}%`,
    width: `${box.width}%`,
    height: `${box.height}%`,
  })

  // Solid fills sampled from the video's own drawn boxes, so a typed value
  // cleanly covers the baked-in "Email"/"Password" label instead of the two
  // overlapping.
  const EMAIL_FILL = '#f4e3e0'
  const PASSWORD_FILL = '#dfe9f3'

  return (
    <main className="mx-auto flex min-h-[80vh] flex-col items-center justify-center px-4 py-10">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-[#dfe6ef] shadow-sm ring-1 ring-black/5"
        style={{ aspectRatio: '16 / 9', containerType: 'inline-size' } as React.CSSProperties}
      >
        {!reducedMotion && !alreadySeen && (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            src="/videos/login-intro.mp4"
            poster={loginPoster}
            autoPlay
            muted
            playsInline
            onEnded={finishIntro}
            onError={finishIntro}
          />
        )}

        {/* Frozen last frame — shown once the video has played (or on repeat
            visits / reduced-motion, instead of the video at all) so the
            background never disappears once the real form takes over. */}
        <img
          src={loginPoster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: formReady ? 1 : 0 }}
        />

        {showSkip && !formReady && (
          <button
            type="button"
            onClick={handleSkip}
            className="absolute right-3 top-3 z-10 rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/40"
          >
            Skip ›
          </button>
        )}

        {/* Real, functional form — invisible and inert until the intro is
            done, then fades in exactly aligned to the boxes drawn in the
            video's final frame. */}
        <form
          onSubmit={onSubmit}
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: formReady ? 1 : 0, pointerEvents: formReady ? 'auto' : 'none' }}
        >
          <label htmlFor="login-email" className="sr-only">Email address</label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="absolute rounded-full px-[6%] text-[3.6cqw] font-medium text-[#e8636a] outline-none placeholder:text-[#e8636a]/50 sm:text-[3.6cqw]"
            style={{ ...inputBoxStyle(EMAIL_BOX), backgroundColor: loginEmail ? EMAIL_FILL : 'transparent' }}
          />

          <label htmlFor="login-password" className="sr-only">Password</label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="absolute rounded-full px-[6%] text-[3.6cqw] font-medium text-[#5c85bf] outline-none placeholder:text-[#5c85bf]/50 sm:text-[3.6cqw]"
            style={{ ...inputBoxStyle(PASSWORD_BOX), backgroundColor: loginPassword ? PASSWORD_FILL : 'transparent' }}
          />

          <button
            type="button"
            onClick={onForgotPassword}
            className="absolute rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            style={inputBoxStyle(FORGOT_LINK)}
            aria-label="Forgot password?"
          />

          <button
            type="button"
            onClick={onGoSignup}
            className="absolute rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            style={inputBoxStyle(SIGNUP_LINK)}
            aria-label="First time? Sign up now"
          />

          {/* Submit on Enter from either field; no visible button, since the
              video's design has none — pressing Enter in either input works
              via the form's native submit behavior. */}
          <button type="submit" disabled={busy} className="sr-only">
            Log in
          </button>
        </form>
      </div>
    </main>
  )
}
