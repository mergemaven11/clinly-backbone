import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiRequest } from './api'
import './integrations.css'

const CATEGORY_LABELS = {
  CALENDAR: 'Calendar',
  VIDEO: 'Video',
  PAYMENTS: 'Payments',
  AUTOMATION: 'Automation',
  STORAGE: 'Storage',
  CRM: 'CRM',
}

const CATEGORY_GLYPHS = {
  CALENDAR: '◫',
  VIDEO: '◉',
  PAYMENTS: '$',
  AUTOMATION: '↯',
  STORAGE: '◇',
  CRM: '◎',
}

const ENTITLEMENT_LABELS = {
  INCLUDED: 'Included',
  PLAN_GATED: 'Plan feature',
  PAID_ADDON: 'Paid add-on',
}

const STATE_LABELS = {
  AVAILABLE: 'Available',
  CONNECTING: 'Connecting',
  CONNECTED: 'Connected',
  DEGRADED: 'Needs attention',
  DISCONNECTED: 'Disconnected',
  REVOKED: 'Access revoked',
}

function formatDate(value) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function connectionFor(definition, connections) {
  return connections.find((item) => item.integration_key === definition.key) || null
}

function IntegrationCard({ definition, connection, selected, onSelect }) {
  const state = connection?.state || 'AVAILABLE'
  const planned = definition.availability === 'PLANNED'
  const statusLabel = planned ? 'Planned' : STATE_LABELS[state] || state

  return (
    <button
      className={`integration-card ${selected ? 'selected' : ''}`}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="integration-card-topline">
        <span className={`integration-glyph category-${definition.category.toLowerCase()}`}>
          {CATEGORY_GLYPHS[definition.category] || '•'}
        </span>
        <div className="integration-badges">
          <span className={`entitlement-badge entitlement-${definition.entitlement.toLowerCase()}`}>
            {ENTITLEMENT_LABELS[definition.entitlement] || definition.entitlement}
          </span>
          <span className={`connection-badge state-${(planned ? 'planned' : state).toLowerCase()}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="integration-card-copy">
        <small>{CATEGORY_LABELS[definition.category] || definition.category}</small>
        <strong>{definition.display_name}</strong>
        <p>{definition.description}</p>
      </div>

      <div className="integration-capabilities">
        {definition.capabilities.slice(0, 3).map((capability) => (
          <span key={capability}>{capability.replaceAll('_', ' ')}</span>
        ))}
        {definition.capabilities.length > 3 && <span>+{definition.capabilities.length - 3}</span>}
      </div>

      <span className="integration-card-arrow">›</span>
    </button>
  )
}

function IntegrationDetails({ definition, connection }) {
  if (!definition) {
    return (
      <aside className="integration-details empty-details">
        <div className="details-orb">↯</div>
        <strong>Choose an integration</strong>
        <p>Review capabilities, commercial availability, and provider connection health.</p>
      </aside>
    )
  }

  const state = connection?.state || 'AVAILABLE'
  const planned = definition.availability === 'PLANNED'
  const canConfigure = !planned && Boolean(connection)

  return (
    <aside className="integration-details">
      <div className="details-heading">
        <span className={`integration-glyph large category-${definition.category.toLowerCase()}`}>
          {CATEGORY_GLYPHS[definition.category] || '•'}
        </span>
        <div>
          <span className="integration-eyebrow">{CATEGORY_LABELS[definition.category]}</span>
          <h3>{definition.display_name}</h3>
        </div>
      </div>

      <p className="details-description">{definition.description}</p>

      <div className="details-facts">
        <div>
          <span>Availability</span>
          <strong>{definition.availability === 'PLANNED' ? 'Coming soon' : definition.availability.toLowerCase()}</strong>
        </div>
        <div>
          <span>Commercial access</span>
          <strong>{ENTITLEMENT_LABELS[definition.entitlement]}</strong>
        </div>
        <div>
          <span>Setup</span>
          <strong>{definition.setup_type.replaceAll('_', ' ')}</strong>
        </div>
        <div>
          <span>Connection</span>
          <strong>{planned ? 'Not available yet' : STATE_LABELS[state] || state}</strong>
        </div>
        <div>
          <span>Last sync</span>
          <strong>{formatDate(connection?.last_sync_at)}</strong>
        </div>
      </div>

      <div className="details-capabilities">
        <span>Capabilities</span>
        <div>
          {definition.capabilities.map((capability) => (
            <span key={capability}>{capability.replaceAll('_', ' ')}</span>
          ))}
        </div>
      </div>

      <div className="integration-security-note">
        <span>Protected connection model</span>
        <p>Provider credentials and OAuth tokens stay server-side and are never returned to this workspace.</p>
      </div>

      <button className="primary-button full" type="button" disabled={!canConfigure}>
        {planned ? 'Coming soon' : connection ? 'Manage connection' : 'Setup unavailable'}
      </button>
      <small className="details-footnote">
        Connect and disconnect actions will activate only when the secure OAuth or managed-adapter flow for this integration is implemented.
      </small>
    </aside>
  )
}

export default function IntegrationsWorkspace({ token }) {
  const [catalog, setCatalog] = useState([])
  const [connections, setConnections] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')
  const [selectedKey, setSelectedKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const [nextCatalog, nextConnections] = await Promise.all([
        apiRequest('/integrations/catalog', { token }),
        apiRequest('/integrations/connections', { token }),
      ])
      setCatalog(nextCatalog)
      setConnections(nextConnections)
      setSelectedKey((current) => current || nextCatalog[0]?.key || '')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const categories = useMemo(
    () => [...new Set(catalog.map((item) => item.category))],
    [catalog],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return catalog.filter((item) => {
      const categoryMatches = category === 'ALL' || item.category === category
      const searchMatches = !query || [
        item.display_name,
        item.description,
        item.category,
        ...item.capabilities,
      ].some((value) => value.toLowerCase().includes(query))
      return categoryMatches && searchMatches
    })
  }, [catalog, category, search])

  const selected = catalog.find((item) => item.key === selectedKey) || filtered[0] || null
  const connectedCount = connections.filter((item) => item.state === 'CONNECTED').length
  const attentionCount = connections.filter((item) => item.state === 'DEGRADED' || item.state === 'REVOKED').length
  const paidCount = catalog.filter((item) => item.entitlement === 'PAID_ADDON').length

  return (
    <div className="integration-page">
      <section className="integration-hero">
        <div>
          <span className="kicker">Provider ecosystem</span>
          <h2>Connect the tools your business already runs on.</h2>
          <p>
            Calendar, video, payments, and automation live behind one provider-scoped integration layer so your workspace can grow without becoming a pile of vendor-specific settings.
          </p>
        </div>
        <button className="secondary-button integration-refresh" type="button" onClick={() => load({ quiet: true })} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh status'}
        </button>
      </section>

      <section className="integration-metrics" aria-label="Integration summary">
        <article><span>Catalog</span><strong>{catalog.length}</strong><small>Provider integrations</small></article>
        <article><span>Connected</span><strong>{connectedCount}</strong><small>Healthy connections</small></article>
        <article><span>Needs attention</span><strong>{attentionCount}</strong><small>Degraded or revoked</small></article>
        <article><span>Add-ons</span><strong>{paidCount}</strong><small>Future paid extensions</small></article>
      </section>

      <section className="integration-toolbar section-card">
        <label className="integration-search">
          <span>Search integrations</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Calendar, payments, automation…"
          />
        </label>
        <div className="integration-category-filter" aria-label="Integration categories">
          <button className={category === 'ALL' ? 'active' : ''} type="button" onClick={() => setCategory('ALL')}>All</button>
          {categories.map((value) => (
            <button
              key={value}
              className={category === value ? 'active' : ''}
              type="button"
              onClick={() => setCategory(value)}
            >
              {CATEGORY_LABELS[value] || value}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="notice error dismissible">{error}<button onClick={() => setError('')}>×</button></div>}

      {loading ? (
        <div className="integration-loading" aria-label="Loading integrations">
          {[1, 2, 3, 4].map((item) => <div className="integration-skeleton" key={item} />)}
        </div>
      ) : (
        <div className="integration-layout">
          <section className="integration-grid" aria-live="polite">
            {filtered.map((definition) => (
              <IntegrationCard
                key={definition.key}
                definition={definition}
                connection={connectionFor(definition, connections)}
                selected={definition.key === selected?.key}
                onSelect={() => setSelectedKey(definition.key)}
              />
            ))}
            {!filtered.length && (
              <div className="integration-empty section-card">
                <span>⌕</span>
                <strong>No integrations match that filter.</strong>
                <p>Try another category or search term.</p>
              </div>
            )}
          </section>

          <IntegrationDetails
            definition={selected}
            connection={selected ? connectionFor(selected, connections) : null}
          />
        </div>
      )}
    </div>
  )
}
