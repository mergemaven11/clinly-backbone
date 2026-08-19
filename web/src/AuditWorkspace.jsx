import { useEffect, useState } from 'react'

import { apiRequest, downloadAudit } from './api'
import { formatDate, humanizeKey } from './platformMeta'

function Empty({ title, detail }) {
  return <div className="empty"><span className="empty-icon">○</span><strong>{title}</strong><p>{detail}</p></div>
}

export default function AuditWorkspace({ token, people }) {
  const [personId, setPersonId] = useState(people[0]?.id || '')
  const [events, setEvents] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!personId && people[0]?.id) setPersonId(people[0].id)
  }, [people, personId])

  async function load() {
    if (!personId) return
    setBusy(true)
    setError('')
    try {
      setEvents(await apiRequest(`/audit?${new URLSearchParams({ subject_user_id: personId })}`, { token }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function exportCsv() {
    setBusy(true)
    setError('')
    try {
      await downloadAudit({ token, clientId: personId })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <span className="kicker">Workspace evidence</span>
          <h2>Activity log</h2>
          <p>Review security and access events for someone in your workspace.</p>
        </div>
      </div>
      <div className="audit-controls">
        <select value={personId} onChange={(event) => setPersonId(event.target.value)}>
          <option value="">Choose person</option>
          {people.map((person) => <option key={person.id} value={person.id}>{person.email}</option>)}
        </select>
        <button className="secondary-button" type="button" onClick={load} disabled={busy || !personId}>Load events</button>
        <button className="primary-button" type="button" onClick={exportCsv} disabled={busy || !personId}>Export CSV</button>
      </div>
      {error && <div className="notice error">{error}</div>}
      <div className="audit-table-wrap">
        <table>
          <thead><tr><th>Time</th><th>Action</th><th>Resource</th><th>Result</th></tr></thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{formatDate(event.timestamp)}</td>
                <td>{humanizeKey(event.action)}</td>
                <td>{event.resource_type || '—'}</td>
                <td><span className={event.success ? 'status-ok' : 'status-denied'}>{event.success ? 'Success' : 'Denied'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!events.length && <Empty title="No activity loaded" detail="Choose someone and load their scoped activity history." />}
    </section>
  )
}
