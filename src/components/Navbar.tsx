import logo from '../assets/logo.jpg'

interface NavbarProps {
  onLogoClick: () => void
  onClosetClick: () => void
  onPreferencesClick: () => void
  onSavedClick: () => void
  savedCount: number
  userEmail?: string
  onLogout?: () => void
}

export default function Navbar({
  onLogoClick,
  onClosetClick,
  onPreferencesClick,
  onSavedClick,
  savedCount,
  userEmail,
  onLogout,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-cloud/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <button
          onClick={onLogoClick}
          className="flex items-center gap-2 text-lg font-semibold tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded-md"
          aria-label="Heygotchu home"
        >
          <img src={logo} alt="" className="h-10 w-10 rounded-lg object-cover shadow-sm" />
          <span className="font-display text-xl">Heygotchu</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onClosetClick}
            className="rounded-full px-3 py-2 text-sm font-medium text-ink/80 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral sm:px-4"
          >
            My Closet
          </button>
          <button
            onClick={onPreferencesClick}
            className="rounded-full px-3 py-2 text-sm font-medium text-ink/80 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral sm:px-4"
          >
            Preferences
          </button>
          <button
            onClick={onSavedClick}
            className="relative rounded-full px-3 py-2 text-sm font-medium text-ink/80 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral sm:px-4"
          >
            Saved Trips
            {savedCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-xs font-semibold text-white">
                {savedCount}
              </span>
            )}
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              title={userEmail}
              className="rounded-full px-3 py-2 text-sm font-medium text-ink/50 transition hover:bg-black/5 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-coral sm:px-4"
            >
              Log out
            </button>
          )}
        </div>
      </nav>
    </header>
  )
}
