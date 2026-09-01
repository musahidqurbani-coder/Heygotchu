// "Sign in with fingerprint" without building any biometric or crypto
// system of our own: this plugs into the browser's native Credential
// Management API. On Android/Chrome (which is what the wrapped app runs
// on), retrieving a saved credential this way is already gated behind the
// device's own fingerprint/face/screen-lock prompt whenever Google
// Password Manager has that protection turned on — that's the OS doing
// the biometric check, not us. Everywhere the API isn't supported
// (Firefox, Safari, older browsers) every function here just no-ops.

export async function rememberCredential(id: string, password: string): Promise<void> {
  try {
    const PasswordCredentialCtor = (window as unknown as { PasswordCredential?: new (data: unknown) => Credential })
      .PasswordCredential
    if (!PasswordCredentialCtor || !navigator.credentials?.store) return
    const credential = new PasswordCredentialCtor({ id, password, name: id })
    await navigator.credentials.store(credential)
  } catch {
    // The browser can decline to save for many benign reasons (private
    // browsing, the person dismissed the save prompt, no support) — none
    // of them should ever block sign-in.
  }
}

export interface StoredCredential {
  id: string
  password: string
}

export async function getRememberedCredential(): Promise<StoredCredential | null> {
  try {
    if (!navigator.credentials?.get) return null
    const credential = await navigator.credentials.get({
      // @ts-expect-error — `password` isn't in the standard CredentialRequestOptions
      // TS lib types yet, but every Chromium browser supports it.
      password: true,
      mediation: 'optional',
    })
    if (credential && credential.type === 'password') {
      const cred = credential as unknown as { id: string; password: string }
      if (typeof cred.password === 'string' && cred.password.length > 0) {
        return { id: cred.id, password: cred.password }
      }
    }
    return null
  } catch {
    return null
  }
}

export async function forgetRememberedCredential(): Promise<void> {
  try {
    await navigator.credentials?.preventSilentAccess?.()
  } catch {
    // best-effort only
  }
}
