// Shared loader for the user's Google Programmable Search Engine (created in
// the Google CSE console, "search entire web" + image search enabled). The
// embedded Element is free and needs no API key. Multiple components can
// each render their own instance (distinct `gname`) once this script has
// loaded — this module just ensures the underlying <script> tag is added
// exactly once no matter how many instances mount.
export const CSE_ID = '567c8d7ce251c40c9'

declare global {
  interface Window {
    __gcse?: Record<string, unknown>
    google?: {
      search?: {
        cse?: {
          element: {
            render: (config: { div: HTMLElement | string; tag: string; gname: string }, opts?: Record<string, unknown>) => void
            getElement: (gname: string) => { execute: (query: string) => void } | null
          }
        }
      }
    }
  }
}

// Google's CSE widget races and silently fails to register an element if
// multiple `element.render()` calls happen close together — even across
// unrelated components on the same page. Every render+poll+execute sequence
// anywhere in the app must go through this queue so only one runs at a time.
let queue: Promise<unknown> = Promise.resolve()
export function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn, fn)
  queue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

let csePromise: Promise<void> | null = null
export function loadCse(): Promise<void> {
  if (!csePromise) {
    csePromise = new Promise<void>((resolve, reject) => {
      window.__gcse = {
        parsetags: 'explicit',
        initializationCallback: () => resolve(),
      }
      const s = document.createElement('script')
      s.src = `https://cse.google.com/cse.js?cx=${CSE_ID}`
      s.async = true
      s.onerror = () => reject(new Error('Google search widget failed to load'))
      document.head.appendChild(s)
      // Belt and braces: some blockers let the script load but never init.
      setTimeout(() => reject(new Error('Google search widget timed out')), 12000)
    })
  }
  return csePromise
}
