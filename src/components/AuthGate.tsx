import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { ApiClientError, authApi } from '../lib/apiClient'
import logo from '../assets/logo-mark.png'
import LoginVideoScreen from './LoginVideoScreen'

type Screen = 'login' | 'signup' | 'verify' | 'forgot'

interface VerifyState {
  userId: string
  email: string
  devCode?: string
}

export default function AuthGate() {
  const { signup, sendOtp, verifyOtp, login } = useAuth()
  const [screen, setScreen] = useState<Screen>('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [verify, setVerify] = useState<VerifyState | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Forgot-password flow: request a code by email, then set a new password.
  const [forgot, setForgot] = useState<VerifyState | null>(null)
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')

  function friendlyError(e: unknown): string {
    if (e instanceof ApiClientError) return e.message
    return 'Something went wrong. Please try again.'
  }

  async function beginVerification(identifier: { userId?: string; email?: string }, emailLabel: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await sendOtp(identifier)
      setVerify({ userId: res.userId, email: emailLabel, devCode: res.devCode })
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setBusy(true)
    try {
      const user = await signup(email.trim(), password)
      setBusy(false)
      await beginVerification({ userId: user.id }, user.email)
    } catch (e) {
      setBusy(false)
      setError(friendlyError(e))
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(loginEmail.trim(), loginPassword)
      // On success, AuthContext flips to signed-in and App swaps this out.
    } catch (e) {
      setBusy(false)
      if (e instanceof ApiClientError && e.status === 403) {
        // Account exists but isn't verified yet — offer to resend a code
        // using the email they typed, since we don't have their userId
        // from a login attempt.
        await beginVerification({ email: loginEmail.trim() }, loginEmail.trim())
        return
      }
      setError(friendlyError(e))
      return
    }
    setBusy(false)
  }

  async function handleResend() {
    if (!verify) return
    await beginVerification({ userId: verify.userId }, verify.email)
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    if (!verify) return
    setError(null)
    setBusy(true)
    try {
      await verifyOtp(verify.userId, code.trim())
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleForgotRequest(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await authApi.forgotPassword(forgotEmail.trim())
      setForgot({ userId: res.userId, email: forgotEmail.trim(), devCode: res.devCode })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    if (!forgot) return
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await authApi.resetPassword(forgot.userId, resetCode.trim(), newPassword)
      // Reset succeeded server-side; log in through the normal context flow
      // so the app state updates exactly like any other login.
      await login(forgot.email, newPassword)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-coral'

  if (!verify && screen === 'login') {
    return (
      <div>
        <LoginVideoScreen
          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          onSubmit={handleLogin}
          busy={busy}
          onGoSignup={() => { setScreen('signup'); setError(null) }}
          onForgotPassword={() => { setScreen('forgot'); setError(null); setForgot(null); setForgotEmail(loginEmail) }}
        />
        {error && (
          <div role="alert" className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
            <div className="rounded-xl bg-white/95 px-4 py-2.5 text-center text-sm font-medium text-coral shadow-lg ring-1 ring-black/5 backdrop-blur">
              {error}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-10 sm:px-8">
      <div className="mb-6 text-center">
        <img src={logo} alt="Heygotchu" className="mx-auto h-[151px] w-[151px] object-contain sm:h-[168px] sm:w-[168px]" />
        <p className="mt-1 text-sm text-ink/55">
          {verify
            ? 'Verify your account'
            : screen === 'forgot'
              ? 'Reset your password'
              : screen === 'signup'
                ? 'Create your account'
                : 'Welcome back'}
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        {error && (
          <div role="alert" className="mb-4 rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm font-medium text-coral">
            {error}
          </div>
        )}

        {verify ? (
          <div className="space-y-4">
            <p className="text-sm text-ink/60">
              We sent a 6-digit code to <strong>{verify.email}</strong>. It expires in a few minutes.
            </p>
            {verify.devCode && (
              <div className="rounded-xl bg-mint/15 px-3.5 py-2.5 text-sm text-ink/70">
                <strong>Dev mode:</strong> no email provider is configured yet, so here's your code directly:{' '}
                <span className="font-mono font-semibold">{verify.devCode}</span>
              </div>
            )}
            <form onSubmit={handleVerify} className="space-y-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                autoFocus
                className={`${inputClass} text-center font-mono text-lg tracking-[0.4em]`}
              />
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {busy ? 'Verifying…' : 'Verify & continue'}
              </button>
            </form>
            <div className="flex justify-center text-xs text-ink/50">
              <button onClick={handleResend} disabled={busy} className="font-medium text-ink/70 hover:text-ink">
                Resend code
              </button>
            </div>
            <button
              onClick={() => {
                setVerify(null)
                setCode('')
                setError(null)
              }}
              className="text-xs font-medium text-ink/40 hover:text-ink/60"
            >
              ← Back
            </button>
          </div>
        ) : screen === 'forgot' ? (
          forgot ? (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <p className="text-sm text-ink/60">
                We sent a 6-digit code to <strong>{forgot.email}</strong>. Enter it with your new password.
              </p>
              {forgot.devCode && (
                <div className="rounded-xl bg-mint/15 px-3.5 py-2.5 text-sm text-ink/70">
                  <strong>Heads up:</strong> email delivery isn't fully set up yet, so here's your code directly:{' '}
                  <span className="font-mono font-semibold">{forgot.devCode}</span>
                </div>
              )}
              <input
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                autoFocus
                className={`${inputClass} text-center font-mono text-lg tracking-[0.4em]`}
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60" htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-ink/40">At least 8 characters.</p>
              </div>
              <button
                type="submit"
                disabled={busy || resetCode.length !== 6}
                className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {busy ? 'Resetting…' : 'Reset password & log in'}
              </button>
              <button
                type="button"
                onClick={() => { setForgot(null); setResetCode(''); setNewPassword(''); setError(null) }}
                className="text-xs font-medium text-ink/40 hover:text-ink/60"
              >
                ← Back
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotRequest} className="space-y-3">
              <p className="text-sm text-ink/60">Enter your account email and we'll send a reset code.</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60" htmlFor="forgot-email">Email address</label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoFocus
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {busy ? 'Sending code…' : 'Send reset code'}
              </button>
              <p className="text-center text-xs text-ink/50">
                Remembered it?{' '}
                <button type="button" onClick={() => { setScreen('login'); setError(null) }} className="font-semibold text-ink hover:underline">
                  Log in
                </button>
              </p>
            </form>
          )
        ) : screen === 'signup' ? (
          <form onSubmit={handleSignup} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60" htmlFor="signup-email">Email address</label>
              <input id="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60" htmlFor="signup-password">Password</label>
              <input id="signup-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
              <p className="mt-1 text-xs text-ink/40">At least 8 characters.</p>
            </div>
            <button type="submit" disabled={busy} className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40">
              {busy ? 'Creating account…' : 'Create account'}
            </button>
            <p className="text-center text-xs text-ink/50">
              Already have an account?{' '}
              <button type="button" onClick={() => { setScreen('login'); setError(null) }} className="font-semibold text-ink hover:underline">
                Log in
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60" htmlFor="login-email">Email address</label>
              <input id="login-email" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60" htmlFor="login-password">Password</label>
              <input id="login-password" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={inputClass} />
            </div>
            <button type="submit" disabled={busy} className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40">
              {busy ? 'Logging in…' : 'Log in'}
            </button>
            <p className="text-center text-xs text-ink/50">
              New to Heygotchu?{' '}
              <button type="button" onClick={() => { setScreen('signup'); setError(null) }} className="font-semibold text-ink hover:underline">
                Create an account
              </button>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
