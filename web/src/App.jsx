import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiRequest, downloadAudit } from './api'

const TOKEN_KEY = 'clinly.session.token'

const TRACK_META = {
  CARE: {
    label: 'Care',
    eyebrow: 'Care relationship',
    description: 'Private journaling, wellbeing notes, and progress shared in a care relationship.',
  },
  FITNESS: {
    label: 'Fitness',
    eyebrow: 'Fitness candidate',
    description: 'Track goals, measurements, progress, training notes, and personal reflections.',
  },
  LASER_HAIR_REMOVAL: {
    label: 'Laser hair removal',
    eyebrow: 'Treatment progress',
    description: 'Record session history and descriptive skin observations such as redness or sensitivity.',
  },
  GENERAL: {
    label: 'General',
    eyebrow: 'Relationship portal',
    description: 'A flexible shared journal for goals, check-ins, and progress in other relationships.',
  },
}

const NAV_ITEMS = [
  ['home', 'Overview'],
  ['portal', 'Journal & goals'],
  ['messages', 'Messages'],
  ['clients', 'Participants'],
  ['audit', 'Audit'],
]

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function humanizeKey(value) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    apiRequest('/auth/me', { token })
      .then((profile) => {
        if (!cancelled) setUser(profile)
      })
      .catch(() => {
        sessionStorage.removeItem(TOKEN_KEY)
        if (!cancelled) {
          setToken('')
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  function handleToken(nextToken) {
    sessionStorage.setItem(TOKEN_KEY, nextToken)
    setToken(nextToken)
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
    setUser(null)
  }

  if (loading) {
    return (
      <div className="center-screen">
        <div className="brand-mark">C</div>
        <p>Opening your secure portal…</p>
      </div>
    )
  }

  if (!token || !user) return <AuthPage onToken={handleToken} />

  return <PortalApp token={token} user={user} onLogout={logout} />
}

function AuthPage({ onToken }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'signup') {
        await apiRequest('/auth/signup-therapist', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
      }
      const login = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      onToken(login.access_token)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="brand-lockup">
          <div className="brand-mark">C</div>
          <span>Clinly</span>
        </div>
        <div className="auth-copy">
          <span className="kicker">One relationship. One private place.</span>
          <h1>Progress deserves more than scattered notes.</h1>
          <p>
            Clinly brings secure messaging, journaling, goals, and progress tracking into one portal for care, fitness, laser hair removal, and other ongoing relationships.
          </p>
          <div className="auth-feature-grid">
            <article><strong>Journal</strong><span>Private reflections and check-ins</span></article>
            <article><strong>Track</strong><span>Goals, sessions, and observations</span></article>
            <article><strong>Message</strong><span>Stay connected in context</span></article>
            <article><strong>Review</strong><span>See progress over time</span></article>
          </div>
        </div>
      </section>

      <section className="auth-panel-wrap">
        <form className="auth-panel" onSubmit={submit}>
          <span className="kicker">{mode === 'login' ? 'Welcome back' : 'Professional account'}</span>
          <h2>{mode === 'login' ? 'Sign in to your portal' : 'Create your Clinly workspace'}</h2>
          <p className="muted">
            {mode === 'login'
              ? 'Participants use the credentials created for them by their professional.'
              : 'Professional accounts can invite participants and create relationship tracks.'}
          </p>

          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>

          {error && <div className="notice error">{error}</div>}

          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button className="text-button" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
            {mode === 'login' ? 'I need a professional account' : 'I already have an account'}
          </button>
        </form>
      </section>
    </main>
  )
}

function PortalApp({ token, user, onLogout }) {
  const isProfessional = user.role === 'THERAPIST'
  const [view, setView] = useState('home')
  const [clients, setClients] = useState([])
  const [tracks, setTracks] = useState([])
  const [conversations, setConversations] = useState([])
  const [selectedTrackId, setSelectedTrackId] = useState('')
  const [entries, setEntries] = useState([])
  const [selectedConversationId, setSelectedConversationId] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) || null,
    [tracks, selectedTrackId],
  )

  const loadCore = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const requests = [
        apiRequest('/portal/tracks/me', { token }),
        apiRequest('/conversations/me', { token }),
      ]
      if (isProfessional) requests.push(apiRequest('/clients', { token }))
      const [nextTracks, nextConversations, nextClients = []] = await Promise.all(requests)
      setTracks(nextTracks)
      setConversations(nextConversations)
      setClients(nextClients)
      setSelectedTrackId((current) => current || nextTracks[0]?.id || '')
      setSelectedConversationId((current) => current || nextConversations[0]?.id || '')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [token, isProfessional])

  const loadEntries = useCallback(async (trackId) => {
    if (!trackId) {
      setEntries([])
      return
    }
    try {
      const data = await apiRequest(`/portal/entries?${new URLSearchParams({ track_id: trackId })}`, { token })
      setEntries(data)
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [token])

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) {
      setMessages([])
      return
    }
    try {
      const data = await apiRequest(`/messages?${new URLSearchParams({ conversation_id: conversationId })}`, { token })
      setMessages(data)
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [token])

  useEffect(() => { loadCore() }, [loadCore])
  useEffect(() => { loadEntries(selectedTrackId) }, [selectedTrackId, loadEntries])
  useEffect(() => { loadMessages(selectedConversationId) }, [selectedConversationId, loadMessages])

  function flash(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  async function createClient(values) {
    const created = await apiRequest('/auth/create-client', {
      token,
      method: 'POST',
      body: JSON.stringify(values),
    })
    await loadCore()
    flash(`Participant ${created.email} created.`)
    return created
  }

  async function createTrack(values) {
    const created = await apiRequest('/portal/tracks', {
      token,
      method: 'POST',
      body: JSON.stringify(values),
    })
    await loadCore()
    setSelectedTrackId(created.id)
    flash(`${TRACK_META[created.kind]?.label || 'Portal'} track created.`)
  }

  async function createEntry(values) {
    const created = await apiRequest('/portal/entries', {
      token,
      method: 'POST',
      body: JSON.stringify(values),
    })
    await loadEntries(values.track_id)
    flash('Check-in saved privately.')
    return created
  }

  async function createConversation(clientId) {
    try {
      const created = await apiRequest('/conversations', {
        token,
        method: 'POST',
        body: JSON.stringify({ client_id: clientId }),
      })
      await loadCore()
      setSelectedConversationId(created.id)
      setView('messages')
      flash('Secure conversation opened.')
      return created
    } catch (requestError) {
      if (requestError.status === 409) {
        const existing = conversations.find((conversation) => conversation.client_id === clientId)
        if (existing) {
          setSelectedConversationId(existing.id)
          setView('messages')
          return existing
        }
      }
      throw requestError
    }
  }

  async function sendMessage(body) {
    if (!selectedConversationId) return
    await apiRequest('/messages', {
      token,
      method: 'POST',
      body: JSON.stringify({ conversation_id: selectedConversationId, plaintext_body: body }),
    })
    await loadMessages(selectedConversationId)
  }

  const visibleNav = NAV_ITEMS.filter(([key]) => isProfessional || !['clients', 'audit'].includes(key))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup sidebar-brand">
          <div className="brand-mark">C</div>
          <span>Clinly</span>
        </div>
        <nav>
          {visibleNav.map(([key, label]) => (
            <button key={key} className={view === key ? 'nav-button active' : 'nav-button'} onClick={() => setView(key)}>
              <span className="nav-dot" />{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="avatar">{user.email.slice(0, 1).toUpperCase()}</span>
          <div><strong>{isProfessional ? 'Professional' : 'Participant'}</strong><span>{user.email}</span></div>
        </div>
        <button className="secondary-button full" onClick={onLogout}>Sign out</button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="kicker">{isProfessional ? 'Professional workspace' : 'My private portal'}</span>
            <h1>{viewTitle(view)}</h1>
          </div>
          <div className="privacy-chip"><span />Encrypted portal data</div>
        </header>

        {notice && <div className="notice success">{notice}</div>}
        {error && <div className="notice error dismissible">{error}<button onClick={() => setError('')}>×</button></div>}

        {loading ? (
          <div className="empty-state"><div className="spinner" /><p>Loading your workspace…</p></div>
        ) : (
          <>
            {view === 'home' && <Overview user={user} clients={clients} tracks={tracks} conversations={conversations} onOpenTrack={(id) => { setSelectedTrackId(id); setView('portal') }} />}
            {view === 'portal' && <PortalWorkspace isProfessional={isProfessional} clients={clients} tracks={tracks} selectedTrack={selectedTrack} entries={entries} onSelectTrack={setSelectedTrackId} onCreateTrack={createTrack} onCreateEntry={createEntry} />}
            {view === 'messages' && <MessagesWorkspace isProfessional={isProfessional} clients={clients} conversations={conversations} selectedConversationId={selectedConversationId} messages={messages} user={user} onSelectConversation={setSelectedConversationId} onCreateConversation={createConversation} onSendMessage={sendMessage} />}
            {view === 'clients' && isProfessional && <ClientsWorkspace clients={clients} tracks={tracks} conversations={conversations} onCreateClient={createClient} onCreateTrack={createTrack} onMessage={createConversation} />}
            {view === 'audit' && isProfessional && <AuditWorkspace token={token} clients={clients} />}
          </>
        )}
      </main>
    </div>
  )
}

function viewTitle(view) {
  return {
    home: 'Overview',
    portal: 'Journal & goals',
    messages: 'Secure messages',
    clients: 'Participants',
    audit: 'Audit trail',
  }[view] || 'Clinly'
}

function Overview({ user, clients, tracks, conversations, onOpenTrack }) {
  const isProfessional = user.role === 'THERAPIST'
  const cards = isProfessional
    ? [
        ['Participants', clients.length, 'People in your workspace'],
        ['Active tracks', tracks.length, 'Care, fitness, laser, and general'],
        ['Conversations', conversations.length, 'Secure message threads'],
      ]
    : [
        ['My tracks', tracks.length, 'Your active progress spaces'],
        ['Conversations', conversations.length, 'Secure message threads'],
        ['Privacy', 'On', 'Journal and check-in payloads encrypted'],
      ]

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="kicker">{isProfessional ? 'Relationship-centered workspace' : 'Your progress, in context'}</span>
          <h2>{isProfessional ? 'Keep the person, the progress, and the conversation together.' : 'A private place to journal, track progress, and stay connected.'}</h2>
          <p>{isProfessional ? 'Clinly organizes each ongoing relationship around a secure track instead of forcing every person into the same clinical workflow.' : 'Your entries are shared only inside the relationship track you belong to.'}</p>
        </div>
        <div className="hero-orb">C</div>
      </section>

      <section className="metric-grid">
        {cards.map(([label, value, detail]) => <article className="metric-card" key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="kicker">Recent portals</span><h3>Relationship tracks</h3></div></div>
        {tracks.length ? (
          <div className="track-grid">
            {tracks.slice(0, 6).map((track) => <TrackCard key={track.id} track={track} onClick={() => onOpenTrack(track.id)} />)}
          </div>
        ) : <Empty title="No tracks yet" detail={isProfessional ? 'Create a participant, then start a care, fitness, laser, or general track.' : 'Your professional has not created a track for you yet.'} />}
      </section>
    </div>
  )
}

function TrackCard({ track, selected = false, onClick }) {
  const meta = TRACK_META[track.kind] || TRACK_META.GENERAL
  return (
    <button className={selected ? 'track-card selected' : 'track-card'} onClick={onClick}>
      <span className={`track-icon kind-${track.kind.toLowerCase()}`}>{meta.label.slice(0, 1)}</span>
      <span className="track-card-copy"><small>{meta.eyebrow}</small><strong>{track.title}</strong><span>{meta.description}</span></span>
      <span className="chevron">›</span>
    </button>
  )
}

function PortalWorkspace({ isProfessional, clients, tracks, selectedTrack, entries, onSelectTrack, onCreateTrack, onCreateEntry }) {
  const [showCreate, setShowCreate] = useState(false)
  return (
    <div className="portal-layout">
      <section className="track-rail section-card">
        <div className="section-heading">
          <div><span className="kicker">Your spaces</span><h3>Tracks</h3></div>
          {isProfessional && <button className="small-button" onClick={() => setShowCreate((value) => !value)}>+ New</button>}
        </div>
        {showCreate && isProfessional && <TrackCreateForm clients={clients} onCreate={async (values) => { await onCreateTrack(values); setShowCreate(false) }} />}
        <div className="track-list">
          {tracks.map((track) => <TrackCard key={track.id} track={track} selected={track.id === selectedTrack?.id} onClick={() => onSelectTrack(track.id)} />)}
        </div>
        {!tracks.length && <Empty title="No relationship tracks" detail={isProfessional ? 'Create one to begin journaling and progress tracking.' : 'Nothing has been shared with you yet.'} />}
      </section>

      <section className="journal-panel section-card">
        {selectedTrack ? (
          <>
            <div className="journal-header">
              <div><span className="kicker">{TRACK_META[selectedTrack.kind]?.eyebrow}</span><h2>{selectedTrack.title}</h2><p>{TRACK_META[selectedTrack.kind]?.description}</p></div>
              <span className="privacy-chip compact"><span />Private</span>
            </div>
            <EntryComposer track={selectedTrack} onCreate={onCreateEntry} />
            <div className="timeline">
              {entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
              {!entries.length && <Empty title="No entries yet" detail="Use the check-in above to start the timeline." />}
            </div>
          </>
        ) : <Empty title="Choose a track" detail="Select a relationship track to open its journal and progress timeline." />}
      </section>
    </div>
  )
}

function TrackCreateForm({ clients, onCreate }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '')
  const [kind, setKind] = useState('CARE')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!clientId && clients[0]?.id) setClientId(clients[0].id)
  }, [clients, clientId])

  async function submit(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      await onCreate({ client_id: clientId, kind, title })
      setTitle('')
    } catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <label>Participant<select value={clientId} onChange={(event) => setClientId(event.target.value)} required><option value="">Choose participant</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.email}</option>)}</select></label>
      <label>Track type<select value={kind} onChange={(event) => setKind(event.target.value)}>{Object.entries(TRACK_META).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}</select></label>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Strength goals" required /></label>
      {error && <div className="notice error">{error}</div>}
      <button className="primary-button" disabled={busy || !clients.length}>{busy ? 'Creating…' : 'Create track'}</button>
    </form>
  )
}

