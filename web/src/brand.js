const configuredName = import.meta.env.VITE_APP_NAME?.trim()
const configuredTagline = import.meta.env.VITE_APP_TAGLINE?.trim()

export const APP_NAME = configuredName || 'Provider Portal'
export const APP_TAGLINE = configuredTagline || 'One relationship. One connected place.'
export const APP_INITIAL = APP_NAME.slice(0, 1).toUpperCase() || 'P'

export const SESSION_TOKEN_KEY = 'provider-platform.session.token'
export const LEGACY_SESSION_TOKEN_KEYS = ['clinly.session.token']

export function readSessionToken() {
  const current = sessionStorage.getItem(SESSION_TOKEN_KEY)
  if (current) return current

  for (const legacyKey of LEGACY_SESSION_TOKEN_KEYS) {
    const legacy = sessionStorage.getItem(legacyKey)
    if (!legacy) continue
    sessionStorage.setItem(SESSION_TOKEN_KEY, legacy)
    sessionStorage.removeItem(legacyKey)
    return legacy
  }

  return ''
}

export function clearSessionToken() {
  sessionStorage.removeItem(SESSION_TOKEN_KEY)
  for (const legacyKey of LEGACY_SESSION_TOKEN_KEYS) sessionStorage.removeItem(legacyKey)
}
