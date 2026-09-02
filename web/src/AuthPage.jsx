import { useState } from 'react'

import { apiRequest } from './api'
import { APP_INITIAL, APP_NAME, APP_TAGLINE } from './brand'
import { DEMO_PASSWORD, DEMO_PATIENT_EMAIL, DEMO_PROVIDER_EMAIL, IS_DEMO_MODE } from './demoApi'

export default function AuthPage({ onToken }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState(IS_DEMO_MODE ? DEMO_PROVIDER_EMAIL : '')
  const [password, setPassword] = useState(IS_DEMO_MODE ? DEMO_PASSWORD : '')
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

  async function openDemo(accountEmail) {
    setEmail(accountEmail)
    setPassword(DEMO_PASSWORD)
    setBusy(true)
    setError('')
    try {
      const login = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: accountEmail, password: DEMO_PASSWORD }),
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
          <span className="beta-badge">BETA</span>
        </div>
        <div className="auth-copy">
          <span className="kicker">{APP_TAGLINE}</span>
          <h1>Run the relationship, not a pile of disconnected tools.</h1>
          <p>
            Clinly is built for service professionals — from Botox and aesthetics specialists to fitness trainers, coaches, consultants, wellness providers, and more. Bring messaging, progress tracking, shared plans, notes, and ongoing service relationships into one adaptable workspace.
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
          <span className="kicker">{IS_DEMO_MODE ? 'Interactive product demo' : mode === 'login' ? 'Welcome back' : 'Provider account'}</span>
          <h2>{IS_DEMO_MODE ? 'Explore the Clinly workspace' : mode === 'login' ? 'Sign in to your workspace' : `Create your ${APP_NAME} workspace`}</h2>
          <p className="muted">
            {IS_DEMO_MODE
              ? 'Provider means the service professional running the relationship — for example a Botox specialist, fitness trainer, coach, consultant, or wellness provider. Choose a provider or client/patient demo below.'
              : mode === 'login'
              ? 'People you work with can use the credentials created for their portal.'
              : 'Provider accounts are designed for service professionals across aesthetics, fitness, coaching, consulting, wellness, and more.'}
          </p>

          {IS_DEMO_MODE && (
            <div className="demo-access-card">
              <span>Choose a demo view</span>
              <div className="demo-account-actions">
                <button type="button" onClick={() => openDemo(DEMO_PROVIDER_EMAIL)} disabled={busy}>
                  <strong>Provider portal</strong><small>Manage services, people, tracks, messaging, and activity</small>
                </button>
                <button type="button" onClick={() => openDemo(DEMO_PATIENT_EMAIL)} disabled={busy}>
                  <strong>Client / patient portal</strong><small>View personal tracks, check-ins, and messages</small>
                </button>
              </div>
              <code>Password: {DEMO_PASSWORD}</code>
              <small>Changes stay in this browser tab and reset when you refresh.</small>
            </div>
          )}

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
          {!IS_DEMO_MODE && (
            <button className="text-button" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
              {mode === 'login' ? 'I need a provider account' : 'I already have an account'}
            </button>
          )}
          <a className="secondary-button full" href="/docs">Read the Clinly customer guide</a>
        </form>
      </section>
    </main>
  )
}