function EntryComposer({ track, onCreate }) {
  const initial = useMemo(() => initialEntryValues(track.kind), [track.kind])
  const [values, setValues] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setValues(initialEntryValues(track.kind)), [track.id, track.kind])

  function set(name, value) { setValues((current) => ({ ...current, [name]: value })) }

  async function submit(event) {
    event.preventDefault()
    const payload = normalizeEntryPayload(track.kind, values)
    if (!Object.keys(payload).length) {
      setError('Add at least one note or progress value.')
      return
    }
    setBusy(true); setError('')
    try {
      await onCreate({ track_id: track.id, entry_type: entryTypeFor(track.kind), payload })
      setValues(initialEntryValues(track.kind))
    } catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-title"><div><strong>Add a check-in</strong><span>{track.kind === 'LASER_HAIR_REMOVAL' ? 'Record observations, not a diagnosis.' : 'Capture what changed since the last entry.'}</span></div><span className="lock-pill">Encrypted</span></div>
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
          <label>Treatment area<input value={values.treatment_area} onChange={(event) => set('treatment_area', event.target.value)} placeholder="Face, legs…" /></label>
          <label>Redness 0–5<input type="number" min="0" max="5" value={values.redness} onChange={(event) => set('redness', event.target.value)} /></label>
          <label>Sensitivity 0–5<input type="number" min="0" max="5" value={values.sensitivity} onChange={(event) => set('sensitivity', event.target.value)} /></label>
          <label>Irritation 0–5<input type="number" min="0" max="5" value={values.irritation} onChange={(event) => set('irritation', event.target.value)} /></label>
        </div>
      )}
      {(track.kind === 'CARE' || track.kind === 'GENERAL') && (
        <div className="form-grid two">
          <label>Mood / theme<input value={values.mood} onChange={(event) => set('mood', event.target.value)} placeholder="Calm, anxious, hopeful…" /></label>
          <label>Wellbeing 1–5<input type="number" min="1" max="5" value={values.wellbeing_rating} onChange={(event) => set('wellbeing_rating', event.target.value)} /></label>
        </div>
      )}
      <label>Journal note<textarea rows="4" value={values.journal_text} onChange={(event) => set('journal_text', event.target.value)} placeholder="What changed? What did you notice? What do you want to remember?" /></label>
      {error && <div className="notice error">{error}</div>}
      <div className="composer-actions"><small>Free text and check-in details are encrypted before database storage.</small><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save check-in'}</button></div>
    </form>
  )
}

