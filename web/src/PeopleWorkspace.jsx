import { useState } from 'react'

import { TRACK_META } from './platformMeta'

function Empty({ title, detail }) {
  return <div className="empty"><span className="empty-icon">○</span><strong>{title}</strong><p>{detail}</p></div>
}

export default function PeopleWorkspace({ people, tracks, conversations, onCreatePerson, onMessage }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onCreatePerson({ email, password })
      setEmail('')
      setPassword('')
      setShowCreate(false)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const normalizedQuery = query.trim().toLowerCase()
  const visiblePeople = normalizedQuery
    ? people.filter((person) => person.email.toLowerCase().includes(normalizedQuery))
    : people

  return (
    <div className="page-stack">
      <section className="people-hero">
        <div>
          <span className="kicker">Relationship directory</span>
          <h2>People</h2>
          <p>Manage connected portals, relationship tracks, and conversations.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setShowCreate((current) => !current)}>
          {showCreate ? 'Close' : '+ Add person'}
        </button>
      </section>

      {showCreate && (
        <section className="section-card create-person-panel">
          <div>
            <span className="kicker">New portal</span>
            <h3>Create a connected portal</h3>
            <p>Add someone you work with and give them secure credentials for their private workspace.</p>
          </div>
          <form className="compact-form" onSubmit={submit}>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Temporary password<input type="password" minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {error && <div className="notice error">{error}</div>}
            <button className="primary-button" disabled={busy}>{busy ? 'Adding…' : 'Create portal'}</button>
          </form>
        </section>
      )}

      <label className="people-search">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <span className="sr-only">Search people</span>
        <input
          type="search"
          aria-label="Search people"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people by email…"
        />
        <span className="count-pill">{visiblePeople.length}</span>
      </label>

      <section>
        <div className="client-grid">
          {visiblePeople.map((person) => {
            const personTracks = tracks.filter((track) => track.client_user_id === person.id)
            const conversation = conversations.find((item) => item.client_id === person.id)
            return (
              <article className="client-card" key={person.id}>
                <div className="client-head">
                  <span className="avatar large">{person.email.slice(0, 1).toUpperCase()}</span>
                  <div><strong>{person.email}</strong><span>{personTracks.length} track{personTracks.length === 1 ? '' : 's'}</span></div>
                </div>
                <div className="mini-tags">
                  {personTracks.map((track) => <span key={track.id}>{TRACK_META[track.kind]?.label}</span>)}
                </div>
                <div className="client-actions">
                  <button className="secondary-button" type="button" onClick={() => onMessage(person.id)}>
                    {conversation ? 'Open messages' : 'Start messages'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
        {!people.length && <Empty title="No people yet" detail="Add the first person to your workspace above." />}
        {people.length > 0 && !visiblePeople.length && <Empty title="No matches" detail="Try a different email or clear the search." />}
      </section>
    </div>
  )
}
