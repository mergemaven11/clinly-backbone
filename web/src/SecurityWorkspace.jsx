import { useEffect, useState } from 'react'

import { apiRequest } from './api'

function RecoveryCodes({ codes }) {
  if (!codes?.length) return null
  return (
    <section className="panel-card">
      <span className="kicker">Save these now</span>
      <h3>One-time recovery codes</h3>
      <p className="muted">Each code works once. Store them somewhere separate from this device. They will not be shown again.</p>
      <div className="security-code-grid">
        {codes.map((code) => <code key={code}>{code}</code>)}
      </div>
    </section>
  )
}

export default function SecurityWorkspace({ token }) {
  const [status, setStatus] = useState(null)
  const [setup, setSetup] = useState(null)
  const [setupCode, setSetupCode] = useState('')
  const [recoveryFactor, setRecoveryFactor] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadStatus() {
    const next = await apiRequest('/auth/mfa/status', { token })
    setStatus(next)
  }

  useEffect(() => {
    loadStatus().catch((requestError) => setError(requestError.message))
  }, [token])

  async function startSetup() {
    setBusy(true)
    setError('')
    setNotice('')
    setRecoveryCodes([])
    try {
      const next = await apiRequest('/auth/mfa/setup', { token, method: 'POST' })
      setSetup(next)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmSetup(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest('/auth/mfa/confirm', {
        token,
        method: 'POST',
        body: JSON.stringify({ code: setupCode }),
      })
      setRecoveryCodes(result.recovery_codes)
      setSetup(null)
      setSetupCode('')
      setNotice('Authenticator MFA is enabled. Other signed-in devices were revoked.')
      await loadStatus()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function replaceRecoveryCodes(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setRecoveryCodes([])
    try {
      const result = await apiRequest('/auth/mfa/recovery-codes', {
        token,
        method: 'POST',
        body: JSON.stringify({ code: recoveryFactor }),
      })
      setRecoveryCodes(result.recovery_codes)
      setRecoveryFactor('')
      setNotice('Previous recovery codes were invalidated and replaced.')
      await loadStatus()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function disableMfa(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setRecoveryCodes([])
    try {
      await apiRequest('/auth/mfa/disable', {
        token,
        method: 'POST',
        body: JSON.stringify({ code: disableCode, password }),
      })
      setDisableCode('')
      setPassword('')
      setNotice('Authenticator MFA was disabled. Other signed-in devices were revoked.')
      await loadStatus()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  if (!status) return <div className="empty-state"><div className="spinner" /><p>Loading account security…</p></div>

  return (
    <div className="workspace-stack security-workspace">
      {notice && <div className="notice success">{notice}</div>}
      {error && <div className="notice error">{error}</div>}

      <section className="panel-card">
        <span className="kicker">Account protection</span>
        <h2>Authenticator MFA</h2>
        <p className="muted">
          Use a standards-based authenticator app for a second factor. Clinly stores the authenticator seed encrypted and stores recovery codes only as keyed digests.
        </p>
        <div className={status.enabled ? 'status-pill success' : 'status-pill'}>
          {status.enabled ? 'Enabled' : 'Not enabled'}
        </div>
        {status.enabled && <p className="muted">Recovery codes remaining: {status.recovery_codes_remaining}</p>}
        {!status.enabled && !setup && (
          <button className="primary-button" type="button" onClick={startSetup} disabled={busy}>
            {busy ? 'Preparing…' : 'Set up authenticator MFA'}
          </button>
        )}
      </section>

      {setup && (
        <form className="panel-card" onSubmit={confirmSetup}>
          <span className="kicker">Enrollment</span>
          <h3>Add Clinly to your authenticator app</h3>
          <p className="muted">Use the setup link on a compatible device, or enter the manual key in your authenticator app.</p>
          <a className="secondary-button" href={setup.provisioning_uri}>Open authenticator app</a>
          <label>
            Manual setup key
            <code className="security-secret">{setup.secret}</code>
          </label>
          <label>
            Six-digit code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={setupCode}
              onChange={(event) => setSetupCode(event.target.value)}
              minLength={6}
              maxLength={6}
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Confirm and enable MFA'}
          </button>
        </form>
      )}

      {status.enabled && (
        <>
          <form className="panel-card" onSubmit={replaceRecoveryCodes}>
            <span className="kicker">Recovery</span>
            <h3>Replace recovery codes</h3>
            <p className="muted">Enter a current authenticator or recovery code. Replacing codes immediately invalidates every previous recovery code.</p>
            <label>
              Current MFA code
              <input value={recoveryFactor} onChange={(event) => setRecoveryFactor(event.target.value)} autoComplete="one-time-code" required />
            </label>
            <button className="secondary-button" type="submit" disabled={busy}>Generate new recovery codes</button>
          </form>

          <form className="panel-card danger-zone" onSubmit={disableMfa}>
            <span className="kicker">Sensitive action</span>
            <h3>Disable MFA</h3>
            <p className="muted">This requires both your password and a current MFA factor. Other active sessions will be revoked.</p>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            </label>
            <label>
              Current MFA code
              <input value={disableCode} onChange={(event) => setDisableCode(event.target.value)} autoComplete="one-time-code" required />
            </label>
            <button className="secondary-button" type="submit" disabled={busy}>Disable MFA</button>
          </form>
        </>
      )}

      <RecoveryCodes codes={recoveryCodes} />
    </div>
  )
}