function initialEntryValues(kind) {
  if (kind === 'FITNESS') return { journal_text: '', goal_name: '', goal_target: '', progress_percent: '', measurement_label: '', measurement_value: '', measurement_unit: '' }
  if (kind === 'LASER_HAIR_REMOVAL') return { journal_text: '', session_date: new Date().toISOString().slice(0, 10), treatment_area: '', redness: '', sensitivity: '', irritation: '' }
  return { journal_text: '', mood: '', wellbeing_rating: '' }
}

function normalizeEntryPayload(kind, values) {
  const numeric = new Set(kind === 'FITNESS' ? ['progress_percent', 'measurement_value'] : kind === 'LASER_HAIR_REMOVAL' ? ['redness', 'sensitivity', 'irritation'] : ['wellbeing_rating'])
  const payload = {}
  for (const [key, rawValue] of Object.entries(values)) {
    if (rawValue === '' || rawValue === null || rawValue === undefined) continue
    payload[key] = numeric.has(key) ? Number(rawValue) : rawValue
  }
  return payload
}

function entryTypeFor(kind) {
  return { CARE: 'CARE_JOURNAL', FITNESS: 'FITNESS_CHECKIN', LASER_HAIR_REMOVAL: 'SKIN_CHECKIN', GENERAL: 'JOURNAL' }[kind] || 'JOURNAL'
}

