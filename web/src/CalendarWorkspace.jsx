import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiRequest } from './api'
import './calendar.css'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DEFAULT_POLICY = {
  slot_interval_minutes: 15,
  minimum_notice_minutes: 120,
  booking_horizon_days: 60,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  cancellation_notice_minutes: 0,
  participant_reschedule_enabled: true,
  participant_cancel_enabled: true,
}

const DEFAULT_SCHEDULE = {
  policy: DEFAULT_POLICY,
  weekly_rules: [],
  exceptions: [],
}

function localDateInput(daysAhead = 1) {
  const value = new Date(Date.now() + daysAhead * 86_400_000)
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function formatBookingDate(value, timeZone) {
  const date = new Date(value)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(date)
}

function formatSlot(value, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(value))
}

function money(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value / 100)
  } catch {
    return `${currency} ${(value / 100).toFixed(2)}`
  }
}

function statusClass(status) {
  return `calendar-status status-${status.toLowerCase()}`
}

function ScheduleEditor({ schedule, services, onChange, onSave, saving }) {
  const updatePolicy = (name, value) => {
    onChange({ ...schedule, policy: { ...schedule.policy, [name]: value } })
  }

  const updateRule = (index, patch) => {
    onChange({
      ...schedule,
      weekly_rules: schedule.weekly_rules.map((rule, itemIndex) => itemIndex === index ? { ...rule, ...patch } : rule),
    })
  }

  const updateException = (index, patch) => {
    onChange({
      ...schedule,
      exceptions: schedule.exceptions.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    })
  }

  return (
    <div className="calendar-settings-stack">
      <section className="section-card calendar-policy-card">
        <div className="section-heading">
          <div><span className="kicker">Booking policy</span><h3>How your calendar behaves</h3></div>
        </div>
        <div className="calendar-policy-grid">
          <label>Slot interval<input type="number" min="5" max="120" value={schedule.policy.slot_interval_minutes} onChange={(event) => updatePolicy('slot_interval_minutes', Number(event.target.value))} /><small>minutes</small></label>
          <label>Minimum notice<input type="number" min="0" value={schedule.policy.minimum_notice_minutes} onChange={(event) => updatePolicy('minimum_notice_minutes', Number(event.target.value))} /><small>minutes</small></label>
          <label>Booking horizon<input type="number" min="1" max="365" value={schedule.policy.booking_horizon_days} onChange={(event) => updatePolicy('booking_horizon_days', Number(event.target.value))} /><small>days</small></label>
          <label>Buffer before<input type="number" min="0" max="240" value={schedule.policy.buffer_before_minutes} onChange={(event) => updatePolicy('buffer_before_minutes', Number(event.target.value))} /><small>minutes</small></label>
          <label>Buffer after<input type="number" min="0" max="240" value={schedule.policy.buffer_after_minutes} onChange={(event) => updatePolicy('buffer_after_minutes', Number(event.target.value))} /><small>minutes</small></label>
          <label>Cancel notice<input type="number" min="0" value={schedule.policy.cancellation_notice_minutes} onChange={(event) => updatePolicy('cancellation_notice_minutes', Number(event.target.value))} /><small>minutes</small></label>
        </div>
        <div className="calendar-policy-toggles">
          <label><input type="checkbox" checked={schedule.policy.participant_reschedule_enabled} onChange={(event) => updatePolicy('participant_reschedule_enabled', event.target.checked)} /><span><strong>Member rescheduling</strong><small>Allow members to move confirmed appointments.</small></span></label>
          <label><input type="checkbox" checked={schedule.policy.participant_cancel_enabled} onChange={(event) => updatePolicy('participant_cancel_enabled', event.target.checked)} /><span><strong>Member cancellation</strong><small>Allow members to release booked time.</small></span></label>
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div><span className="kicker">Recurring availability</span><h3>Weekly hours</h3><p>Rules use the timezone from your Business profile.</p></div>
          <button type="button" className="small-button" onClick={() => onChange({ ...schedule, weekly_rules: [...schedule.weekly_rules, { weekday: 0, start_local: '09:00', end_local: '17:00', service_ids: [] }] })}>+ Hours</button>
        </div>
        <div className="calendar-rule-list">
          {schedule.weekly_rules.map((rule, index) => (
            <div className="calendar-rule-row" key={`${index}-${rule.weekday}`}>
              <select value={rule.weekday} aria-label="Weekday" onChange={(event) => updateRule(index, { weekday: Number(event.target.value) })}>{WEEKDAYS.map((day, value) => <option value={value} key={day}>{day}</option>)}</select>
              <input type="time" aria-label="Start time" value={String(rule.start_local).slice(0, 5)} onChange={(event) => updateRule(index, { start_local: event.target.value })} />
              <span>to</span>
              <input type="time" aria-label="End time" value={String(rule.end_local).slice(0, 5)} onChange={(event) => updateRule(index, { end_local: event.target.value })} />
              <select aria-label="Service restriction" value={rule.service_ids[0] || ''} onChange={(event) => updateRule(index, { service_ids: event.target.value ? [event.target.value] : [] })}>
                <option value="">All 1:1 services</option>
                {services.map((service) => <option value={service.id} key={service.id}>{service.name}</option>)}
              </select>
              <button type="button" className="text-button danger-text" onClick={() => onChange({ ...schedule, weekly_rules: schedule.weekly_rules.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>
            </div>
          ))}
          {!schedule.weekly_rules.length && <div className="calendar-inline-empty">No weekly hours yet. Add your first availability window.</div>}
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div><span className="kicker">Exceptions</span><h3>Time off & special hours</h3></div>
          <button type="button" className="small-button" onClick={() => onChange({ ...schedule, exceptions: [...schedule.exceptions, { date_local: localDateInput(7), kind: 'UNAVAILABLE', start_local: null, end_local: null, service_ids: [] }] })}>+ Exception</button>
        </div>
        <div className="calendar-rule-list">
          {schedule.exceptions.map((exception, index) => (
            <div className="calendar-exception-row" key={`${index}-${exception.date_local}`}>
              <input type="date" aria-label="Exception date" value={exception.date_local} onChange={(event) => updateException(index, { date_local: event.target.value })} />
              <select aria-label="Exception type" value={exception.kind} onChange={(event) => {
                const kind = event.target.value
                updateException(index, kind === 'AVAILABLE' ? { kind, start_local: exception.start_local || '09:00', end_local: exception.end_local || '17:00' } : { kind })
              }}><option value="UNAVAILABLE">Unavailable</option><option value="AVAILABLE">Special hours</option></select>
              <input type="time" aria-label="Exception start" disabled={exception.kind === 'UNAVAILABLE' && !exception.start_local} value={exception.start_local ? String(exception.start_local).slice(0, 5) : ''} onChange={(event) => updateException(index, { start_local: event.target.value || null })} />
              <input type="time" aria-label="Exception end" disabled={exception.kind === 'UNAVAILABLE' && !exception.end_local} value={exception.end_local ? String(exception.end_local).slice(0, 5) : ''} onChange={(event) => updateException(index, { end_local: event.target.value || null })} />
              <select aria-label="Exception service" value={exception.service_ids[0] || ''} onChange={(event) => updateException(index, { service_ids: event.target.value ? [event.target.value] : [] })}><option value="">All services</option>{services.map((service) => <option value={service.id} key={service.id}>{service.name}</option>)}</select>
              <button type="button" className="text-button danger-text" onClick={() => onChange({ ...schedule, exceptions: schedule.exceptions.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>
            </div>
          ))}
          {!schedule.exceptions.length && <div className="calendar-inline-empty">No date-specific exceptions.</div>}
        </div>
        <div className="calendar-exception-tip">For a full unavailable day, leave the time fields empty. Use Special hours to add a one-off window.</div>
      </section>

      <button type="button" className="primary-button calendar-save" onClick={onSave} disabled={saving}>{saving ? 'Saving schedule…' : 'Save availability'}</button>
    </div>
  )
}

function SlotPicker({ token, serviceId, date, onSelect, selectedStart, excludeGroup = true }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    apiRequest(`/availability?${new URLSearchParams({ service_id: serviceId, date_from: date, date_to: date })}`, { token })
      .then((data) => { if (!cancelled) setSlots(data.slots) })
      .catch((requestError) => { if (!cancelled) setError(requestError.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, serviceId, date, excludeGroup])

  if (!serviceId) return <div className="calendar-slot-empty">Choose a service first.</div>
  if (loading) return <div className="calendar-slot-empty"><span className="mini-spinner" /> Loading open times…</div>
  if (error) return <div className="notice error">{error}</div>
  if (!slots.length) return <div className="calendar-slot-empty">No open times on this date.</div>

  return (
    <div className="calendar-slot-grid">
      {slots.map((slot) => (
        <button type="button" key={slot.starts_at} className={selectedStart === slot.starts_at ? 'calendar-slot selected' : 'calendar-slot'} onClick={() => onSelect(slot)}>
          {formatSlot(slot.starts_at, slot.provider_timezone)}
        </button>
      ))}
    </div>
  )
}

function BookingComposer({ token, isProvider, people, services, onCreated }) {
  const singleServices = services.filter((service) => service.capacity === 1)
  const [serviceId, setServiceId] = useState(singleServices[0]?.id || '')
  const [participantId, setParticipantId] = useState(people[0]?.id || '')
  const [date, setDate] = useState(localDateInput())
  const [slot, setSlot] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!serviceId && singleServices[0]?.id) setServiceId(singleServices[0].id)
  }, [serviceId, singleServices])

  useEffect(() => {
    if (!participantId && people[0]?.id) setParticipantId(people[0].id)
  }, [participantId, people])

  async function book() {
    if (!slot) return
    setBusy(true)
    setError('')
    try {
      await apiRequest('/bookings', {
        token,
        method: 'POST',
        body: JSON.stringify({
          service_id: serviceId,
          starts_at: slot.starts_at,
          ...(isProvider ? { participant_id: participantId } : {}),
        }),
      })
      setSlot(null)
      await onCreated()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section-card calendar-book-card">
      <div className="section-heading">
        <div><span className="kicker">New appointment</span><h3>{isProvider ? 'Book for someone' : 'Book a service'}</h3></div>
      </div>
      {!singleServices.length ? (
        <div className="calendar-inline-empty">No 1:1 services are available to book yet. Group-capacity scheduling is a separate expansion.</div>
      ) : (
        <>
          <div className="calendar-book-controls">
            <label>Service<select value={serviceId} onChange={(event) => { setServiceId(event.target.value); setSlot(null) }}>{singleServices.map((service) => <option value={service.id} key={service.id}>{service.name} · {money(service.price_minor, service.currency)}</option>)}</select></label>
            {isProvider && <label>Person<select value={participantId} onChange={(event) => setParticipantId(event.target.value)}><option value="">Choose person</option>{people.map((person) => <option value={person.id} key={person.id}>{person.email}</option>)}</select></label>}
            <label>Date<input type="date" value={date} min={localDateInput(0)} onChange={(event) => { setDate(event.target.value); setSlot(null) }} /></label>
          </div>
          <SlotPicker token={token} serviceId={serviceId} date={date} selectedStart={slot?.starts_at} onSelect={setSlot} />
          {slot && <div className="calendar-selected-slot"><span>Selected</span><strong>{formatBookingDate(slot.starts_at, slot.provider_timezone)}</strong></div>}
          {error && <div className="notice error">{error}</div>}
          <button type="button" className="primary-button" disabled={busy || !slot || (isProvider && !participantId)} onClick={book}>{busy ? 'Booking…' : 'Confirm appointment'}</button>
        </>
      )}
      {services.some((service) => service.capacity > 1) && <small className="calendar-group-note">Group-capacity services are visible in your Business catalog but intentionally excluded from this 1:1 booking engine until group sessions land.</small>}
    </section>
  )
}

function BookingCard({ booking, token, isProvider, people, onChanged }) {
  const [showMove, setShowMove] = useState(false)
  const [moveDate, setMoveDate] = useState(localDateInput(1))
  const [moveSlot, setMoveSlot] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const person = people.find((item) => item.id === booking.participant_user_id)
  const canTransition = new Date(booking.starts_at).getTime() <= Date.now()

  async function action(path, options = {}) {
    setBusy(true)
    setError('')
    try {
      await apiRequest(path, { token, ...options })
      await onChanged()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function reschedule() {
    if (!moveSlot) return
    await action(`/bookings/${booking.id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ starts_at: moveSlot.starts_at }),
    })
    setShowMove(false)
    setMoveSlot(null)
  }

  return (
    <article className="calendar-booking-card">
      <div className="calendar-booking-head">
        <div>
          <span className="kicker">{isProvider ? person?.email || 'Member' : booking.provider_display_name || 'Provider'}</span>
          <h3>{booking.service_name}</h3>
        </div>
        <span className={statusClass(booking.status)}>{booking.status.replaceAll('_', ' ')}</span>
      </div>
      <div className="calendar-booking-time"><strong>{formatBookingDate(booking.starts_at, booking.provider_timezone)}</strong><span>to {formatSlot(booking.ends_at, booking.provider_timezone)}</span></div>

      {booking.status === 'CONFIRMED' && (
        <div className="calendar-booking-actions">
          <button type="button" className="secondary-button" disabled={busy} onClick={() => setShowMove((value) => !value)}>{showMove ? 'Close reschedule' : 'Reschedule'}</button>
          <button type="button" className="text-button danger-text" disabled={busy} onClick={() => action(`/bookings/${booking.id}/cancel`, { method: 'POST' })}>Cancel</button>
          {isProvider && canTransition && <><button type="button" className="text-button" disabled={busy} onClick={() => action(`/bookings/${booking.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) })}>Complete</button><button type="button" className="text-button" disabled={busy} onClick={() => action(`/bookings/${booking.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'NO_SHOW' }) })}>No-show</button></>}
        </div>
      )}

      {showMove && booking.status === 'CONFIRMED' && (
        <div className="calendar-reschedule-panel">
          <label>New date<input type="date" min={localDateInput(0)} value={moveDate} onChange={(event) => { setMoveDate(event.target.value); setMoveSlot(null) }} /></label>
          <SlotPicker token={token} serviceId={booking.service_id} date={moveDate} selectedStart={moveSlot?.starts_at} onSelect={setMoveSlot} />
          <button type="button" className="primary-button" disabled={busy || !moveSlot} onClick={reschedule}>Move appointment</button>
        </div>
      )}
      {error && <div className="notice error">{error}</div>}
    </article>
  )
}

export default function CalendarWorkspace({ token, isProvider, people }) {
  const [services, setServices] = useState([])
  const [bookings, setBookings] = useState([])
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE)
  const [scheduleTimezone, setScheduleTimezone] = useState('UTC')
  const [tab, setTab] = useState('appointments')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadBookings = useCallback(async () => {
    const data = await apiRequest('/bookings/me', { token })
    setBookings(data)
  }, [token])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const requests = [apiRequest('/booking-services', { token }), apiRequest('/bookings/me', { token })]
      if (isProvider) requests.push(apiRequest('/provider/schedule', { token }))
      const [nextServices, nextBookings, nextSchedule = null] = await Promise.all(requests)
      setServices(nextServices)
      setBookings(nextBookings)
      if (isProvider && nextSchedule) {
        setSchedule({ policy: nextSchedule.policy, weekly_rules: nextSchedule.weekly_rules, exceptions: nextSchedule.exceptions })
        setScheduleTimezone(nextSchedule.timezone)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [token, isProvider])

  useEffect(() => { load() }, [load])

  function flash(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  async function saveSchedule() {
    setSaving(true)
    setError('')
    try {
      const saved = await apiRequest('/provider/schedule', {
        token,
        method: 'PUT',
        body: JSON.stringify(schedule),
      })
      setSchedule({ policy: saved.policy, weekly_rules: saved.weekly_rules, exceptions: saved.exceptions })
      setScheduleTimezone(saved.timezone)
      flash('Availability saved.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const upcoming = useMemo(() => bookings.filter((booking) => booking.status === 'CONFIRMED' && new Date(booking.ends_at).getTime() >= Date.now()), [bookings])
  const completed = useMemo(() => bookings.filter((booking) => ['COMPLETED', 'NO_SHOW'].includes(booking.status)).length, [bookings])

  if (loading) return <div className="empty-state"><div className="spinner" /><p>Loading calendar…</p></div>

  return (
    <div className="calendar-page">
      {notice && <div className="notice success">{notice}</div>}
      {error && <div className="notice error dismissible">{error}<button type="button" onClick={() => setError('')}>×</button></div>}

      <section className="calendar-hero">
        <div><span className="kicker">{isProvider ? 'Provider schedule' : 'Appointments'}</span><h2>{isProvider ? 'Turn your service catalog into real bookable time.' : 'Book, move, and keep track of your appointments.'}</h2><p>{isProvider ? `Availability is interpreted in ${scheduleTimezone}. Buffers and service duration are part of the conflict check.` : 'Available times come directly from your provider’s schedule and service duration.'}</p></div>
        <div className="calendar-hero-metrics"><span><strong>{upcoming.length}</strong><small>Upcoming</small></span><span><strong>{bookings.length}</strong><small>Total</small></span>{isProvider && <span><strong>{completed}</strong><small>Closed</small></span>}</div>
      </section>

      {isProvider && <div className="calendar-tabs"><button type="button" className={tab === 'appointments' ? 'active' : ''} onClick={() => setTab('appointments')}>Appointments</button><button type="button" className={tab === 'availability' ? 'active' : ''} onClick={() => setTab('availability')}>Availability</button></div>}

      {(!isProvider || tab === 'appointments') && (
        <div className="calendar-appointments-layout">
          <BookingComposer token={token} isProvider={isProvider} people={people} services={services} onCreated={async () => { await loadBookings(); flash('Appointment booked.') }} />
          <section className="calendar-booking-list">
            <div className="section-heading"><div><span className="kicker">Your calendar</span><h3>{upcoming.length ? 'Appointments' : 'No upcoming appointments'}</h3></div><button type="button" className="small-button" onClick={loadBookings}>Refresh</button></div>
            {bookings.map((booking) => <BookingCard key={booking.id} booking={booking} token={token} isProvider={isProvider} people={people} onChanged={async () => { await loadBookings(); flash('Calendar updated.') }} />)}
            {!bookings.length && <div className="empty section-card"><span className="empty-icon">○</span><strong>Your calendar is clear</strong><p>Book an available service to create the first appointment.</p></div>}
          </section>
        </div>
      )}

      {isProvider && tab === 'availability' && <ScheduleEditor schedule={schedule} services={services} onChange={setSchedule} onSave={saveSchedule} saving={saving} />}
    </div>
  )
}
