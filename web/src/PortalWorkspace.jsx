import { useEffect, useMemo, useState } from 'react'

import { formatDate, humanizeKey, TRACK_META } from './platformMeta'

function Empty({ title, detail }) {
  return <div className="empty"><span className="empty-icon">○</span><strong>{title}</strong><p>{detail}</p></div>
}

function TrackCard({ track, selected = false, onClick }) {
  const meta = TRACK_META[track.kind] || TRACK_META.GENERAL
  return (
    <button className={selected ? 'track-card selected' : 'track-card'} onClick={onClick} type="button">
      <span className={`track-icon kind-${track.kind.toLowerCase()}`}>{meta.label.slice(0, 1)}</span>
      <span className="track-card-copy">
        <small>{meta.eyebrow}</small>
        <strong>{track.title}</strong>
        <span>{meta.description}</span>
      </span>
      <span className="chevron">›</span>
    </button>
  )
}

function TrackCreateForm({ people, onCreate }) {
  const [personId, setPersonId] = useState(people[0]?.id || '')
  const [kind, setKind] = useState('GENERAL')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!personId && people[0]?.id) setPersonId(people[0].id)
  }, [people, personId])

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onCreate({ client_id: personId, kind, title })
      setTitle('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <label>
        Person
        <select value={personId} onChange={(event) => setPersonId(event.target.value)} required>
          <option value="">Choose person</option>
          {people.map((person) => <option value={person.id} key={person.id}>{person.email}</option>)}
        </select>
      </label>
      <label>
        Track type
        <select value={kind} onChange={(event) => setKind(event.target.value)}>
          {Object.entries(TRACK_META).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}
        </select>
      </label>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Strength goals" required /></label>
      {error && <div className="notice error">{error}</div>}
      <button className="primary-button" disabled={busy || !people.length}>{busy ? 'Creating…' : 'Create track'}</button>
    </form>
  )
}

function initialEntryValues(kind) {
  if (kind === 'FITNESS') {
    return {
      journal_text: '',
      goal_name: '',
      goal_target: '',
      progress_percent: '',
      measurement_label: '',
      measurement_value: '',
      measurement_unit: '',
    }
  }
  if (kind === 'LASER_HAIR_REMOVAL') {
    return {
      journal_text: '',
      session_date: new Date().toISOString().slice(0, 10),
      treatment_area: '',
      redness: '',
      sensitivity: '',
      irritation: '',
    }
  }
  return { journal_text: '', mood: '', wellbeing_rating: '' }
}

function normalizeEntryPayload(kind, values) {
  const numeric = new Set(
    kind === 'FITNESS'
      ? ['progress_percent', 'measurement_value']
      : kind === 'LASER_HAIR_REMOVAL'
        ? ['redness', 'sensitivity', 'irritation']
        : ['wellbeing_rating'],
  )
  const payload = {}
  for (const [key, rawValue] of Object.entries(values)) {
    if (rawValue === '' || rawValue === null || rawValue === undefined) continue
    payload[key] = numeric.has(key) ? Number(rawValue) : rawValue
  }
  return payload
}

function entryTypeFor(kind) {
  return {
    CARE: 'CARE_JOURNAL',
    FITNESS: 'FITNESS_CHECKIN',
    LASER_HAIR_REMOVAL: 'SKIN_CHECKIN',
    GENERAL: 'JOURNAL',
  }[kind] || 'JOURNAL'
}