function EntryCard({ entry }) {
  const note = entry.payload.journal_text
  const details = Object.entries(entry.payload).filter(([key]) => key !== 'journal_text')
  return (
    <article className="entry-card">
      <div className="entry-meta"><span>{humanizeKey(entry.entry_type)}</span><time>{formatDate(entry.created_at)}</time></div>
      {note && <p className="journal-text">{note}</p>}
      {details.length > 0 && <div className="entry-detail-grid">{details.map(([key, value]) => <div key={key}><small>{humanizeKey(key)}</small><strong>{String(value)}</strong></div>)}</div>}
    </article>
  )
}

function ClientsWorkspace({ clients, tracks, conversations, onCreateClient, onCreateTrack, onMessage }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await onCreateClient({ email, password }); setEmail(''); setPassword('') }
    catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="page-stack">
      <section className="section-card split-card">
        <div><span className="kicker">Add someone</span><h2>Create a participant portal</h2><p>Use a participant account for a patient/client, fitness candidate, laser hair-removal customer, or another ongoing relationship.</p></div>
        <form className="compact-form" onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Temporary password<input type="password" minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <div className="notice error">{error}</div>}
          <button className="primary-button" disabled={busy}>{busy ? 'Creating…' : 'Create participant'}</button>
        </form>
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="kicker">Workspace</span><h3>Participants</h3></div><span className="count-pill">{clients.length}</span></div>
        <div className="client-grid">
          {clients.map((client) => {
            const clientTracks = tracks.filter((track) => track.client_user_id === client.id)
            const conversation = conversations.find((item) => item.client_id === client.id)
            return <article className="client-card" key={client.id}>
              <div className="client-head"><span className="avatar large">{client.email.slice(0, 1).toUpperCase()}</span><div><strong>{client.email}</strong><span>{clientTracks.length} track{clientTracks.length === 1 ? '' : 's'}</span></div></div>
              <div className="mini-tags">{clientTracks.map((track) => <span key={track.id}>{TRACK_META[track.kind]?.label}</span>)}</div>
              <div className="client-actions"><button className="secondary-button" onClick={() => onMessage(client.id)}>{conversation ? 'Open messages' : 'Start messages'}</button></div>
            </article>
          })}
        </div>
        {!clients.length && <Empty title="No participants yet" detail="Create the first participant account above." />}
      </section>
    </div>
  )
}

