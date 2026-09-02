import { useEffect, useMemo, useState } from 'react'

import { IS_DEMO_MODE } from './demoApi'
import { formatDate, humanizeKey, TRACK_META } from './platformMeta'
import {
  familyForSpecialty,
  matchesSpecialty,
  SPECIALTIES,
  specialtyForKey,
  templatePlansForSpecialty,
} from './specialtyCatalog'

const DEMO_SPECIALTY_KEY = 'clinly-demo-specialty-v1'

function Empty({ title, detail }) {
  return <div className="empty"><span className="empty-icon">○</span><strong>{title}</strong><p>{detail}</p></div>
}

function specialtyTrackMeta(track, specialty) {
  const base = TRACK_META[track.kind] || TRACK_META.GENERAL
  const family = familyForSpecialty(specialty.key)
  return {
    ...base,
    label: specialty.planLabel || base.label,
    eyebrow: family.label,
    description: track.demoDescription || `${specialty.planLabel || 'Progress plan'} for ${specialty.label.toLowerCase()} workflows.`,
  }
}

function TrackCard({ track, specialty, selected = false, onClick }) {
  const meta = specialtyTrackMeta(track, specialty)
  return (
    <button className={selected ? 'track-card selected' : 'track-card'} onClick={onClick} type="button">
      <span className={`track-icon kind-${track.kind.toLowerCase()}`}>{meta.label.slice(0, 1)}</span>
      <span className="track-card-copy">
        <small>{meta.eyebrow}</small>
        <strong>{track.demoTitle || track.title}</strong>
        <span>{meta.description}</span>
      </span>
      <span className="chevron">›</span>
    </button>
  )
}

function SpecialtySelector({ value, onChange }) {
  const specialty = specialtyForKey(value)
  const family = familyForSpecialty(value)
  const [query, setQuery] = useState(specialty.label)
  const [open, setOpen] = useState(false)

  useEffect(() => setQuery(specialtyForKey(value).label), [value])

  const matches = useMemo(
    () => SPECIALTIES.filter((item) => matchesSpecialty(item, query)).slice(0, 8),
    [query],
  )

  function select(item) {
    setQuery(item.label)
    setOpen(false)
    onChange(item.key)
  }

  function handleChange(event) {
    const nextQuery = event.target.value
    setQuery(nextQuery)
    setOpen(true)
    const normalized = nextQuery.trim().toLowerCase()
    const exact = SPECIALTIES.find((item) => [item.label, ...(item.aliases || [])].some((value) => value.toLowerCase() === normalized))
    if (exact) select(exact)
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'Enter' && open && matches.length) {
      event.preventDefault()
      select(matches[0])
    }
  }

  return (
    <div className="specialty-preview-control">
      <div className="specialty-preview-heading">
        <div>
          <span className="kicker">Preview specialty workspace</span>
          <strong>{specialty.label}</strong>
        </div>
        <span className="specialty-workspace-name">{family.workspace}</span>
      </div>
      <div className="specialty-combobox">
        <label>
          <span className="sr-only">Search specialties</span>
          <input
            value={query}
            onChange={handleChange}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 140)}
            onKeyDown={handleKeyDown}
            placeholder="Search specialties…"
            aria-label="Search specialties"
            aria-expanded={open}
            aria-controls="clinly-specialty-results"
            autoComplete="off"
          />
        </label>
        {open && (
          <div className="specialty-results" id="clinly-specialty-results" role="listbox">
            {matches.length ? matches.map((item) => (
              <button key={item.key} type="button" role="option" aria-selected={item.key === value} onMouseDown={(event) => event.preventDefault()} onClick={() => select(item)}>
                <span><strong>{item.label}</strong><small>{familyForSpecialty(item.key).label}</small></span>
                <span>Use template</span>
              </button>
            )) : (
              <div className="specialty-no-results">No matching specialty yet. Try a broader term.</div>
            )}
          </div>
        )}
      </div>
      <small>Start typing a profession, then choose a result. The visible plans, terminology, and progress template change immediately.</small>
    </div>
  )
}

