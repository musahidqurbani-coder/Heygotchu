import { Component, type ReactNode } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
}

// Last line of defense: any unexpected render crash shows a friendly
// reload screen instead of a blank white page.
export default class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[Heygotchu] render crash:', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="grid min-h-screen place-items-center bg-cloud px-6 text-center">
        <div>
          <p className="text-4xl" aria-hidden="true">🧵</p>
          <h1 className="mt-3 font-display text-2xl font-bold text-ink">Oops — a seam ripped.</h1>
          <p className="mt-2 text-sm text-ink/60">Something went wrong on this screen. Reloading usually fixes it.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Reload Heygotchu
          </button>
        </div>
      </main>
    )
  }
}
