import { useMemo, useState } from 'react'
import './patient-journal.css'

const STORAGE_KEY = 'clinly-patient-journal-v1'

function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

export default function PatientJournalWorkspace() {
  const [entries, setEntries] = useState(loadEntries)
  const [body, setBody] = useState('')
  const [mood, setMood] = useState('Okay')
  const [energy, setEnergy] = useState(3)
  const [sleep, setSleep] = useState(7)
  const [gratitude, setGratitude] = useState('')
  const [shared, setShared] = useState(false)

  const streak = useMemo(() => new Set(entries.map((e) => e.created_at.slice(0, 10))).size, [entries])

  function saveEntry(event) {
    event.preventDefault()
    if (!body.trim() && !gratitude.trim()) return
    const entry = {
      id: crypto.randomUUID(), created_at: new Date().toISOString(), body: body.trim(), mood,
      energy: Number(energy), sleep: Number(sleep), gratitude: gratitude.trim(), shared,
    }
    const next = [entry, ...entries]
    setEntries(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setBody(''); setGratitude(''); setShared(false)
  }

  function removeEntry(id) {
    const next = entries.filter((entry) => entry.id !== id)
    setEntries(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return <section className="journal-workspace">
    <div className="journal-hero">
      <div><span className="kicker">Your space</span><h2>Daily Journal</h2><p>Reflect, notice patterns, and keep what matters to you in one calm place.</p></div>
      <div className="journal-stat"><strong>{streak}</strong><span>days journaled</span></div>
    </div>

    <div className="journal-grid">
      <form className="journal-card journal-compose" onSubmit={saveEntry}>
        <div className="journal-card-head"><div><h3>How are you today?</h3><p>Your entry is private by default.</p></div><span className={shared ? 'share-chip shared' : 'share-chip'}>{shared ? 'Shared' : 'Private'}</span></div>
        <div className="mood-row">{['Great','Good','Okay','Low','Rough'].map((item) => <button className={mood === item ? 'mood active' : 'mood'} type="button" key={item} onClick={() => setMood(item)}>{item}</button>)}</div>
        <label>What’s on your mind?<textarea rows="7" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write freely. This is your space…" /></label>
        <div className="journal-metrics">
          <label>Energy <strong>{energy}/5</strong><input type="range" min="1" max="5" value={energy} onChange={(e) => setEnergy(e.target.value)} /></label>
          <label>Sleep <strong>{sleep} hrs</strong><input type="range" min="0" max="12" value={sleep} onChange={(e) => setSleep(e.target.value)} /></label>
        </div>
        <label>One thing I’m grateful for<input value={gratitude} onChange={(e) => setGratitude(e.target.value)} placeholder="A person, moment, win, or tiny thing…" /></label>
        <div className="privacy-choice">
          <button type="button" className={!shared ? 'privacy-option active' : 'privacy-option'} onClick={() => setShared(false)}><strong>🔒 Only me</strong><span>Private from providers</span></button>
          <button type="button" className={shared ? 'privacy-option active' : 'privacy-option'} onClick={() => setShared(true)}><strong>👥 Share with provider</strong><span>Visible in your shared progress</span></button>
        </div>
        <button className="primary-button" type="submit">Save journal entry</button>
      </form>

      <div className="journal-card journal-history">
        <div className="journal-card-head"><div><h3>Recent reflections</h3><p>{entries.length ? `${entries.length} saved entr${entries.length === 1 ? 'y' : 'ies'}` : 'Your journal starts here.'}</p></div></div>
        {!entries.length && <div className="journal-empty"><span>✦</span><strong>A quiet place for you</strong><p>Your journal entries will appear here. Private entries stay private.</p></div>}
        {entries.map((entry) => <article className="journal-entry" key={entry.id}>
          <div className="journal-entry-meta"><div><strong>{new Date(entry.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</strong><span>{entry.mood} · Energy {entry.energy}/5 · {entry.sleep}h sleep</span></div><span className={entry.shared ? 'share-chip shared' : 'share-chip'}>{entry.shared ? 'Shared' : 'Private'}</span></div>
          {entry.body && <p>{entry.body}</p>}{entry.gratitude && <div className="gratitude"><span>Grateful for</span>{entry.gratitude}</div>}
          <button className="journal-delete" type="button" onClick={() => removeEntry(entry.id)}>Delete</button>
        </article>)}
      </div>
    </div>
  </section>
}
