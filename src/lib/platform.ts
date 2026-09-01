// Chrome sets document.referrer to "android-app://<package>" specifically
// when a page is opened via a Trusted Web Activity — this is the standard,
// documented way to tell "running inside the wrapped Android app" apart
// from "someone visiting the site in a normal browser", with no native
// code or manifest changes needed on either side.
export function isRunningAsTwa(): boolean {
  try {
    return document.referrer.startsWith('android-app://')
  } catch {
    return false
  }
}