function MessagesWorkspace({ isProfessional, clients, conversations, selectedConversationId, messages, user, onSelectConversation, onCreateConversation, onSendMessage }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function createThread() {
    setBusy(true); setError('')
    try { await onCreateConversation(clientId) }
    catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  async function send(event) {
    event.preventDefault()
    if (!body.trim()) return
    setBusy(true); setError('')
    try { await onSendMessage(body.trim()); setBody('') }
    catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="message-layout section-card">
      <aside className="conversation-list">
        <div className="section-heading"><div><span className="kicker">Threads</span><h3>Messages</h3></div></div>
        {isProfessional && clients.length > 0 && <div className="new-thread"><select value={clientId} onChange={(event) => setClientId(event.target.value)}>{clients.map((client) => <option value={client.id} key={client.id}>{client.email}</option>)}</select><button className="small-button" onClick={createThread} disabled={busy}>+ Thread</button></div>}
        {conversations.map((conversation) => {
          const client = clients.find((item) => item.id === conversation.client_id)
          const label = isProfessional ? client?.email || 'Participant' : 'Secure conversation'
          return <button key={conversation.id} className={conversation.id === selectedConversationId ? 'conversation-button active' : 'conversation-button'} onClick={() => onSelectConversation(conversation.id)}><span className="avatar">{label.slice(0, 1).toUpperCase()}</span><span><strong>{label}</strong><small>{formatDate(conversation.created_at)}</small></span></button>
        })}
      </aside>

      <section className="message-panel">
        {selectedConversationId ? <>
          <div className="message-header"><div><span className="kicker">Encrypted at rest</span><h3>Secure conversation</h3></div><span className="lock-pill">Private</span></div>
          <div className="message-stream">
            {messages.map((message) => <div className={message.sender_user_id === user.id ? 'message-bubble mine' : 'message-bubble'} key={message.id}><p>{message.plaintext_body}</p><small>{formatDate(message.created_at)}</small></div>)}
            {!messages.length && <Empty title="No messages yet" detail="Start the conversation below." />}
          </div>
          <form className="message-composer" onSubmit={send}><textarea rows="2" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a secure message…" /><button className="primary-button" disabled={busy || !body.trim()}>Send</button></form>
          {error && <div className="notice error">{error}</div>}
        </> : <Empty title="Choose a conversation" detail={isProfessional ? 'Select a thread or start one for a participant.' : 'No secure conversation has been opened yet.'} />}
      </section>
    </div>
  )
}

function AuditWorkspace({ token, clients }) {
  const [clientId, setClientId] = useState(clients[0]?.id || '')
  const [events, setEvents] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (!clientId && clients[0]?.id) setClientId(clients[0].id) }, [clients, clientId])

  async function load() {
    if (!clientId) return
    setBusy(true); setError('')
    try { setEvents(await apiRequest(`/audit?${new URLSearchParams({ subject_user_id: clientId })}`, { token })) }
    catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  async function exportCsv() {
    setBusy(true); setError('')
    try { await downloadAudit({ token, clientId }) }
    catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  return (
    <section className="section-card">
      <div className="section-heading"><div><span className="kicker">Evidence</span><h2>Audit trail</h2><p>Review security and access events for an owned participant.</p></div></div>
      <div className="audit-controls"><select value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">Choose participant</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.email}</option>)}</select><button className="secondary-button" onClick={load} disabled={busy || !clientId}>Load events</button><button className="primary-button" onClick={exportCsv} disabled={busy || !clientId}>Export CSV</button></div>
      {error && <div className="notice error">{error}</div>}
      <div className="audit-table-wrap"><table><thead><tr><th>Time</th><th>Action</th><th>Resource</th><th>Result</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{formatDate(event.timestamp)}</td><td>{humanizeKey(event.action)}</td><td>{event.resource_type || '—'}</td><td><span className={event.success ? 'status-ok' : 'status-denied'}>{event.success ? 'Success' : 'Denied'}</span></td></tr>)}</tbody></table></div>
      {!events.length && <Empty title="No audit events loaded" detail="Choose a participant and load their scoped audit history." />}
    </section>
  )
}

function Empty({ title, detail }) {
  return <div className="empty"><span className="empty-icon">○</span><strong>{title}</strong><p>{detail}</p></div>
}

export default App
