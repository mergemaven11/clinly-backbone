import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiRequest } from './api'
import './business.css'
import './provider-business-workspace.css'

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

const EMPTY_LOCATION = { label: '', kind: 'IN_PERSON', address: '', public: false }
const EMPTY_CREDENTIAL = { name: '', issuer: '', reference: '', expires_on: null, public: false }

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
  if (!profile) return { ...EMPTY_PROFILE }
  return {
    ...EMPTY_PROFILE,
    ...profile,
    categories: (profile.categories || []).join(', '),
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
  if (!service) return { ...EMPTY_SERVICE }
  return {
    ...EMPTY_SERVICE,
    ...service,
    price: (service.price_minor / 100).toFixed(2),
    location_labels: (service.location_labels || []).join(', '),
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

function deliveryLabel(mode) {
  return mode.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function serviceStatus(service) {
  if (!service.active) return { label: 'Archived', tone: 'muted' }
  return service.is_public ? { label: 'Public', tone: 'public' } : { label: 'Private', tone: 'private' }
}

function locationMeta(location) {
  const kind = location.kind === 'VIRTUAL' ? 'Virtual' : 'In person'
  return [kind, location.address].filter(Boolean).join(' · ')
}

function credentialMeta(credential) {
  const details = []
  if (credential.issuer) details.push(credential.issuer)
  if (credential.expires_on) details.push(`Expires ${credential.expires_on}`)
  return details.join(' · ') || 'Provider-supplied credential'
}

function Drawer({ open, eyebrow, title, onClose, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="business-drawer-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <aside className={`business-drawer${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="business-drawer-header">
          <div>
            <span className="business-eyebrow">{eyebrow}</span>
            <h3>{title}</h3>
          </div>
          <button type="button" className="business-icon-button" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="business-drawer-body">{children}</div>
      </aside>
    </div>
  )
}

function SectionHeading({ title, description, action }) {
  return (
    <div className="business-section-heading">
      <div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}

function StatusPill({ label, tone }) {
  return <span className={`business-status-pill ${tone}`}>{label}</span>
}

function PublicProfilePreview({ profile, services }) {
  const publicServices = services.filter((service) => service.active && service.is_public)
  const publicLocations = (profile?.locations || []).filter((location) => location.public)
  const publicCredentials = (profile?.credentials || []).filter((credential) => credential.public)
  const categories = profile?.categories || []
  const displayName = profile?.business_name || profile?.display_name || 'Your business'

  return (
    <div className="business-public-preview">
      <div className="business-public-preview-top">
        <div className="business-preview-avatar">{displayName.trim().charAt(0).toUpperCase() || 'C'}</div>
        <div>
          <span className="business-eyebrow">Public profile preview</span>
          <h4>{displayName}</h4>
          <p>{profile?.headline || 'Add a headline to tell people what you do.'}</p>
        </div>
      </div>
      {categories.length > 0 && <div className="business-chip-row">{categories.slice(0, 4).map((category) => <span key={category}>{category}</span>)}</div>}
      <div className="business-preview-stats">
        <span><strong>{publicServices.length}</strong><small>Services</small></span>
        <span><strong>{publicLocations.length}</strong><small>Locations</small></span>
        <span><strong>{publicCredentials.length}</strong><small>Credentials</small></span>
      </div>
      {profile?.bio && <p className="business-preview-bio">{profile.bio}</p>}
      <small className="business-preview-note">Only items marked Public are represented here.</small>
    </div>
  )
}

export default function BusinessWorkspace({ token }) {
  const [profile, setProfile] = useState(null)
  const [profileForm, setProfileForm] = useState({ ...EMPTY_PROFILE })
  const [services, setServices] = useState([])
  const [serviceForm, setServiceForm] = useState({ ...EMPTY_SERVICE })
  const [editingServiceId, setEditingServiceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingService, setSavingService] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [profileEditorOpen, setProfileEditorOpen] = useState(false)
  const [serviceEditorOpen, setServiceEditorOpen] = useState(false)
  const [locationEditorOpen, setLocationEditorOpen] = useState(false)
  const [credentialEditorOpen, setCredentialEditorOpen] = useState(false)
  const [publishingEditorOpen, setPublishingEditorOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const [locationDraft, setLocationDraft] = useState({ ...EMPTY_LOCATION })
  const [editingLocationIndex, setEditingLocationIndex] = useState(-1)
  const [credentialDraft, setCredentialDraft] = useState({ ...EMPTY_CREDENTIAL })
  const [editingCredentialIndex, setEditingCredentialIndex] = useState(-1)

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

  async function persistProfile(values, successMessage) {
    setSavingProfile(true)
    setError('')
    try {
      const saved = await apiRequest('/provider/profile', {
        token,
        method: 'PUT',
        body: JSON.stringify(profilePayload(values)),
      })
      setProfile(saved)
      setProfileForm(profileToForm(saved))
      flash(successMessage)
      return saved
    } catch (requestError) {
      setError(requestError.message)
      return null
    } finally {
      setSavingProfile(false)
    }
  }

  async function saveProfile(event) {
    event.preventDefault()
    const saved = await persistProfile(profileForm, 'Business profile saved.')
    if (saved) setProfileEditorOpen(false)
  }

  async function savePublishing(event) {
    event.preventDefault()
    const saved = await persistProfile(profileForm, profileForm.is_public ? 'Public profile settings saved.' : 'Profile visibility updated.')
    if (saved) setPublishingEditorOpen(false)
  }

  async function saveService(event) {
    event.preventDefault()
    setSavingService(true)
    setError('')
    try {
      const payload = servicePayload(serviceForm)
      if (!Number.isFinite(payload.price_minor) || payload.price_minor < 0) throw new Error('Enter a valid non-negative price.')
      const wasEditing = Boolean(editingServiceId)
      await apiRequest(wasEditing ? `/provider/services/${editingServiceId}` : '/provider/services', {
        token,
        method: wasEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      setServiceForm({ ...EMPTY_SERVICE })
      setEditingServiceId('')
      setServiceEditorOpen(false)
      await load()
      flash(wasEditing ? 'Service updated.' : 'Service created.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSavingService(false)
    }
  }

  async function archiveService(service) {
    if (!window.confirm(`Archive “${service.name}”?`)) return
    setError('')
    try {
      await apiRequest(`/provider/services/${service.id}`, { token, method: 'DELETE' })
      if (editingServiceId === service.id) {
        setEditingServiceId('')
        setServiceForm({ ...EMPTY_SERVICE })
        setServiceEditorOpen(false)
      }
      await load()
      flash(`${service.name} archived.`)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function openNewService() {
    setEditingServiceId('')
    setServiceForm({ ...EMPTY_SERVICE })
    setServiceEditorOpen(true)
  }

  function editService(service) {
    setEditingServiceId(service.id)
    setServiceForm(serviceToForm(service))
    setServiceEditorOpen(true)
  }

  function openProfileEditor() {
    setProfileForm(profileToForm(profile))
    setProfileEditorOpen(true)
  }

  function openPublishingEditor() {
    setProfileForm(profileToForm(profile))
    setPublishingEditorOpen(true)
  }

  function openLocationEditor(index = -1) {
    setEditingLocationIndex(index)
    setLocationDraft(index >= 0 ? { ...profile.locations[index] } : { ...EMPTY_LOCATION })
    setLocationEditorOpen(true)
  }

  async function saveLocation(event) {
    event.preventDefault()
    const values = profileToForm(profile)
    const nextLocations = [...values.locations]
    if (editingLocationIndex >= 0) nextLocations[editingLocationIndex] = locationDraft
    else nextLocations.push(locationDraft)
    values.locations = nextLocations
    const saved = await persistProfile(values, editingLocationIndex >= 0 ? 'Location updated.' : 'Location added.')
    if (saved) setLocationEditorOpen(false)
  }

  async function removeLocation(index) {
    const location = profile.locations[index]
    if (!window.confirm(`Remove “${location.label || 'this location'}”?`)) return
    const values = profileToForm(profile)
    values.locations = values.locations.filter((_, itemIndex) => itemIndex !== index)
    await persistProfile(values, 'Location removed.')
  }

  function openCredentialEditor(index = -1) {
    setEditingCredentialIndex(index)
    setCredentialDraft(index >= 0 ? { ...profile.credentials[index] } : { ...EMPTY_CREDENTIAL })
    setCredentialEditorOpen(true)
  }

  async function saveCredential(event) {
    event.preventDefault()
    const values = profileToForm(profile)
    const nextCredentials = [...values.credentials]
    if (editingCredentialIndex >= 0) nextCredentials[editingCredentialIndex] = credentialDraft
    else nextCredentials.push(credentialDraft)
    values.credentials = nextCredentials
    const saved = await persistProfile(values, editingCredentialIndex >= 0 ? 'Credential updated.' : 'Credential added.')
    if (saved) setCredentialEditorOpen(false)
  }

  async function removeCredential(index) {
    const credential = profile.credentials[index]
    if (!window.confirm(`Remove “${credential.name || 'this credential'}”?`)) return
    const values = profileToForm(profile)
    values.credentials = values.credentials.filter((_, itemIndex) => itemIndex !== index)
    await persistProfile(values, 'Credential removed.')
  }

  const publicPath = profile?.public_slug ? `/p/${profile.public_slug}` : ''
  const publishedServices = useMemo(() => services.filter((service) => service.is_public && service.active).length, [services])
  const publicLocations = useMemo(() => (profile?.locations || []).filter((location) => location.public).length, [profile])
  const publicCredentials = useMemo(() => (profile?.credentials || []).filter((credential) => credential.public).length, [profile])

  if (loading) return <div className="empty-state"><div className="spinner" /><p>Loading your business workspace…</p></div>

  return (
    <div className="business-page business-workspace-v3">
      {notice && <div className="notice success">{notice}</div>}
      {error && <div className="notice error dismissible">{error}<button type="button" onClick={() => setError('')}>×</button></div>}

      <header className="business-page-header">
        <div>
          <span className="business-eyebrow">Provider workspace</span>
          <h2>Business</h2>
          <p>Manage how your business appears and what you offer.</p>
        </div>
        <div className="business-page-summary" aria-label="Business summary">
          <span><strong>{services.length}</strong><small>Services</small></span>
          <span><strong>{publishedServices}</strong><small>Public</small></span>
          <span><strong>{profile?.is_public ? 'Live' : 'Private'}</strong><small>Profile</small></span>
        </div>
      </header>

      <section className="business-section-card">
        <SectionHeading
          title="Business Profile"
          description="Your core business identity, description, categories, and regional settings."
          action={<button type="button" className="business-button secondary" onClick={openProfileEditor}>Edit profile</button>}
        />
        <div className="business-profile-summary">
          <div className="business-profile-mark">{(profile?.business_name || profile?.display_name || 'C').trim().charAt(0).toUpperCase()}</div>
          <div className="business-profile-copy">
            <div className="business-profile-title-row">
              <h4>{profile?.business_name || profile?.display_name}</h4>
              {profile?.provider_type && <span>{profile.provider_type}</span>}
            </div>
            {profile?.headline && <strong>{profile.headline}</strong>}
            <p>{profile?.bio || 'Add a short bio so clients and patients know what you do and who you work with.'}</p>
            {(profile?.categories || []).length > 0 && <div className="business-chip-row">{profile.categories.map((category) => <span key={category}>{category}</span>)}</div>}
          </div>
        </div>
      </section>

      <section className="business-section-card">
        <SectionHeading
          title="Services"
          description="What clients or patients can book, buy, or request from you."
          action={<button type="button" className="business-button primary" onClick={openNewService}>+ New service</button>}
        />

        {services.length > 0 ? (
          <div className="business-table-wrap">
            <table className="business-services-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Delivery</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {services.map((service) => {
                  const status = serviceStatus(service)
                  return (
                    <tr key={service.id}>
                      <td data-label="Service">
                        <div className="business-service-name">
                          <strong>{service.name}</strong>
                          {service.description && <small>{service.description}</small>}
                        </div>
                      </td>
                      <td data-label="Delivery">{deliveryLabel(service.delivery_mode)}</td>
                      <td data-label="Price"><strong>{moneyFromMinor(service.price_minor, service.currency)}</strong></td>
                      <td data-label="Duration">{service.duration_minutes} min</td>
                      <td data-label="Status"><StatusPill label={status.label} tone={status.tone} /></td>
                      <td data-label="Actions">
                        <div className="business-row-actions">
                          <button type="button" onClick={() => editService(service)}>Edit</button>
                          {service.active && <button type="button" className="danger" onClick={() => archiveService(service)}>Archive</button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="business-empty-state">
            <strong>No services yet</strong>
            <p>Create your first service without turning this page into a giant form.</p>
            <button type="button" className="business-button secondary" onClick={openNewService}>Create service</button>
          </div>
        )}
      </section>

      <div className="business-two-column-sections">
        <section className="business-section-card">
          <SectionHeading
            title="Locations"
            description="Places where you deliver services."
            action={<button type="button" className="business-button secondary" onClick={() => openLocationEditor()}>+ Add location</button>}
          />
          <div className="business-simple-list">
            {(profile?.locations || []).map((location, index) => (
              <article key={`${location.label}-${index}`} className="business-list-item">
                <div>
                  <div className="business-list-title-row">
                    <strong>{location.label || 'Untitled location'}</strong>
                    <StatusPill label={location.public ? 'Public' : 'Private'} tone={location.public ? 'public' : 'private'} />
                  </div>
                  <p>{locationMeta(location)}</p>
                </div>
                <div className="business-row-actions">
                  <button type="button" onClick={() => openLocationEditor(index)}>Edit</button>
                  <button type="button" className="danger" onClick={() => removeLocation(index)}>Remove</button>
                </div>
              </article>
            ))}
            {!profile?.locations?.length && <div className="business-inline-empty">No locations added yet.</div>}
          </div>
        </section>

        <section className="business-section-card">
          <SectionHeading
            title="Credentials"
            description="Licenses, certifications, and professional credentials you choose to show."
            action={<button type="button" className="business-button secondary" onClick={() => openCredentialEditor()}>+ Add credential</button>}
          />
          <div className="business-simple-list">
            {(profile?.credentials || []).map((credential, index) => (
              <article key={`${credential.name}-${index}`} className="business-list-item">
                <div>
                  <div className="business-list-title-row">
                    <strong>{credential.name || 'Untitled credential'}</strong>
                    <StatusPill label={credential.public ? 'Public' : 'Private'} tone={credential.public ? 'public' : 'private'} />
                  </div>
                  <p>{credentialMeta(credential)}</p>
                </div>
                <div className="business-row-actions">
                  <button type="button" onClick={() => openCredentialEditor(index)}>Edit</button>
                  <button type="button" className="danger" onClick={() => removeCredential(index)}>Remove</button>
                </div>
              </article>
            ))}
            {!profile?.credentials?.length && <div className="business-inline-empty">No credentials added yet.</div>}
          </div>
        </section>
      </div>

      <section className="business-section-card business-public-section">
        <div className="business-public-controls">
          <SectionHeading
            title="Public Profile"
            description="Control what clients and patients see before they contact or book with you."
          />
          <div className="business-public-status-card">
            <div>
              <span className="business-eyebrow">Profile status</span>
              <div className="business-public-status-line">
                <StatusPill label={profile?.is_public ? 'Live' : 'Private'} tone={profile?.is_public ? 'public' : 'private'} />
                <strong>{publicPath || 'No public URL set'}</strong>
              </div>
              <small>{publishedServices} public services · {publicLocations} public locations · {publicCredentials} public credentials</small>
            </div>
            <div className="business-public-actions">
              <button type="button" className="business-button secondary" onClick={() => setPreviewOpen(true)}>Preview profile</button>
              <button type="button" className="business-button primary" onClick={openPublishingEditor}>Publishing settings</button>
            </div>
          </div>
        </div>
        <PublicProfilePreview profile={profile} services={services} />
      </section>

      <Drawer open={profileEditorOpen} eyebrow="Business profile" title="Edit profile" onClose={() => setProfileEditorOpen(false)} wide>
        <form className="business-editor-form" onSubmit={saveProfile}>
          <div className="business-form-grid two">
            <label>Display name<input value={profileForm.display_name} onChange={(event) => setProfileForm((current) => ({ ...current, display_name: event.target.value }))} required /></label>
            <label>Business name<input value={profileForm.business_name} onChange={(event) => setProfileForm((current) => ({ ...current, business_name: event.target.value }))} placeholder="Optional business or studio name" /></label>
            <label>Provider type<input value={profileForm.provider_type} onChange={(event) => setProfileForm((current) => ({ ...current, provider_type: event.target.value }))} placeholder="Coach, therapist, trainer, consultant…" /></label>
            <label>Pronouns<input value={profileForm.pronouns} onChange={(event) => setProfileForm((current) => ({ ...current, pronouns: event.target.value }))} placeholder="Optional" /></label>
          </div>
          <label>Headline<input value={profileForm.headline} onChange={(event) => setProfileForm((current) => ({ ...current, headline: event.target.value }))} placeholder="A short description of your work" /></label>
          <label>Bio<textarea rows="6" value={profileForm.bio} onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Tell people what you do and who you work with." /></label>
          <label>Categories<input value={profileForm.categories} onChange={(event) => setProfileForm((current) => ({ ...current, categories: event.target.value }))} placeholder="Strength, wellness, career coaching" /><small>Comma-separated.</small></label>
          <div className="business-form-grid two">
            <label>Timezone<input value={profileForm.timezone} onChange={(event) => setProfileForm((current) => ({ ...current, timezone: event.target.value }))} placeholder="America/New_York" required /></label>
            <label>Locale<input value={profileForm.locale} onChange={(event) => setProfileForm((current) => ({ ...current, locale: event.target.value }))} placeholder="en-US" required /></label>
          </div>
          <div className="business-editor-footer">
            <button type="button" className="business-button secondary" onClick={() => setProfileEditorOpen(false)}>Cancel</button>
            <button className="business-button primary" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button>
          </div>
        </form>
      </Drawer>

      <Drawer open={serviceEditorOpen} eyebrow="Services" title={editingServiceId ? 'Edit service' : 'New service'} onClose={() => setServiceEditorOpen(false)} wide>
        <form className="business-editor-form" onSubmit={saveService}>
          <label>Service name<input value={serviceForm.name} onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))} placeholder="Progress planning session" required /></label>
          <label>Description<textarea rows="4" value={serviceForm.description} onChange={(event) => setServiceForm((current) => ({ ...current, description: event.target.value }))} placeholder="What is included and who is this for?" /></label>
          <div className="business-form-grid two">
            <label>Delivery<select value={serviceForm.delivery_mode} onChange={(event) => setServiceForm((current) => ({ ...current, delivery_mode: event.target.value }))}><option value="VIRTUAL">Virtual</option><option value="IN_PERSON">In person</option><option value="HYBRID">Hybrid</option><option value="ASYNC">Async</option></select></label>
            <label>Duration (minutes)<input type="number" min="5" max="1440" value={serviceForm.duration_minutes} onChange={(event) => setServiceForm((current) => ({ ...current, duration_minutes: event.target.value }))} required /></label>
            <label>Price<input type="number" min="0" step="0.01" value={serviceForm.price} onChange={(event) => setServiceForm((current) => ({ ...current, price: event.target.value }))} placeholder="95.00" required /></label>
            <label>Currency<input maxLength="3" value={serviceForm.currency} onChange={(event) => setServiceForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} required /></label>
            <label>Capacity<input type="number" min="1" max="500" value={serviceForm.capacity} onChange={(event) => setServiceForm((current) => ({ ...current, capacity: event.target.value }))} required /></label>
            <label>Locations<input value={serviceForm.location_labels} onChange={(event) => setServiceForm((current) => ({ ...current, location_labels: event.target.value }))} placeholder="Virtual, Midtown Studio" /></label>
          </div>
          <div className="business-switch-stack">
            <label className="business-setting-switch"><input type="checkbox" checked={serviceForm.intake_required} onChange={(event) => setServiceForm((current) => ({ ...current, intake_required: event.target.checked }))} /><span><strong>Intake required</strong><small>Require intake before this service is fulfilled.</small></span></label>
            <label className="business-setting-switch"><input type="checkbox" checked={serviceForm.is_public} onChange={(event) => setServiceForm((current) => ({ ...current, is_public: event.target.checked }))} /><span><strong>Public service</strong><small>Show this service on your public profile.</small></span></label>
            <label className="business-setting-switch"><input type="checkbox" checked={serviceForm.active} onChange={(event) => setServiceForm((current) => ({ ...current, active: event.target.checked }))} /><span><strong>Active</strong><small>Keep this service available to current and future workflows.</small></span></label>
          </div>
          <div className="business-editor-footer">
            <button type="button" className="business-button secondary" onClick={() => setServiceEditorOpen(false)}>Cancel</button>
            <button className="business-button primary" disabled={savingService}>{savingService ? 'Saving…' : editingServiceId ? 'Update service' : 'Create service'}</button>
          </div>
        </form>
      </Drawer>

      <Drawer open={locationEditorOpen} eyebrow="Locations" title={editingLocationIndex >= 0 ? 'Edit location' : 'Add location'} onClose={() => setLocationEditorOpen(false)}>
        <form className="business-editor-form" onSubmit={saveLocation}>
          <label>Location name<input value={locationDraft.label} onChange={(event) => setLocationDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Midtown Studio" required /></label>
          <label>Delivery type<select value={locationDraft.kind} onChange={(event) => setLocationDraft((current) => ({ ...current, kind: event.target.value }))}><option value="IN_PERSON">In person</option><option value="VIRTUAL">Virtual</option></select></label>
          <label>Address or area<input value={locationDraft.address || ''} onChange={(event) => setLocationDraft((current) => ({ ...current, address: event.target.value || null }))} placeholder="Atlanta, GA" /></label>
          <label className="business-setting-switch"><input type="checkbox" checked={locationDraft.public} onChange={(event) => setLocationDraft((current) => ({ ...current, public: event.target.checked }))} /><span><strong>Public location</strong><small>Show this location on your public profile.</small></span></label>
          <div className="business-editor-footer">
            <button type="button" className="business-button secondary" onClick={() => setLocationEditorOpen(false)}>Cancel</button>
            <button className="business-button primary" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save location'}</button>
          </div>
        </form>
      </Drawer>

      <Drawer open={credentialEditorOpen} eyebrow="Credentials" title={editingCredentialIndex >= 0 ? 'Edit credential' : 'Add credential'} onClose={() => setCredentialEditorOpen(false)}>
        <form className="business-editor-form" onSubmit={saveCredential}>
          <label>Credential name<input value={credentialDraft.name} onChange={(event) => setCredentialDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Certified Personal Trainer" required /></label>
          <label>Issuer<input value={credentialDraft.issuer || ''} onChange={(event) => setCredentialDraft((current) => ({ ...current, issuer: event.target.value || null }))} placeholder="Issuing organization" /></label>
          <label>Reference<input value={credentialDraft.reference || ''} onChange={(event) => setCredentialDraft((current) => ({ ...current, reference: event.target.value || null }))} placeholder="Optional license or certificate reference" /></label>
          <label>Expiration<input type="date" value={credentialDraft.expires_on || ''} onChange={(event) => setCredentialDraft((current) => ({ ...current, expires_on: event.target.value || null }))} /></label>
          <label className="business-setting-switch"><input type="checkbox" checked={credentialDraft.public} onChange={(event) => setCredentialDraft((current) => ({ ...current, public: event.target.checked }))} /><span><strong>Public credential</strong><small>Show this credential on your public profile.</small></span></label>
          <div className="business-editor-footer">
            <button type="button" className="business-button secondary" onClick={() => setCredentialEditorOpen(false)}>Cancel</button>
            <button className="business-button primary" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save credential'}</button>
          </div>
        </form>
      </Drawer>

      <Drawer open={publishingEditorOpen} eyebrow="Public profile" title="Publishing settings" onClose={() => setPublishingEditorOpen(false)}>
        <form className="business-editor-form" onSubmit={savePublishing}>
          <label>Public URL slug<input value={profileForm.public_slug} onChange={(event) => setProfileForm((current) => ({ ...current, public_slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="your-business-name" /><small>Your profile URL will be /p/{profileForm.public_slug || 'your-business-name'}.</small></label>
          <label className="business-setting-switch"><input type="checkbox" checked={profileForm.is_public} onChange={(event) => setProfileForm((current) => ({ ...current, is_public: event.target.checked }))} /><span><strong>Publish profile</strong><small>Only services, locations, and credentials marked Public are shown.</small></span></label>
          <div className="business-publishing-checklist">
            <span><strong>{publishedServices}</strong><small>Public services</small></span>
            <span><strong>{publicLocations}</strong><small>Public locations</small></span>
            <span><strong>{publicCredentials}</strong><small>Public credentials</small></span>
          </div>
          <div className="business-editor-footer">
            <button type="button" className="business-button secondary" onClick={() => setPublishingEditorOpen(false)}>Cancel</button>
            <button className="business-button primary" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save publishing settings'}</button>
          </div>
        </form>
      </Drawer>

      <Drawer open={previewOpen} eyebrow="Public profile" title="Client / patient preview" onClose={() => setPreviewOpen(false)} wide>
        <div className="business-preview-drawer-content">
          <PublicProfilePreview profile={profile} services={services} />
          {profile?.is_public && publicPath ? (
            <a className="business-button primary as-link" href={publicPath} target="_blank" rel="noreferrer">Open live profile ↗</a>
          ) : (
            <p className="business-preview-private-note">This is a private preview. Publish the profile and set a URL when you are ready to make it visible.</p>
          )}
        </div>
      </Drawer>
    </div>
  )
}
