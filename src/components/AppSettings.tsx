import { useRef, useState } from 'react'
import { LANGUAGES, useLang } from '../lib/i18n'
import { VIBES, applyVibe, currentVibe } from '../lib/vibes'
import { useAuth } from '../context/AuthContext'
import { cropAvatarToSquare } from '../lib/avatarCrop'
import { ApiClientError } from '../lib/apiClient'

interface AppSettingsProps {
  onBack?: () => void
  onToast?: (message: string) => void
}

// App-level settings: profile (name/phone/photo), language, "My Vibe" (the
// selectable UI look), and the refer-&-earn link. Lives on the Preferences
// screen above the clothing preferences — which is why the back button
// lives up here, at the top of the page.
export default function AppSettings({ onBack, onToast }: AppSettingsProps) {
  const { lang, setLang } = useLang()
  const { user, updateProfile } = useAuth()
  const [vibe, setVibe] = useState(currentVibe)
  const [copied, setCopied] = useState(false)

  const [name, setName] = useState(user?.name ?? '')
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '')
  const [avatarPhoto, setAvatarPhoto] = useState(user?.avatarPhoto ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handlePickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarBusy(true)
    try {
      const cropped = await cropAvatarToSquare(file)
      setAvatarPhoto(cropped)
    } catch {
      onToast?.("Couldn't read that photo — try a different one.")
    } finally {
      setAvatarBusy(false)
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true)
    try {
      await updateProfile({ name: name.trim(), phoneNumber: phoneNumber.trim(), avatarPhoto })
      onToast?.('Profile saved ✓')
    } catch (e) {
      onToast?.(e instanceof ApiClientError ? e.message : 'Could not save your profile — please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  function pickVibe(id: string) {
    applyVibe(id)
    setVibe(id)
  }

  async function copyReferral() {
    if (!user) return
    const link = `https://heygotchu.com/?ref=${user.id}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Heygotchu',
          text: 'Outfit plans from your own closet — join me on Heygotchu ✨',
          url: link,
        })
        return
      }
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* user dismissed the share sheet */ }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pt-8 sm:px-8">
      {onBack && (
        <button
          onClick={onBack}
          className="text-sm font-medium text-ink/50 transition hover:text-ink focus:outline-none"
        >
          ← Back
        </button>
      )}
      {/* Profile */}
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h3 className="font-display text-lg font-semibold">Profile 👤</h3>
        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarBusy}
            aria-label="Change profile photo"
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-cloud ring-1 ring-black/10 disabled:opacity-60"
          >
            {avatarPhoto ? (
              <img src={avatarPhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-xl font-bold text-ink/40">
                {(name || user?.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center text-[9px] font-semibold text-[#fff]">
              {avatarBusy ? '…' : 'Edit'}
            </span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handlePickPhoto(e)} />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/50" htmlFor="profile-name">Name</label>
              <input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-coral"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/50" htmlFor="profile-phone">Phone number</label>
              <input
                id="profile-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Add a phone number"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-coral"
              />
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink/40">{user?.email} · adding a phone number lets you log in with it instead.</p>
        <button
          onClick={() => void handleSaveProfile()}
          disabled={savingProfile}
          className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {savingProfile ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      {/* Language */}
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h3 className="font-display text-lg font-semibold">Language 🌐</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                lang === l.code ? 'bg-ink text-white' : 'bg-cloud text-ink/70 ring-1 ring-black/10 hover:text-ink'
              }`}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* My Vibe */}
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h3 className="font-display text-lg font-semibold">My Vibe 🎨</h3>
        <p className="mt-1 text-xs text-ink/50">Pick the look the whole app wears — yours alone, saved on this device.</p>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {VIBES.map((v) => (
            <button
              key={v.id}
              onClick={() => pickVibe(v.id)}
              aria-pressed={vibe === v.id}
              className={`rounded-2xl p-2.5 text-center transition ${
                vibe === v.id ? 'ring-2 ring-coral' : 'ring-1 ring-black/10 hover:ring-black/25'
              }`}
            >
              <span className="mx-auto flex h-10 w-full overflow-hidden rounded-xl ring-1 ring-black/10">
                {v.preview.map((c) => (
                  <span key={c} className="h-full flex-1" style={{ backgroundColor: c }} />
                ))}
              </span>
              <span className="mt-1.5 block text-xs font-semibold text-ink/80">
                {v.emoji} {v.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Refer & earn */}
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h3 className="font-display text-lg font-semibold">Refer &amp; earn 🔥</h3>
        <p className="mt-1 text-sm text-ink/60">
          Share your link — every friend who joins adds <strong>+5 days</strong> to your Daily Grind streak.
        </p>
        <button
          onClick={() => void copyReferral()}
          className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {copied ? 'Link copied ✓' : '🔗 Share my invite link'}
        </button>
      </div>
    </div>
  )
}
