import { useEffect, useRef, useState, type FormEvent } from 'react'
import loginPoster from '../assets/login-poster.jpg'
import logo from '../assets/logo.jpg'

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

  // Portrait phones/tablets get their own full-screen layout: the video
  // covers the whole display and a real branded card holds the inputs —
  // the invisible-overlay trick only works when the 16:9 frame is visible
  // in full, which letterboxes badly on tall screens.
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-aspect-ratio: 4/5)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-aspect-ratio: 4/5)')
    const onChange = () => setIsPortrait(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

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

  if (isPortrait) {
    const mobileInput =
      'w-full rounded-full px-5 py-3.5 text-[15px] font-medium outline-none ring-1 transition focus:ring-2'
    return (
      <main className="fixed inset-0 overflow-hidden bg-[#dfe6ef]">
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
        <img
          src={loginPoster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: formReady ? 1 : 0 }}
        />
        {/* Soft wash so the card and links read clearly over the artwork. */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/10 transition-opacity duration-300"
          style={{ opacity: formReady ? 1 : 0 }}
        />

        {showSkip && !formReady && (
          <button
            type="button"
            onClick={handleSkip}
            className="absolute right-4 top-4 z-10 rounded-full bg-black/25 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/40"
          >
            Skip ›
          </button>
        )}

        <form
          onSubmit={onSubmit}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 transition-opacity duration-500"
          style={{ opacity: formReady ? 1 : 0, pointerEvents: formReady ? 'auto' : 'none' }}
        >
          <div className="mx-auto w-full max-w-sm rounded-[2rem] bg-white/90 p-6 shadow-2xl ring-1 ring-black/5 backdrop-blur-md">
            <img src={logo} alt="Heygotchu" className="mx-auto h-20 w-20 rounded-2xl object-cover shadow-sm" />
            <div className="mt-5 space-y-3">
              <label htmlFor="login-email" className="sr-only">Email address</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className={`${mobileInput} text-[#e8636a] placeholder:text-[#e8636a]/60 ring-[#e8636a]/30 focus:ring-[#e8636a]`}
                style={{ backgroundColor: EMAIL_FILL }}
              />
              <label htmlFor="login-password" className="sr-only">Password</label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className={`${mobileInput} text-[#5c85bf] placeholder:text-[#5c85bf]/60 ring-[#5c85bf]/30 focus:ring-[#5c85bf]`}
                style={{ backgroundColor: PASSWORD_FILL }}
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-ink px-5 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {busy ? 'Logging in…' : 'Log in'}
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between text-[13px] font-medium">
              <button type="button" onClick={onForgotPassword} className="text-ink/50 hover:text-ink">
                Forgot Password?
              </button>
              <button type="button" onClick={onGoSignup} className="text-coral hover:underline">
                First Time? Sign up
              </button>
            </div>
          </div>
        </form>
      </main>
    )
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-gradient-to-b from-[#cfe0f2] via-[#dfe6ef] to-[#f4e3e0]">
      <div
        className="login-video-stage"
        style={{ containerType: 'inline-size' } as React.CSSProperties}
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
