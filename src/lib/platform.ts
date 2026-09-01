// Two independent signals, either one is enough:
//
// 1. Chrome sets document.referrer to "android-app://<package>" when a page
//    is opened via a verified Trusted Web Activity.
// 2. A verified TWA also renders with display-mode "standalone" (no browser
//    chrome) — set by "display": "standalone" in twa-manifest.json. This
//    catches it even if the referrer isn't set for some reason.
//
// Note: if Digital Asset Links verification fails on a given device, the
// app falls back to a plain Chrome Custom Tab (the "Running in Chrome" URL
// bar) — neither signal fires in that fallback mode, since it's really just
// a browser tab at that point, not a trusted app window. Fixing that
// verification (matching signing cert in assetlinks.json, no stale Chrome
// cache) is what makes both the chrome-less window AND this detection work.
export function isRunningAsTwa(): boolean {
  try {
    if (document.referrer.startsWith('android-app://')) return true
  } catch {
    // ignore
  }
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  } catch {
    // ignore
  }
  return false
}
