import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiRequest } from './api'
import { APP_INITIAL, APP_NAME, SESSION_TOKEN_KEY, clearSessionToken, readSessionToken } from './brand'
import './public-booking.css'

function localDateInput(daysAhead = 1) {
  const value = new Date(Date.now() + daysAhead * 86_400_000)
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function money(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value / 100)
  } catch {
    return `${currency} ${(value / 100).toFixed(2)}`
  }
}

function formatSlot(value, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(value))
}

function formatConfirmation(value, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(new Date(value))
}

export default function PublicBookingPage({ slug, serviceId }) {
  const [token, setToken] = useState(() => readSessionToken())
  const [user, setUser] = useState(null)
  const [page, setPage] = useState(null)
  const [date, setDate] = useState(localDateInput())
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [bookingBusy, setBookingBusy] = useState(false)

  const service = useMemo(
    () => page?.services.find((item) => item.id === serviceId) || null,
    [page, serviceId],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiRequest(`/public/providers/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (!cancelled) {
          setPage(data)
          document.title = `Book with ${data.profile.display_name} · ${APP_NAME}`
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.status === 404 ? 'This provider page is not published.' : requestError.message)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }
    let cancelled = false
    apiRequest('/account/me', { token })
      .then((profile) => { if (!cancelled) setUser(profile) })
      .catch(() => {
        clearSessionToken()
        if (!cancelled) {
          setToken('')
          setUser(null)
        }
      })
    return () => { cancelled = true }
  }, [token])

  const loadSlots = useCallback(async () => {
    if (!service || !date || service.capacity !== 1) {
      setSlots([])
      return
    }
    setSlotsLoading(true)
    setError('')
    try {
      const data = await apiRequest(
        `/public/providers/${encodeURIComponent(slug)}/services/${service.id}/slots?${new URLSearchParams({ date_from: date, date_to: date })}`,
      )
      setSlots(data.slots)
      setSelectedSlot((current) => current && data.slots.some((slot) => slot.starts_at === current.starts_at) ? current : null)
    } catch (requestError) {
      setSlots([])
      setError(requestError.message)
    } finally {
      setSlotsLoading(false)
    }
  }, [date, service, slug])

  useEffect(() => { loadSlots() }, [loadSlots])

  async function signIn(event) {
    event.preventDefault()
    setAuthBusy(true)
    setError('')
    try {
      const login = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      const nextToken = login.access_token
      const profile = await apiRequest('/account/me', { token: nextToken })
      if (profile.role !== 'PARTICIPANT') {
        throw new Error('Public booking is for member accounts. Providers can manage appointments from their Calendar workspace.')
      }
      sessionStorage.setItem(SESSION_TOKEN_KEY, nextToken)
      setToken(nextToken)
      setUser(profile)
      setPassword('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setAuthBusy(false)
    }
  }

  async function book() {
    if (!token || !selectedSlot || !service) return
    setBookingBusy(true)
    setError('')
    try {
      const booked = await apiRequest('/bookings', {
        token,
        method: 'POST',
        body: JSON.stringify({ service_id: service.id, starts_at: selectedSlot.starts_at }),
      })
      setConfirmation(booked)
      setSelectedSlot(null)
      await loadSlots()
    } catch (requestError) {
      setError(requestError.message)
      await loadSlots()
    } finally {
      setBookingBusy(false)
    }
  }

  if (loading) {
    return <main className="public-booking-shell"><div className="empty-state"><div className="spinner" /><p>Loading booking page…</p></div></main>
  }

  if (!page || !service) {
    return (
      <main className="public-booking-shell">
        <a className="public-booking-brand" href="/"><span className="brand-mark">{APP_INITIAL}</span><strong>{APP_NAME}</strong></a>
        <section className="public-booking-error section-card"><span>○</span><h1>Service unavailable</h1><p>{error || 'This service is not available for public booking.'}</p><a className="primary-button" href={`/p/${encodeURIComponent(slug)}`}>Back to provider</a></section>
      </main>
    )
  }

  return (
    <main className="public-booking-shell">
      <nav className="public-booking-nav">
        <a className="public-booking-brand" href="/"><span className="brand-mark">{APP_INITIAL}</span><strong>{APP_NAME}</strong></a>
        <a className="secondary-button" href={`/p/${encodeURIComponent(slug)}`}>← {page.profile.display_name}</a>
      </nav>

      <div className="public-booking-layout">
        <aside className="public-booking-service">
          <span className="kicker">{service.delivery_mode.replaceAll('_', ' ')}</span>
          <h1>{service.name}</h1>
          {service.description && <p>{service.description}</p>}
          <div className="public-booking-facts">
            <span><strong>{money(service.price_minor, service.currency)}</strong><small>Service price</small></span>
            <span><strong>{service.duration_minutes} min</strong><small>Duration</small></span>
          </div>
          <div className="public-booking-provider"><span>{page.profile.display_name.slice(0, 1).toUpperCase()}</span><div><strong>{page.profile.display_name}</strong><small>{page.profile.provider_type || page.profile.business_name || 'Provider'}</small></div></div>
          {service.location_labels.length > 0 && <div className="mini-tags">{service.location_labels.map((label) => <span key={label}>{label}</span>)}</div>}
          {service.intake_required && <div className="public-booking-note">This service requires intake. The intake workflow will connect through the forms module; booking still reserves the appointment now.</div>}
        </aside>

        <section className="public-booking-card section-card">
          {confirmation ? (
            <div className="public-booking-confirmation">
              <span className="confirmation-mark">✓</span>
              <span className="kicker">Confirmed</span>
              <h2>Your appointment is booked.</h2>
              <p>{formatConfirmation(confirmation.starts_at, confirmation.provider_timezone)}</p>
              <a className="primary-button" href="/">Open my workspace</a>
              <button type="button" className="text-button" onClick={() => setConfirmation(null)}>Book another time</button>
            </div>
          ) : service.capacity > 1 ? (
            <div className="public-booking-group-block">
              <span>◎</span><h2>Group booking is coming next.</h2><p>This service supports up to {service.capacity} people. The current scheduler intentionally books only 1:1 services until group sessions land.</p>
            </div>
          ) : (
            <>
              <div className="section-heading"><div><span className="kicker">Choose a time</span><h2>Book with {page.profile.display_name}</h2></div></div>
              <label className="public-booking-date">Date<input type="date" min={localDateInput(0)} value={date} onChange={(event) => { setDate(event.target.value); setSelectedSlot(null) }} /></label>
              {slotsLoading ? <div className="public-booking-slots-loading"><div className="spinner" /><span>Finding open times…</span></div> : slots.length ? (
                <div className="public-booking-slot-grid">{slots.map((slot) => <button type="button" key={slot.starts_at} className={selectedSlot?.starts_at === slot.starts_at ? 'selected' : ''} onClick={() => setSelectedSlot(slot)}>{formatSlot(slot.starts_at, slot.provider_timezone)}</button>)}</div>
              ) : <div className="public-booking-no-slots">No open times on this date. Try another day.</div>}

              {selectedSlot && <div className="public-booking-selection"><span>Selected time</span><strong>{formatConfirmation(selectedSlot.starts_at, selectedSlot.provider_timezone)}</strong></div>}

              {error && <div className="notice error">{error}</div>}

              {!user ? (
                <form className="public-booking-login" onSubmit={signIn}>
                  <div><span className="kicker">Member sign in</span><h3>Sign in to confirm</h3><p>Use the member credentials your provider created for you.</p></div>
                  <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
                  <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
                  <button className="secondary-button" disabled={authBusy}>{authBusy ? 'Signing in…' : 'Sign in'}</button>
                </form>
              ) : (
                <div className="public-booking-member"><span>Signed in as</span><strong>{user.email}</strong><button type="button" className="text-button" onClick={() => { clearSessionToken(); setToken(''); setUser(null) }}>Use another account</button></div>
              )}

              <button type="button" className="primary-button full" disabled={!user || !selectedSlot || bookingBusy} onClick={book}>{bookingBusy ? 'Confirming…' : 'Confirm appointment'}</button>
              <small className="public-booking-policy">The server rechecks availability when you confirm. A displayed time is not reserved until the booking succeeds.</small>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
