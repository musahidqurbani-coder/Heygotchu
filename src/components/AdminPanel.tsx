import { useEffect, useState } from 'react'
import PhotoLightbox from './PhotoLightbox'
import { adminApi, ApiClientError, type AdminUserSummary, type AdminUserDetail } from '../lib/apiClient'

interface AdminPanelProps {
  onBack: () => void
  onToast: (message: string) => void
}

// Family admin dashboard — lists every account with usage counts, lets the
// admin open any account to see its closet and saved plans, and remove
// non-admin accounts. Only rendered for role === 'admin' users, and the
// backend re-checks the role on every /admin request regardless.
export default function AdminPanel({ onBack, onToast }: AdminPanelProps) {
  const [users, setUsers] = useState<AdminUserSummary[] | null>(null)
  const [selected, setSelected] = useState<AdminUserDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  function friendlyError(e: unknown): string {
    return e instanceof ApiClientError ? e.message : 'Something went wrong. Please try again.'
  }

  async function loadUsers() {
    try {
      setUsers(await adminApi.listUsers())
    } catch (e) {
      onToast(friendlyError(e))
      setUsers([])
    }
  }

  useEffect(() => {
    void loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openUser(id: string) {
    setLoadingDetail(true)
    try {
      setSelected(await adminApi.getUser(id))
    } catch (e) {
      onToast(friendlyError(e))
    } finally {
      setLoadingDetail(false)
    }
  }

  async function deleteUser(id: string) {
    setConfirmingDelete(null)
    try {
      await adminApi.removeUser(id)
      onToast('Account removed')
      setSelected(null)
      await loadUsers()
    } catch (e) {
      onToast(friendlyError(e))
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

  if (selected) {
    return (
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-8">
        <button onClick={() => setSelected(null)} className="text-sm font-medium text-ink/50 hover:text-ink">
          ← All accounts
        </button>
        <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold">{selected.email}</h1>
              <p className="mt-1 text-sm text-ink/50">
                {selected.role === 'admin' ? 'Admin · ' : ''}
                {selected.verified ? 'Verified' : 'Not verified'} · joined {formatDate(selected.createdAt)}
              </p>
            </div>
            {selected.role !== 'admin' && (
              confirmingDelete === selected.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-coral">Delete this account and all its data?</span>
                  <button onClick={() => void deleteUser(selected.id)} className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                    Yes, delete
                  </button>
                  <button onClick={() => setConfirmingDelete(null)} className="rounded-full px-4 py-2 text-sm font-medium text-ink/60 hover:bg-black/5">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmingDelete(selected.id)} className="rounded-full border border-coral/40 px-4 py-2 text-sm font-medium text-coral transition hover:bg-coral/10">
                  Remove account
                </button>
              )
            )}
          </div>

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-ink/40">Closet · {selected.closet.length} items</h2>
          {selected.closet.length === 0 ? (
            <p className="mt-2 text-sm text-ink/50">No clothing items yet.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {selected.closet.map((item) => (
                <div key={item.id} className="rounded-2xl bg-cloud p-3 ring-1 ring-black/5">
                  {item.photo ? (
                    <button
                      type="button"
                      onClick={() => setLightbox({ src: item.photo!, alt: item.name })}
                      className="mb-2 block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                    >
                      <img src={item.photo} alt={item.name} className="h-24 w-full rounded-xl object-cover" />
                    </button>
                  ) : (
                    <div className="mb-2 grid h-24 w-full place-items-center rounded-xl bg-black/5 text-xs text-ink/40">no photo</div>
                  )}
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-ink/50">{item.category} · {item.color}</p>
                </div>
              ))}
            </div>
          )}

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-ink/40">Saved plans · {selected.plans.length}</h2>
          {selected.plans.length === 0 ? (
            <p className="mt-2 text-sm text-ink/50">No saved trips or occasions yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {selected.plans.map((plan) => (
                <li key={plan.id} className="flex items-center justify-between rounded-2xl bg-cloud px-4 py-3 ring-1 ring-black/5">
                  <span className="text-sm font-medium">{plan.title}</span>
                  <span className="text-xs text-ink/50">{plan.mode} · {formatDate(plan.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {lightbox && <PhotoLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Family accounts</h1>
          <p className="mt-1 text-sm text-ink/50">Every Heygotchu account, their closets, and saved plans.</p>
        </div>
        <button onClick={onBack} className="rounded-full px-4 py-2 text-sm font-medium text-ink/60 hover:bg-black/5">
          ← Back
        </button>
      </div>

      {users === null ? (
        <p className="mt-10 text-center text-sm text-ink/50">Loading accounts…</p>
      ) : users.length === 0 ? (
        <p className="mt-10 text-center text-sm text-ink/50">No accounts found.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-xs uppercase tracking-widest text-ink/40">
                <th className="px-5 py-3.5 font-semibold">Account</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-4 py-3.5 font-semibold">Closet</th>
                <th className="px-4 py-3.5 font-semibold">Plans</th>
                <th className="px-4 py-3.5 font-semibold">Joined</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-black/5 last:border-0 hover:bg-cloud/60">
                  <td className="px-5 py-3.5 font-medium">
                    {u.email}
                    {u.role === 'admin' && (
                      <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">admin</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={u.verified ? 'text-mint-700 font-medium text-emerald-600' : 'text-ink/40'}>
                      {u.verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-ink/70">{u.closetCount}</td>
                  <td className="px-4 py-3.5 text-ink/70">{u.planCount}</td>
                  <td className="px-4 py-3.5 text-ink/50">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => void openUser(u.id)}
                      disabled={loadingDetail}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink/70 ring-1 ring-black/10 transition hover:bg-black/5 disabled:opacity-40"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