function EntryComposer({ track, onCreate }) {
  const initial = useMemo(() => initialEntryValues(track.kind), [track.kind])
  const [values, setValues] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setValues(initialEntryValues(track.kind)), [track.id, track.kind])

  function set(name, value) {
    setValues((current) => ({ ...current, [name]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    const payload = normalizeEntryPayload(track.kind, values)
    if (!Object.keys(payload).length) {
      setError('Add at least one note or progress value.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onCreate({ track_id: track.id, entry_type: entryTypeFor(track.kind), payload })
      setValues(initialEntryValues(track.kind))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-title">
        <div>
          <strong>Add a check-in</strong>
          <span>{track.kind === 'LASER_HAIR_REMOVAL' ? 'Record observations, not a diagnosis.' : 'Capture what changed since the last entry.'}</span>
        </div>
        <span className="lock-pill">Encrypted</span>
      </div>

      {track.kind === 'FITNESS' && (
        <div className="form-grid three">
          <label>Goal<input value={values.goal_name} onChange={(event) => set('goal_name', event.target.value)} placeholder="Run a 5K" /></label>
          <label>Target<input value={values.goal_target} onChange={(event) => set('goal_target', event.target.value)} placeholder="Under 30 minutes" /></label>
          <label>Progress %<input type="number" min="0" max="100" value={values.progress_percent} onChange={(event) => set('progress_percent', event.target.value)} placeholder="0–100" /></label>
          <label>Measurement<input value={values.measurement_label} onChange={(event) => set('measurement_label', event.target.value)} placeholder="Body weight, steps…" /></label>
          <label>Value<input type="number" step="any" value={values.measurement_value} onChange={(event) => set('measurement_value', event.target.value)} /></label>
          <label>Unit<input value={values.measurement_unit} onChange={(event) => set('measurement_unit', event.target.value)} placeholder="lb, kg, reps…" /></label>
        </div>
      )}

      {track.kind === 'LASER_HAIR_REMOVAL' && (
        <div className="form-grid three">
          <label>Session date<input type="date" value={values.session_date} onChange={(event) => set('session_date', event.target.value)} /></label>
          <label>Service area<input value={values.treatment_area} onChange={(event) => set('treatment_area', event.target.value)} placeholder="Face, legs…" /></label>
          <label>Redness 0–5<input type="number" min="0" max="5" value={values.redness} onChange={(event) => set('redness', event.target.value)} /></label>
          <label>Sensitivity 0–5<input type="number" min="0" max="5" value={values.sensitivity} onChange={(event) => set('sensitivity', event.target.value)} /></label>
          <label>Irritation 0–5<input type="number" min="0" max="5" value={values.irritation} onChange={(event) => set('irritation', event.target.value)} /></label>
        </div>
      )}

      {(track.kind === 'CARE' || track.kind === 'GENERAL') && (
        <div className="form-grid two">
          <label>Theme<input value={values.mood} onChange={(event) => set('mood', event.target.value)} placeholder="Focused, calm, energized…" /></label>
          <label>Rating 1–5<input type="number" min="1" max="5" value={values.wellbeing_rating} onChange={(event) => set('wellbeing_rating', event.target.value)} /></label>
        </div>
      )}

      <label>
        Note
        <textarea rows="4" value={values.journal_text} onChange={(event) => set('journal_text', event.target.value)} placeholder="What changed? What did you notice? What do you want to remember?" />
      </label>
      {error && <div className="notice error">{error}</div>}
      <div className="composer-actions">
        <small>Free text and check-in details are encrypted before database storage.</small>
        <button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save check-in'}</button>
      </div>
    </form>
  )
}

function EntryCard({ entry }) {
  const note = entry.payload.journal_text
  const details = Object.entries(entry.payload).filter(([key]) => key !== 'journal_text')
  return (
    <article className="entry-card">
      <div className="entry-meta"><span>{humanizeKey(entry.entry_type)}</span><time>{formatDate(entry.created_at)}</time></div>
      {note && <p className="journal-text">{note}</p>}
      {details.length > 0 && (
        <div className="entry-detail-grid">
          {details.map(([key, value]) => <div key={key}><small>{humanizeKey(key)}</small><strong>{String(value)}</strong></div>)}
        </div>
      )}
    </article>
  )
}

export default function PortalWorkspace({ isProvider, people, tracks, selectedTrack, entries, onSelectTrack, onCreateTrack, onCreateEntry }) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="portal-layout">
      <section className="track-rail section-card">
        <div className="section-heading">
          <div><span className="kicker">Your spaces</span><h3>Tracks</h3></div>
          {isProvider && <button className="small-button" type="button" onClick={() => setShowCreate((value) => !value)}>+ New</button>}
        </div>
        {showCreate && isProvider && (
          <TrackCreateForm people={people} onCreate={async (values) => { await onCreateTrack(values); setShowCreate(false) }} />
        )}
        <div className="track-list">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} selected={track.id === selectedTrack?.id} onClick={() => onSelectTrack(track.id)} />
          ))}
        </div>
        {!tracks.length && <Empty title="No relationship tracks" detail={isProvider ? 'Create one to begin shared progress tracking.' : 'Nothing has been shared with you yet.'} />}
      </section>

      <section className="journal-panel section-card">
        {selectedTrack ? (
          <>
            <div className="journal-header">
              <div>
                <span className="kicker">{TRACK_META[selectedTrack.kind]?.eyebrow}</span>
                <h2>{selectedTrack.title}</h2>
                <p>{TRACK_META[selectedTrack.kind]?.description}</p>
              </div>
              <span className="privacy-chip compact"><span />Protected</span>
            </div>
            <EntryComposer track={selectedTrack} onCreate={onCreateEntry} />
            <div className="timeline">
              {entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
              {!entries.length && <Empty title="No entries yet" detail="Use the check-in above to start the timeline." />}
            </div>
          </>
        ) : (
          <Empty title="Choose a track" detail="Select a relationship track to open its progress timeline." />
        )}
      </section>
    </div>
  )
}
