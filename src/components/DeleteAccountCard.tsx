import { useState } from 'react'
import { authApi, ApiClientError } from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'

// Self-service account deletion (store requirement): shown under
// Preferences. Two explicit steps, then the account and everything in it is
// gone and the user is signed out.
export default function DeleteAccountCard() {
  const { user, logout } = useAuth()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user?.role === 'admin') return null // the family admin can't self-delete

  async function handleDelete() {
    setBusy(true)
    setError(null)
    try {
      await authApi.deleteAccount()
      logout()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not delete the account — please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-coral/20">
      <h2 className="font-display text-lg font-semibold text-ink">Delete my account</h2>
      <p className="mt-1 text-sm text-ink/60">
        Permanently removes your account with everything in it — closet items and photos, preferences, color
        palette, and saved plans. This cannot be undone.
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm font-medium text-coral">{error}</p>
      )}
      {confirming ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-coral">Really delete everything?</span>
          <button
            onClick={() => void handleDelete()}
            disabled={busy}
            className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {busy ? 'Deleting…' : 'Yes, delete my account'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="rounded-full px-4 py-2 text-sm font-medium text-ink/60 hover:bg-black/5 disabled:opacity-40"
          >
            Keep my account
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="mt-4 rounded-full border border-coral/40 px-4 py-2 text-sm font-medium text-coral transition hover:bg-coral/10"
        >
          Delete my account…
        </button>
      )}
    </div>
  )
}
