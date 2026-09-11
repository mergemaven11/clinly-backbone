import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SESSION_TOKEN_KEY, clearSessionToken } from './brand'

describe('session clearing', () => {
  beforeEach(() => {
    sessionStorage.clear()
    global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('best-effort revokes a real server session before clearing local state', () => {
    sessionStorage.setItem(SESSION_TOKEN_KEY, 'real-access-token')

    clearSessionToken()

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        headers: { Authorization: 'Bearer real-access-token' },
      }),
    )
    expect(sessionStorage.getItem(SESSION_TOKEN_KEY)).toBeNull()
  })

  it('does not call the real API for seeded demo sessions', () => {
    sessionStorage.setItem(SESSION_TOKEN_KEY, 'clinly-demo-provider-session')

    clearSessionToken()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(SESSION_TOKEN_KEY)).toBeNull()
  })
})
