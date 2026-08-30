import { useEffect, useRef, useState } from 'react'
import logo from '../assets/logo-mark.png'

interface NavbarProps {
  onLogoClick: () => void
  onClosetClick: () => void
  onPreferencesClick: () => void
  onSavedClick: () => void
  savedCount: number
  userEmail?: string
  onLogout?: () => void
  isAdmin?: boolean
  onAdminClick?: () => void
}

export default function Navbar({
  onLogoClick,
  onClosetClick,
  onPreferencesClick,
  onSavedClick,
  savedCount,
  userEmail,
  onLogout,
  isAdmin,
  onAdminClick,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the mobile menu on any outside tap/click.
  useEffect(() => {
    if (!menuOpen) return
    function handlePointer(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
    }
  }, [menuOpen])

  const items: { label: string; onClick: () => void; badge?: number; accent?: boolean }[] = [
    { label: 'My Closet', onClick: onClosetClick },
    { label: 'Preferences', onClick: onPreferencesClick },
    { label: 'Saved Trips', onClick: onSavedClick, badge: savedCount > 0 ? savedCount : undefined },
    ...(isAdmin && onAdminClick ? [{ label: 'Admin', onClick: onAdminClick, accent: true }] : []),
    ...(onLogout ? [{ label: 'Log out', onClick: onLogout }] : []),
  ]

  function pick(fn: () => void) {
    setMenuOpen(false)
    fn()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-cloud/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8 sm:py-4">
        <button
          onClick={onLogoClick}
          className="flex items-center gap-2 text-lg font-semibold tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-md"
          aria-label="Heygotchu home"
        >
          <img src={logo} alt="" className="h-[46px] w-[46px] rounded-xl object-contain shadow-sm" />
          <span className="font-display text-xl">Heygotchu</span>
        </button>

        {/* Desktop: inline buttons */}
        <div className="hidden items-center gap-2 md:flex md:gap-3">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              title={item.label === 'Log out' ? userEmail : undefined}
              className={
                item.accent
                  ? 'rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral'
                  : 'relative rounded-full px-4 py-2 text-sm font-medium text-ink/80 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral'
              }
            >
              {item.label}
              {item.badge !== undefined && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-xs font-semibold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Mobile: hamburger + dropdown menu */}
        <div className="relative md:hidden" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="grid h-11 w-11 place-items-center rounded-xl text-xl text-ink/80 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl bg-white py-1.5 shadow-lg ring-1 ring-black/10">
              {userEmail && (
                <p className="truncate border-b border-black/5 px-4 py-2.5 text-xs text-ink/40">{userEmail}</p>
              )}
              {items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => pick(item.onClick)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition hover:bg-cloud ${
                    item.accent ? 'text-coral' : 'text-ink/80'
                  }`}
                >
                  {item.label}
                  {item.badge !== undefined && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-xs font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