function TrackCreateForm({ people, specialty, onCreate }) {
  const allowedKinds = specialty.allowedKinds || ['GENERAL']
  const [personId, setPersonId] = useState(people[0]?.id || '')
  const [kind, setKind] = useState(allowedKinds[0])
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!personId && people[0]?.id) setPersonId(people[0].id)
  }, [people, personId])

  useEffect(() => {
    if (!allowedKinds.includes(kind)) setKind(allowedKinds[0])
  }, [specialty.key, allowedKinds, kind])

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
      {allowedKinds.length > 1 && (
        <label>
          Plan type
          <select value={kind} onChange={(event) => setKind(event.target.value)}>
            {allowedKinds.map((nextKind) => <option value={nextKind} key={nextKind}>{TRACK_META[nextKind]?.label || specialty.planLabel}</option>)}
          </select>
        </label>
      )}
      <label>{specialty.planLabel || 'Plan'} title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={specialty.placeholder || 'e.g. Client progress plan'} required /></label>
      {error && <div className="notice error">{error}</div>}
      <button className="primary-button" disabled={busy || !people.length}>{busy ? 'Creating…' : `Create ${String(specialty.planLabel || 'plan').toLowerCase()}`}</button>
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

function EntryComposer({ track, specialty, onCreate }) {
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

  const family = familyForSpecialty(specialty.key)

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-title">
        <div>
          <strong>Add {family.progress.toLowerCase()} update</strong>
          <span>{track.kind === 'LASER_HAIR_REMOVAL' ? 'Record treatment observations, not a diagnosis.' : `Capture what changed in this ${specialty.planLabel.toLowerCase()}.`}</span>
        </div>
        <span className="lock-pill">Encrypted</span>
      </div>

      {track.kind === 'FITNESS' && (
        <div className="form-grid three">
          <label>Goal<input value={values.goal_name} onChange={(event) => set('goal_name', event.target.value)} placeholder="Performance or movement goal" /></label>
          <label>Target<input value={values.goal_target} onChange={(event) => set('goal_target', event.target.value)} placeholder="Target outcome" /></label>
          <label>Progress %<input type="number" min="0" max="100" value={values.progress_percent} onChange={(event) => set('progress_percent', event.target.value)} placeholder="0–100" /></label>
          <label>Measurement<input value={values.measurement_label} onChange={(event) => set('measurement_label', event.target.value)} placeholder="Distance, reps, mobility…" /></label>
          <label>Value<input type="number" step="any" value={values.measurement_value} onChange={(event) => set('measurement_value', event.target.value)} /></label>
          <label>Unit<input value={values.measurement_unit} onChange={(event) => set('measurement_unit', event.target.value)} placeholder="reps, sec, degrees…" /></label>
        </div>
      )}

      {track.kind === 'LASER_HAIR_REMOVAL' && (
        <div className="form-grid three">
          <label>Session date<input type="date" value={values.session_date} onChange={(event) => set('session_date', event.target.value)} /></label>
          <label>Treatment area<input value={values.treatment_area} onChange={(event) => set('treatment_area', event.target.value)} placeholder="Face, legs, underarms…" /></label>
          <label>Redness 0–5<input type="number" min="0" max="5" value={values.redness} onChange={(event) => set('redness', event.target.value)} /></label>
          <label>Sensitivity 0–5<input type="number" min="0" max="5" value={values.sensitivity} onChange={(event) => set('sensitivity', event.target.value)} /></label>
          <label>Irritation 0–5<input type="number" min="0" max="5" value={values.irritation} onChange={(event) => set('irritation', event.target.value)} /></label>
        </div>
      )}

      {(track.kind === 'CARE' || track.kind === 'GENERAL') && (
        <div className="form-grid two">
          <label>{specialty.focusLabel || 'Focus / theme'}<input value={values.mood} onChange={(event) => set('mood', event.target.value)} placeholder={specialty.focusPlaceholder || (family.label === 'Rehabilitation' ? 'Mobility, pain, function…' : 'Focus, milestone, outcome…')} /></label>
          <label>{specialty.ratingLabel || 'Progress rating 1–5'}<input type="number" min="1" max="5" value={values.wellbeing_rating} onChange={(event) => set('wellbeing_rating', event.target.value)} /></label>
        </div>
      )}

      <label>
        Note
        <textarea rows="4" value={values.journal_text} onChange={(event) => set('journal_text', event.target.value)} placeholder={`Add a ${family.progress.toLowerCase()} note…`} />
      </label>
      {error && <div className="notice error">{error}</div>}
      <div className="composer-actions">
        <small>Free text and check-in details are encrypted before database storage.</small>
        <button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save update'}</button>
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
  const [specialtyKey, setSpecialtyKey] = useState(() => {
    if (!IS_DEMO_MODE) return 'GENERAL_SERVICE_PROVIDER'
    return window.localStorage.getItem(DEMO_SPECIALTY_KEY) || 'WELLNESS_COACH'
  })
  const specialty = specialtyForKey(specialtyKey)
  const family = familyForSpecialty(specialtyKey)

  function changeSpecialty(nextKey) {
    const nextSpecialty = specialtyForKey(nextKey)
    setSpecialtyKey(nextKey)
    if (IS_DEMO_MODE) window.localStorage.setItem(DEMO_SPECIALTY_KEY, nextKey)
    setShowCreate(false)
    const firstCompatibleTrack = tracks.find((track) => nextSpecialty.allowedKinds.includes(track.kind))
    if (firstCompatibleTrack) onSelectTrack(firstCompatibleTrack.id)
  }

  const planTemplates = templatePlansForSpecialty(specialtyKey)
  const compatibleTracks = (IS_DEMO_MODE
    ? tracks.filter((track) => specialty.allowedKinds.includes(track.kind))
    : tracks
  ).map((track, index) => ({
    ...track,
    demoTitle: IS_DEMO_MODE ? planTemplates[index % planTemplates.length] : track.title,
    demoDescription: IS_DEMO_MODE ? `${family.progress} template for ${specialty.label.toLowerCase()}.` : undefined,
  }))
  const activeTrack = compatibleTracks.find((track) => track.id === selectedTrack?.id) || compatibleTracks[0] || null

  return (
    <div className="portal-layout specialty-aware-portal">
      <section className="track-rail section-card">
        {IS_DEMO_MODE && isProvider && <SpecialtySelector value={specialtyKey} onChange={changeSpecialty} />}
        <div className="section-heading">
          <div><span className="kicker">{family.label}</span><h3>{specialty.planPlural || 'Plans'}</h3></div>
          {isProvider && <button className="small-button" type="button" onClick={() => setShowCreate((value) => !value)}>+ New</button>}
        </div>
        {showCreate && isProvider && (
          <TrackCreateForm people={people} specialty={specialty} onCreate={async (values) => { await onCreateTrack(values); setShowCreate(false) }} />
        )}
        <div className="track-list">
          {compatibleTracks.map((track) => (
            <TrackCard key={track.id} track={track} specialty={specialty} selected={track.id === activeTrack?.id} onClick={() => onSelectTrack(track.id)} />
          ))}
        </div>
        {!compatibleTracks.length && <Empty title={`No ${String(specialty.planPlural || 'plans').toLowerCase()} yet`} detail={isProvider ? `Create a ${String(specialty.planLabel || 'plan').toLowerCase()} designed for ${specialty.label.toLowerCase()} workflows.` : 'Nothing has been shared with you yet.'} />}
      </section>

      <section className="journal-panel section-card">
        {activeTrack ? (
          <>
            <div className="journal-header">
              <div>
                <span className="kicker">{family.progress}</span>
                <h2>{activeTrack.demoTitle || activeTrack.title}</h2>
                <p>{specialtyTrackMeta(activeTrack, specialty).description}</p>
              </div>
              <span className="privacy-chip compact"><span />Protected</span>
            </div>
            <EntryComposer track={activeTrack} specialty={specialty} onCreate={onCreateEntry} />
            <div className="timeline">
              {entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
              {!entries.length && <Empty title="No updates yet" detail={`Use the ${family.progress.toLowerCase()} form above to start the timeline.`} />}
            </div>
          </>
        ) : (
          <Empty title={`Choose a ${String(specialty.planLabel || 'plan').toLowerCase()}`} detail={`Select a ${String(specialty.planLabel || 'plan').toLowerCase()} to open its ${family.progress.toLowerCase()} timeline.`} />
        )}
      </section>
    </div>
  )
}
