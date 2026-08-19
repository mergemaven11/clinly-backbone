import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiRequest } from './api'
import './business.css'

const EMPTY_PROFILE = {
  display_name: '',
  business_name: '',
  provider_type: '',
  headline: '',
  bio: '',
  categories: '',
  pronouns: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  locale: navigator.language || 'en-US',
  public_slug: '',
  is_public: false,
  locations: [],
  credentials: [],
}

const EMPTY_SERVICE = {
  name: '',
  description: '',
  duration_minutes: 60,
  price: '',
  currency: 'USD',
  delivery_mode: 'VIRTUAL',
  capacity: 1,
  location_labels: '',
  intake_required: false,
  is_public: false,
  active: true,
}

function moneyFromMinor(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(value / 100)
  } catch {
    return `${currency} ${(value / 100).toFixed(2)}`
  }
}

function profileToForm(profile) {
  if (!profile) return EMPTY_PROFILE
  return {
    ...EMPTY_PROFILE,
    ...profile,
    categories: profile.categories.join(', '),
    locations: profile.locations || [],
    credentials: profile.credentials || [],
  }
}

function profilePayload(values) {
  return {
    display_name: values.display_name,
    business_name: values.business_name || null,
    provider_type: values.provider_type || null,
    headline: values.headline || null,
    bio: values.bio || null,
    categories: values.categories.split(',').map((value) => value.trim()).filter(Boolean),
    pronouns: values.pronouns || null,
    timezone: values.timezone,
    locale: values.locale,
    public_slug: values.public_slug || null,
    is_public: values.is_public,
    locations: values.locations,
    credentials: values.credentials,
  }
}

function serviceToForm(service) {
  if (!service) return EMPTY_SERVICE
  return {
    ...EMPTY_SERVICE,
    ...service,
    price: (service.price_minor / 100).toFixed(2),
    location_labels: service.location_labels.join(', '),
  }
}

function servicePayload(values) {
  const numericPrice = Number(values.price)
  return {
    name: values.name,
    description: values.description || null,
    duration_minutes: Number(values.duration_minutes),
    price_minor: Math.round(numericPrice * 100),
    currency: values.currency.toUpperCase(),
    delivery_mode: values.delivery_mode,
    capacity: Number(values.capacity),
    location_labels: values.location_labels.split(',').map((value) => value.trim()).filter(Boolean),
    intake_required: values.intake_required,
    is_public: values.is_public,
    active: values.active,
  }
}

