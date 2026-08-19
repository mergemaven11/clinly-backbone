import { useState } from 'react'

import { apiRequest } from './api'
import { APP_INITIAL, APP_NAME, APP_TAGLINE } from './brand'

export default function AuthPage({ onToken }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'signup') {
        await apiRequest('/auth/signup-provider', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
      }
      const login = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      onToken(login.access_token)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="brand-lockup">
          <div className="brand-mark">{APP_INITIAL}</div>
          <span>{APP_NAME}</span>
        </div>
        <div className="auth-copy">
          <span className="kicker">{APP_TAGLINE}</span>
          <h1>Run the relationship, not a pile of disconnected tools.</h1>
          <p>
            Bring messaging, progress tracking, shared plans, notes, and ongoing service relationships into one adaptable provider workspace.
          </p>
          <div className="auth-feature-grid">
            <article><strong>Organize</strong><span>Keep every relationship in context</span></article>
            <article><strong>Track</strong><span>Goals, sessions, check-ins, and progress</span></article>
            <article><strong>Message</strong><span>Stay connected between touchpoints</span></article>
            <article><strong>Connect</strong><span>Extend the workspace with provider integrations</span></article>
          </div>
        </div>
      </section>

      <section className="auth-panel-wrap">
        <form className="auth-panel" onSubmit={submit}>
          <span className="kicker">{mode === 'login' ? 'Welcome back' : 'Provider account'}</span>
          <h2>{mode === 'login' ? 'Sign in to your workspace' : `Create your ${APP_NAME} workspace`}</h2>
          <p className="muted">
            {mode === 'login'
              ? 'People you work with can use the credentials created for their portal.'
              : 'Provider accounts can add people and create flexible relationship tracks.'}
          </p>

          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>

          {error && <div className="notice error">{error}</div>}

          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button className="text-button" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
            {mode === 'login' ? 'I need a provider account' : 'I already have an account'}
          </button>
        </form>
      </section>
    </main>
  )
}
