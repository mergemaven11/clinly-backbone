import { useEffect, useState } from 'react'

import { apiRequest } from './api'
import { APP_INITIAL, APP_NAME } from './brand'
import './business.css'

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

export default function PublicProviderPage({ slug }) {
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiRequest(`/public/providers/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (!cancelled) {
          setPage(data)
          document.title = `${data.profile.display_name} · ${APP_NAME}`
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.status === 404 ? 'This provider page is not published.' : requestError.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return <main className="public-provider-shell"><div className="empty-state"><div className="spinner" /><p>Loading provider page…</p></div></main>
  }

  if (error || !page) {
    return (
      <main className="public-provider-shell">
        <div className="public-provider-brand"><span className="brand-mark">{APP_INITIAL}</span><strong>{APP_NAME}</strong></div>
        <section className="public-provider-error section-card">
          <span>○</span><h1>Page unavailable</h1><p>{error || 'This provider page is unavailable.'}</p>
          <a className="primary-button" href="/">Go to sign in</a>
        </section>
      </main>
    )
  }

  const { profile, services } = page
  return (
    <main className="public-provider-shell">
      <nav className="public-provider-nav">
        <a className="public-provider-brand" href="/"><span className="brand-mark">{APP_INITIAL}</span><strong>{APP_NAME}</strong></a>
        <a className="secondary-button" href="/">Provider sign in</a>
      </nav>

      <section className="public-provider-hero">
        <div className="public-provider-avatar">{profile.display_name.slice(0, 1).toUpperCase()}</div>
        <div className="public-provider-intro">
          <div className="public-provider-eyebrow">
            {profile.provider_type && <span>{profile.provider_type}</span>}
            {profile.business_name && <span>{profile.business_name}</span>}
          </div>
          <h1>{profile.display_name}</h1>
          {profile.pronouns && <small>{profile.pronouns}</small>}
          {profile.headline && <h2>{profile.headline}</h2>}
          {profile.bio && <p>{profile.bio}</p>}
          {profile.categories.length > 0 && <div className="public-category-list">{profile.categories.map((category) => <span key={category}>{category}</span>)}</div>}
        </div>
      </section>

      <div className="public-provider-layout">
        <section className="public-services">
          <div className="public-section-heading"><span className="kicker">Services</span><h2>Ways to work together</h2></div>
          <div className="public-service-grid">
            {services.map((service) => (
              <article className="public-service-card" key={service.id}>
                <div className="public-service-top">
                  <span>{service.delivery_mode.replaceAll('_', ' ')}</span>
                  <strong>{moneyFromMinor(service.price_minor, service.currency)}</strong>
                </div>
                <h3>{service.name}</h3>
                {service.description && <p>{service.description}</p>}
                <div className="public-service-meta">
                  <span>{service.duration_minutes} min</span>
                  {service.capacity > 1 && <span>Up to {service.capacity} people</span>}
                  {service.intake_required && <span>Intake required</span>}
                </div>
                {service.location_labels.length > 0 && <div className="mini-tags">{service.location_labels.map((label) => <span key={label}>{label}</span>)}</div>}
                <button className="primary-button full" type="button" disabled>Booking coming next</button>
              </article>
            ))}
          </div>
          {!services.length && <div className="empty section-card"><span className="empty-icon">○</span><strong>No public services yet</strong><p>This provider has not published a service catalog yet.</p></div>}
        </section>

        <aside className="public-provider-aside">
          {profile.locations.length > 0 && (
            <section className="section-card">
              <span className="kicker">Where</span><h3>Service locations</h3>
              <div className="public-detail-list">
                {profile.locations.map((location) => (
                  <div key={`${location.kind}-${location.label}`}><strong>{location.label}</strong><span>{location.kind === 'VIRTUAL' ? 'Virtual' : location.address || 'In person'}</span></div>
                ))}
              </div>
            </section>
          )}
          {profile.credentials.length > 0 && (
            <section className="section-card">
              <span className="kicker">Provider supplied</span><h3>Credentials</h3>
              <div className="public-detail-list">
                {profile.credentials.map((credential) => (
                  <div key={`${credential.name}-${credential.reference || ''}`}>
                    <strong>{credential.name}</strong>
                    <span>{[credential.issuer, credential.reference].filter(Boolean).join(' · ')}</span>
                    {credential.expires_on && <small>Expires {credential.expires_on}</small>}
                  </div>
                ))}
              </div>
              <p className="public-disclaimer">Credential information is supplied by the provider and is not presented here as platform verification.</p>
            </section>
          )}
          <section className="public-next-card">
            <span className="kicker">Coming next</span><h3>Online booking</h3><p>Availability and booking will connect to these services when the scheduling foundation lands.</p>
          </section>
        </aside>
      </div>
    </main>
  )
}