function LocationEditor({ locations, onChange }) {
  function update(index, patch) {
    onChange(locations.map((location, itemIndex) => itemIndex === index ? { ...location, ...patch } : location))
  }

  return (
    <div className="business-repeater">
      <div className="business-repeater-heading">
        <span>Service locations</span>
        <button type="button" className="small-button" onClick={() => onChange([...locations, { label: '', kind: 'IN_PERSON', address: '', public: false }])}>+ Location</button>
      </div>
      {locations.map((location, index) => (
        <div className="business-repeater-row" key={`${index}-${location.label}`}>
          <input aria-label="Location label" value={location.label} onChange={(event) => update(index, { label: event.target.value })} placeholder="Studio, Virtual, Downtown…" />
          <select aria-label="Location type" value={location.kind} onChange={(event) => update(index, { kind: event.target.value })}>
            <option value="IN_PERSON">In person</option>
            <option value="VIRTUAL">Virtual</option>
          </select>
          <input aria-label="Location address" value={location.address || ''} onChange={(event) => update(index, { address: event.target.value || null })} placeholder="Address (optional)" />
          <label className="business-check"><input type="checkbox" checked={location.public} onChange={(event) => update(index, { public: event.target.checked })} /> Public</label>
          <button type="button" className="text-button danger-text" onClick={() => onChange(locations.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
        </div>
      ))}
      {!locations.length && <small className="business-hint">No locations added. Virtual-only providers can add a public “Virtual” location if useful.</small>}
    </div>
  )
}

function CredentialEditor({ credentials, onChange }) {
  function update(index, patch) {
    onChange(credentials.map((credential, itemIndex) => itemIndex === index ? { ...credential, ...patch } : credential))
  }

  return (
    <div className="business-repeater">
      <div className="business-repeater-heading">
        <span>Credentials & certifications</span>
        <button type="button" className="small-button" onClick={() => onChange([...credentials, { name: '', issuer: '', reference: '', expires_on: null, public: false }])}>+ Credential</button>
      </div>
      {credentials.map((credential, index) => (
        <div className="business-repeater-row credential-row" key={`${index}-${credential.name}`}>
          <input aria-label="Credential name" value={credential.name} onChange={(event) => update(index, { name: event.target.value })} placeholder="Credential or certification" />
          <input aria-label="Credential issuer" value={credential.issuer || ''} onChange={(event) => update(index, { issuer: event.target.value || null })} placeholder="Issuer" />
          <input aria-label="Credential reference" value={credential.reference || ''} onChange={(event) => update(index, { reference: event.target.value || null })} placeholder="Reference (optional)" />
          <input aria-label="Credential expiration" type="date" value={credential.expires_on || ''} onChange={(event) => update(index, { expires_on: event.target.value || null })} />
          <label className="business-check"><input type="checkbox" checked={credential.public} onChange={(event) => update(index, { public: event.target.checked })} /> Public</label>
          <button type="button" className="text-button danger-text" onClick={() => onChange(credentials.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
        </div>
      ))}
      <small className="business-hint">Credential details are provider-supplied. Only mark a credential public when you want it displayed on your public profile.</small>
    </div>
  )
}

function ServiceCard({ service, onEdit, onArchive }) {
  return (
    <article className="service-card">
      <div className="service-card-top">
        <div>
          <span className="kicker">{service.delivery_mode.replaceAll('_', ' ')}</span>
          <h3>{service.name}</h3>
        </div>
        <span className={service.is_public ? 'business-status public' : 'business-status private'}>{service.is_public ? 'Public' : 'Private'}</span>
      </div>
      {service.description && <p>{service.description}</p>}
      <div className="service-facts">
        <span><strong>{moneyFromMinor(service.price_minor, service.currency)}</strong><small>Price</small></span>
        <span><strong>{service.duration_minutes} min</strong><small>Duration</small></span>
        <span><strong>{service.capacity}</strong><small>Capacity</small></span>
        <span><strong>{service.intake_required ? 'Required' : 'No'}</strong><small>Intake</small></span>
      </div>
      {service.location_labels.length > 0 && <div className="mini-tags">{service.location_labels.map((label) => <span key={label}>{label}</span>)}</div>}
      <div className="service-actions">
        <button type="button" className="secondary-button" onClick={() => onEdit(service)}>Edit</button>
        <button type="button" className="text-button danger-text" onClick={() => onArchive(service)}>Archive</button>
      </div>
    </article>
  )
}

export default function BusinessWorkspace({ token }) {
  const [profile, setProfile] = useState(null)
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE)
  const [services, setServices] = useState([])
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE)
  const [editingServiceId, setEditingServiceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingService, setSavingService] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextProfile, nextServices] = await Promise.all([
        apiRequest('/provider/profile', { token }),
        apiRequest('/provider/services', { token }),
      ])
      setProfile(nextProfile)
      setProfileForm(profileToForm(nextProfile))
      setServices(nextServices)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  function flash(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  async function saveProfile(event) {
    event.preventDefault()
    setSavingProfile(true)
    setError('')
    try {
      const saved = await apiRequest('/provider/profile', {
        token,
        method: 'PUT',
        body: JSON.stringify(profilePayload(profileForm)),
      })
      setProfile(saved)
      setProfileForm(profileToForm(saved))
      flash('Business profile saved.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function saveService(event) {
    event.preventDefault()
    setSavingService(true)
    setError('')
    try {
      const payload = servicePayload(serviceForm)
      if (!Number.isFinite(payload.price_minor) || payload.price_minor < 0) throw new Error('Enter a valid non-negative price.')
      await apiRequest(editingServiceId ? `/provider/services/${editingServiceId}` : '/provider/services', {
        token,
        method: editingServiceId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      setServiceForm(EMPTY_SERVICE)
      setEditingServiceId('')
      await load()
      flash(editingServiceId ? 'Service updated.' : 'Service created.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingService(false)
    }
  }

  async function archiveService(service) {
    setError('')
    try {
      await apiRequest(`/provider/services/${service.id}`, { token, method: 'DELETE' })
      if (editingServiceId === service.id) {
        setEditingServiceId('')
        setServiceForm(EMPTY_SERVICE)
      }
      await load()
      flash(`${service.name} archived.`)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function editService(service) {
    setEditingServiceId(service.id)
    setServiceForm(serviceToForm(service))
    document.getElementById('service-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const publicPath = profile?.is_public && profile.public_slug ? `/p/${profile.public_slug}` : ''
  const publishedServices = useMemo(() => services.filter((service) => service.is_public && service.active).length, [services])

  if (loading) return <div className="empty-state"><div className="spinner" /><p>Loading your business workspace…</p></div>

  return (
    <div className="business-page">
      {notice && <div className="notice success">{notice}</div>}
      {error && <div className="notice error dismissible">{error}<button type="button" onClick={() => setError('')}>×</button></div>}

      <section className="business-hero">
        <div>
          <span className="kicker">Provider business</span>
          <h2>Shape the workspace around the business you actually run.</h2>
          <p>Your identity, services, delivery modes, prices, and public visibility are data — not assumptions baked into the product.</p>
        </div>
        <div className="business-hero-stats">
          <span><strong>{services.length}</strong><small>Services</small></span>
          <span><strong>{publishedServices}</strong><small>Public</small></span>
          <span><strong>{profile?.is_public ? 'Live' : 'Private'}</strong><small>Profile</small></span>
        </div>
      </section>

      <div className="business-layout">
        <form className="business-profile section-card" onSubmit={saveProfile}>
          <div className="section-heading">
            <div><span className="kicker">Identity</span><h3>Business profile</h3><p>Nothing is public unless you turn it on.</p></div>
            {publicPath && <a className="small-button public-profile-link" href={publicPath} target="_blank" rel="noreferrer">View public page ↗</a>}
          </div>

          <div className="form-grid two">
            <label>Display name<input value={profileForm.display_name} onChange={(event) => setProfileForm((current) => ({ ...current, display_name: event.target.value }))} required /></label>
            <label>Business name<input value={profileForm.business_name} onChange={(event) => setProfileForm((current) => ({ ...current, business_name: event.target.value }))} placeholder="Optional business or studio name" /></label>
            <label>Provider type<input value={profileForm.provider_type} onChange={(event) => setProfileForm((current) => ({ ...current, provider_type: event.target.value }))} placeholder="Coach, consultant, esthetician, trainer…" /></label>
            <label>Pronouns<input value={profileForm.pronouns} onChange={(event) => setProfileForm((current) => ({ ...current, pronouns: event.target.value }))} placeholder="Optional" /></label>
          </div>
          <label>Headline<input value={profileForm.headline} onChange={(event) => setProfileForm((current) => ({ ...current, headline: event.target.value }))} placeholder="A short promise or description of your work" /></label>
          <label>Bio<textarea rows="5" value={profileForm.bio} onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Tell people what you do and who you work with." /></label>
          <label>Categories<input value={profileForm.categories} onChange={(event) => setProfileForm((current) => ({ ...current, categories: event.target.value }))} placeholder="Strength, Wellness, Career coaching" /><small>Comma-separated; these become future discovery filters.</small></label>
          <div className="form-grid two">
            <label>Timezone<input value={profileForm.timezone} onChange={(event) => setProfileForm((current) => ({ ...current, timezone: event.target.value }))} placeholder="America/New_York" required /></label>
            <label>Locale<input value={profileForm.locale} onChange={(event) => setProfileForm((current) => ({ ...current, locale: event.target.value }))} placeholder="en-US" required /></label>
          </div>

          <LocationEditor locations={profileForm.locations} onChange={(locations) => setProfileForm((current) => ({ ...current, locations }))} />
          <CredentialEditor credentials={profileForm.credentials} onChange={(credentials) => setProfileForm((current) => ({ ...current, credentials }))} />

          <div className="business-publish-box">
            <label>Public URL slug<input value={profileForm.public_slug} onChange={(event) => setProfileForm((current) => ({ ...current, public_slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="your-business-name" /></label>
            <label className="business-switch"><input type="checkbox" checked={profileForm.is_public} onChange={(event) => setProfileForm((current) => ({ ...current, is_public: event.target.checked }))} /><span><strong>Publish profile</strong><small>Only public locations, credentials, and services are shown.</small></span></label>
          </div>

          <button className="primary-button" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save business profile'}</button>
        </form>

        <div className="business-services">
          <form id="service-editor" className="section-card service-editor" onSubmit={saveService}>
            <div className="section-heading">
              <div><span className="kicker">Catalog</span><h3>{editingServiceId ? 'Edit service' : 'New service'}</h3></div>
              {editingServiceId && <button type="button" className="text-button" onClick={() => { setEditingServiceId(''); setServiceForm(EMPTY_SERVICE) }}>Cancel edit</button>}
            </div>
            <label>Service name<input value={serviceForm.name} onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))} placeholder="Strategy session, training package, consultation…" required /></label>
            <label>Description<textarea rows="3" value={serviceForm.description} onChange={(event) => setServiceForm((current) => ({ ...current, description: event.target.value }))} /></label>
            <div className="form-grid two">
              <label>Duration (minutes)<input type="number" min="5" max="1440" value={serviceForm.duration_minutes} onChange={(event) => setServiceForm((current) => ({ ...current, duration_minutes: event.target.value }))} required /></label>
              <label>Delivery<select value={serviceForm.delivery_mode} onChange={(event) => setServiceForm((current) => ({ ...current, delivery_mode: event.target.value }))}><option value="VIRTUAL">Virtual</option><option value="IN_PERSON">In person</option><option value="HYBRID">Hybrid</option><option value="ASYNC">Async</option></select></label>
              <label>Price<input type="number" min="0" step="0.01" value={serviceForm.price} onChange={(event) => setServiceForm((current) => ({ ...current, price: event.target.value }))} placeholder="75.00" required /></label>
              <label>Currency<input maxLength="3" value={serviceForm.currency} onChange={(event) => setServiceForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} required /></label>
              <label>Capacity<input type="number" min="1" max="500" value={serviceForm.capacity} onChange={(event) => setServiceForm((current) => ({ ...current, capacity: event.target.value }))} required /></label>
              <label>Locations<input value={serviceForm.location_labels} onChange={(event) => setServiceForm((current) => ({ ...current, location_labels: event.target.value }))} placeholder="Virtual, Downtown studio" /></label>
            </div>
            <div className="business-toggle-grid">
              <label className="business-switch"><input type="checkbox" checked={serviceForm.intake_required} onChange={(event) => setServiceForm((current) => ({ ...current, intake_required: event.target.checked }))} /><span><strong>Intake required</strong><small>Hook for forms/intake workflows.</small></span></label>
              <label className="business-switch"><input type="checkbox" checked={serviceForm.is_public} onChange={(event) => setServiceForm((current) => ({ ...current, is_public: event.target.checked }))} /><span><strong>Public service</strong><small>Show on your published profile.</small></span></label>
              <label className="business-switch"><input type="checkbox" checked={serviceForm.active} onChange={(event) => setServiceForm((current) => ({ ...current, active: event.target.checked }))} /><span><strong>Active</strong><small>Available to future booking flows.</small></span></label>
            </div>
            <button className="primary-button" disabled={savingService}>{savingService ? 'Saving…' : editingServiceId ? 'Update service' : 'Create service'}</button>
          </form>

          <section className="service-list">
            {services.map((service) => <ServiceCard key={service.id} service={service} onEdit={editService} onArchive={archiveService} />)}
            {!services.length && <div className="empty section-card"><span className="empty-icon">○</span><strong>No services yet</strong><p>Create the first offer your business can schedule and sell.</p></div>}
          </section>
        </div>
      </div>
    </div>
  )
}
