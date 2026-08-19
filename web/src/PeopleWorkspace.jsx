import { useState } from 'react'

import { TRACK_META } from './platformMeta'

function Empty({ title, detail }) {
  return <div className="empty"><span className="empty-icon">○</span><strong>{title}</strong><p>{detail}</p></div>
}

export default function PeopleWorkspace({ people, tracks, conversations, onCreatePerson, onMessage }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="section-card split-card">
        <div>
          <span className="kicker">Add someone</span>
          <h2>Create a connected portal</h2>
          <p>Add a client, customer, member, candidate, patient, or other person you work with. Their experience can be shaped by the services and tracks you create.</p>
        </div>
        <form className="compact-form" onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Temporary password<input type="password" minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <div className="notice error">{error}</div>}
          <button className="primary-button" disabled={busy}>{busy ? 'Adding…' : 'Add person'}</button>
        </form>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div><span className="kicker">Workspace</span><h3>People</h3></div>
          <span className="count-pill">{people.length}</span>
        </div>
        <div className="client-grid">
          {people.map((person) => {
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
      </section>
    </div>
  )
}
