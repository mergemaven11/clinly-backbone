import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiRequest, downloadAudit } from './api'
import {
  APP_INITIAL,
  APP_NAME,
  APP_TAGLINE,
  SESSION_TOKEN_KEY,
  clearSessionToken,
  readSessionToken,
} from './brand'

const TRACK_META = {
  CARE: {
    label: 'Wellbeing',
    eyebrow: 'Wellbeing & support',
    description: 'Shared check-ins, reflections, and progress for ongoing support relationships.',
  },
  FITNESS: {
    label: 'Fitness',
    eyebrow: 'Fitness & performance',
    description: 'Track goals, measurements, progress, training notes, and personal reflections.',
  },
  LASER_HAIR_REMOVAL: {
    label: 'Aesthetics',
    eyebrow: 'Sessions & observations',
    description: 'Track service sessions and descriptive progress observations over time.',
  },
  GENERAL: {
    label: 'General',
    eyebrow: 'Flexible relationship',
    description: 'A flexible shared space for goals, check-ins, notes, and progress.',
  },
}

const NAV_ITEMS = [
  ['home', 'Overview'],
  ['portal', 'Plans & progress'],
  ['messages', 'Messages'],
  ['clients', 'People'],
  ['audit', 'Activity log'],
]

function isProviderRole(role) {
  return role === 'PROVIDER' || role === 'THERAPIST'
}

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

function AppV2() {
  const [token, setToken] = useState(() => readSessionToken())
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    document.title = `${APP_NAME} Portal`
  }, [])

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
        clearSessionToken()
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
    sessionStorage.setItem(SESSION_TOKEN_KEY, nextToken)
    setToken(nextToken)
  }

  function logout() {
    clearSessionToken()
    setToken('')
    setUser(null)
  }

  if (loading) {
    return (
      <div className="center-screen">
        <div className="brand-mark">{APP_INITIAL}</div>
        <p>Opening your workspace…</p>
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
        // Legacy endpoint remains compatible until the generic provider endpoint lands.
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
          <div className="brand-mark">{APP_INITIAL}</div>
          <span>{APP_NAME}</span>
        </div>
        <div className="auth-copy">
          <span className="kicker">{APP_TAGLINE}</span>
          <h1>Run the relationship, not a pile of disconnected tools.</h1>
          <p>
            Bring messaging, progress tracking, shared plans, notes, and ongoing service relationships into one adaptable provider workspace.
          </p>
          <div className="auth-feature-grid">
            <article><strong>Organize</strong><span>Keep every relationship in context</span></article>
            <article><strong>Track</strong><span>Goals, sessions, check-ins, and progress</span></article>
            <article><strong>Message</strong><span>Stay connected between touchpoints</span></article>
            <article><strong>Adapt</strong><span>Use the same platform across service types</span></article>
          </div>
        </div>
      </section>

      <section className="auth-panel-wrap">
        <form className="auth-panel" onSubmit={submit}>
          <span className="kicker">{mode === 'login' ? 'Welcome back' : 'Provider account'}</span>
          <h2>{mode === 'login' ? 'Sign in to your workspace' : `Create your ${APP_NAME} workspace`}</h2>
          <p className="muted">
            {mode === 'login'
              ? 'People you work with can use the credentials created for their portal.'
              : 'Provider accounts can add people and create flexible relationship tracks.'}
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
            {mode === 'login' ? 'I need a provider account' : 'I already have an account'}
          </button>
        </form>
      </section>
    </main>
  )
}

function PortalApp({ token, user, onLogout }) {
  const isProvider = isProviderRole(user.role)
  const [view, setView] = useState('home')
  const [people, setPeople] = useState([])
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
      if (isProvider) requests.push(apiRequest('/clients', { token }))
      const [nextTracks, nextConversations, nextPeople = []] = await Promise.all(requests)
      setTracks(nextTracks)
      setConversations(nextConversations)
      setPeople(nextPeople)
      setSelectedTrackId((current) => current || nextTracks[0]?.id || '')
      setSelectedConversationId((current) => current || nextConversations[0]?.id || '')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [token, isProvider])

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

  async function createPerson(values) {
    const created = await apiRequest('/auth/create-client', {
      token,
      method: 'POST',
      body: JSON.stringify(values),
    })
    await loadCore()
    flash(`${created.email} added to your workspace.`)
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
    flash(`${TRACK_META[created.kind]?.label || 'Relationship'} track created.`)
  }

  async function createEntry(values) {
    const created = await apiRequest('/portal/entries', {
      token,
      method: 'POST',
      body: JSON.stringify(values),
    })
    await loadEntries(values.track_id)
    flash('Check-in saved.')
    return created
  }

  async function createConversation(personId) {
    try {
      const created = await apiRequest('/conversations', {
        token,
        method: 'POST',
        body: JSON.stringify({ client_id: personId }),
      })
      await loadCore()
      setSelectedConversationId(created.id)
      setView('messages')
      flash('Conversation opened.')
      return created
    } catch (requestError) {
      if (requestError.status === 409) {
        const existing = conversations.find((conversation) => conversation.client_id === personId)
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
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      conversation_id: selectedConversationId,
      sender_user_id: user.id,
      plaintext_body: body,
      created_at: new Date().toISOString(),
      pending: true,
    }
    setMessages((current) => [...current, optimistic])
    try {
      await apiRequest('/messages', {
        token,
        method: 'POST',
        body: JSON.stringify({ conversation_id: selectedConversationId, plaintext_body: body }),
      })
      await loadMessages(selectedConversationId)
    } catch (requestError) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id))
      throw requestError
    }
  }

  const visibleNav = NAV_ITEMS.filter(([key]) => isProvider || !['clients', 'audit'].includes(key))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup sidebar-brand">
          <div className="brand-mark">{APP_INITIAL}</div>
          <span>{APP_NAME}</span>
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
          <div><strong>{isProvider ? 'Provider' : 'Member'}</strong><span>{user.email}</span></div>
        </div>
        <button className="secondary-button full" onClick={onLogout}>Sign out</button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="kicker">{isProvider ? 'Provider workspace' : 'My workspace'}</span>
            <h1>{viewTitle(view)}</h1>
          </div>
          <div className="privacy-chip"><span />Protected workspace data</div>
        </header>

        {notice && <div className="notice success">{notice}</div>}
        {error && <div className="notice error dismissible">{error}<button onClick={() => setError('')}>×</button></div>}

        {loading ? (
          <div className="empty-state"><div className="spinner" /><p>Loading your workspace…</p></div>
        ) : (
          <>
            {view === 'home' && <Overview user={user} people={people} tracks={tracks} conversations={conversations} onOpenTrack={(id) => { setSelectedTrackId(id); setView('portal') }} />}
            {view === 'portal' && <PortalWorkspace isProvider={isProvider} people={people} tracks={tracks} selectedTrack={selectedTrack} entries={entries} onSelectTrack={setSelectedTrackId} onCreateTrack={createTrack} onCreateEntry={createEntry} />}
            {view === 'messages' && <MessagesWorkspace isProvider={isProvider} people={people} conversations={conversations} selectedConversationId={selectedConversationId} messages={messages} user={user} onSelectConversation={setSelectedConversationId} onCreateConversation={createConversation} onSendMessage={sendMessage} />}
            {view === 'clients' && isProvider && <PeopleWorkspace people={people} tracks={tracks} conversations={conversations} onCreatePerson={createPerson} onMessage={createConversation} />}
            {view === 'audit' && isProvider && <AuditWorkspace token={token} people={people} />}
          </>
        )}
      </main>
    </div>
  )
}

function viewTitle(view) {
  return {
    home: 'Overview',
    portal: 'Plans & progress',
    messages: 'Messages',
    clients: 'People',
    audit: 'Activity log',
  }[view] || APP_NAME
}

function Overview({ user, people, tracks, conversations, onOpenTrack }) {
  const isProvider = isProviderRole(user.role)
  const cards = isProvider
    ? [
        ['People', people.length, 'Relationships in your workspace'],
        ['Active tracks', tracks.length, 'Flexible service and progress spaces'],
        ['Conversations', conversations.length, 'Connected message threads'],
      ]
    : [
        ['My tracks', tracks.length, 'Your active progress spaces'],
        ['Conversations', conversations.length, 'Your message threads'],
        ['Privacy', 'On', 'Sensitive track payloads are encrypted'],
      ]

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="kicker">{isProvider ? 'Relationship-centered business workspace' : 'Your progress, in context'}</span>
          <h2>{isProvider ? 'Keep the person, the progress, and the conversation together.' : 'One place to track progress and stay connected.'}</h2>
          <p>{isProvider ? `${APP_NAME} is built around flexible provider relationships instead of forcing every business into the same workflow.` : 'Your information stays inside the relationship spaces you belong to.'}</p>
        </div>
        <div className="hero-orb">{APP_INITIAL}</div>
      </section>

      <section className="metric-grid">
        {cards.map(([label, value, detail]) => <article className="metric-card" key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="kicker">Recent spaces</span><h3>Relationship tracks</h3></div></div>
        {tracks.length ? (
          <div className="track-grid">
            {tracks.slice(0, 6).map((track) => <TrackCard key={track.id} track={track} onClick={() => onOpenTrack(track.id)} />)}
          </div>
        ) : <Empty title="No tracks yet" detail={isProvider ? 'Add someone, then start a wellbeing, fitness, aesthetics, or general track.' : 'No relationship track has been shared with you yet.'} />}
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

function PortalWorkspace({ isProvider, people, tracks, selectedTrack, entries, onSelectTrack, onCreateTrack, onCreateEntry }) {
  const [showCreate, setShowCreate] = useState(false)
  return (
    <div className="portal-layout">
      <section className="track-rail section-card">
        <div className="section-heading">
          <div><span className="kicker">Your spaces</span><h3>Tracks</h3></div>
          {isProvider && <button className="small-button" onClick={() => setShowCreate((value) => !value)}>+ New</button>}
        </div>
        {showCreate && isProvider && <TrackCreateForm people={people} onCreate={async (values) => { await onCreateTrack(values); setShowCreate(false) }} />}
        <div className="track-list">
          {tracks.map((track) => <TrackCard key={track.id} track={track} selected={track.id === selectedTrack?.id} onClick={() => onSelectTrack(track.id)} />)}
        </div>
        {!tracks.length && <Empty title="No relationship tracks" detail={isProvider ? 'Create one to begin shared progress tracking.' : 'Nothing has been shared with you yet.'} />}
      </section>

      <section className="journal-panel section-card">
        {selectedTrack ? (
          <>
            <div className="journal-header">
              <div><span className="kicker">{TRACK_META[selectedTrack.kind]?.eyebrow}</span><h2>{selectedTrack.title}</h2><p>{TRACK_META[selectedTrack.kind]?.description}</p></div>
              <span className="privacy-chip compact"><span />Protected</span>
            </div>
            <EntryComposer track={selectedTrack} onCreate={onCreateEntry} />
            <div className="timeline">
              {entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
              {!entries.length && <Empty title="No entries yet" detail="Use the check-in above to start the timeline." />}
            </div>
          </>
        ) : <Empty title="Choose a track" detail="Select a relationship track to open its progress timeline." />}
      </section>
    </div>
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
    setBusy(true); setError('')
    try {
      await onCreate({ client_id: personId, kind, title })
      setTitle('')
    } catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <label>Person<select value={personId} onChange={(event) => setPersonId(event.target.value)} required><option value="">Choose person</option>{people.map((person) => <option value={person.id} key={person.id}>{person.email}</option>)}</select></label>
      <label>Track type<select value={kind} onChange={(event) => setKind(event.target.value)}>{Object.entries(TRACK_META).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}</select></label>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Strength goals" required /></label>
      {error && <div className="notice error">{error}</div>}
      <button className="primary-button" disabled={busy || !people.length}>{busy ? 'Creating…' : 'Create track'}</button>
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
      <label>Note<textarea rows="4" value={values.journal_text} onChange={(event) => set('journal_text', event.target.value)} placeholder="What changed? What did you notice? What do you want to remember?" /></label>
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

function PeopleWorkspace({ people, tracks, conversations, onCreatePerson, onMessage }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await onCreatePerson({ email, password }); setEmail(''); setPassword('') }
    catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="page-stack">
      <section className="section-card split-card">
        <div><span className="kicker">Add someone</span><h2>Create a connected portal</h2><p>Add a client, customer, member, candidate, patient, or other person you work with. Their experience can be shaped by the services and tracks you create.</p></div>
        <form className="compact-form" onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Temporary password<input type="password" minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <div className="notice error">{error}</div>}
          <button className="primary-button" disabled={busy}>{busy ? 'Adding…' : 'Add person'}</button>
        </form>
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="kicker">Workspace</span><h3>People</h3></div><span className="count-pill">{people.length}</span></div>
        <div className="client-grid">
          {people.map((person) => {
            const personTracks = tracks.filter((track) => track.client_user_id === person.id)
            const conversation = conversations.find((item) => item.client_id === person.id)
            return <article className="client-card" key={person.id}>
              <div className="client-head"><span className="avatar large">{person.email.slice(0, 1).toUpperCase()}</span><div><strong>{person.email}</strong><span>{personTracks.length} track{personTracks.length === 1 ? '' : 's'}</span></div></div>
              <div className="mini-tags">{personTracks.map((track) => <span key={track.id}>{TRACK_META[track.kind]?.label}</span>)}</div>
              <div className="client-actions"><button className="secondary-button" onClick={() => onMessage(person.id)}>{conversation ? 'Open messages' : 'Start messages'}</button></div>
            </article>
          })}
        </div>
        {!people.length && <Empty title="No people yet" detail="Add the first person to your workspace above." />}
      </section>
    </div>
  )
}

function MessagesWorkspace({ isProvider, people, conversations, selectedConversationId, messages, user, onSelectConversation, onCreateConversation, onSendMessage }) {
  const [personId, setPersonId] = useState(people[0]?.id || '')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!personId && people[0]?.id) setPersonId(people[0].id)
  }, [people, personId])

  async function createThread() {
    setBusy(true); setError('')
    try { await onCreateConversation(personId) }
    catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  async function send(event) {
    event.preventDefault()
    if (!body.trim()) return
    const nextBody = body.trim()
    setBody('')
    setBusy(true); setError('')
    try { await onSendMessage(nextBody) }
    catch (requestError) { setBody(nextBody); setError(requestError.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="message-layout section-card">
      <aside className="conversation-list">
        <div className="section-heading"><div><span className="kicker">Threads</span><h3>Messages</h3></div></div>
        {isProvider && people.length > 0 && <div className="new-thread"><select value={personId} onChange={(event) => setPersonId(event.target.value)}>{people.map((person) => <option value={person.id} key={person.id}>{person.email}</option>)}</select><button className="small-button" onClick={createThread} disabled={busy}>+ Thread</button></div>}
        {conversations.map((conversation) => {
          const person = people.find((item) => item.id === conversation.client_id)
          const label = isProvider ? person?.email || 'Person' : 'Conversation'
          return <button key={conversation.id} className={conversation.id === selectedConversationId ? 'conversation-button active' : 'conversation-button'} onClick={() => onSelectConversation(conversation.id)}><span className="avatar">{label.slice(0, 1).toUpperCase()}</span><span><strong>{label}</strong><small>{formatDate(conversation.created_at)}</small></span></button>
        })}
      </aside>

      <section className="message-panel">
        {selectedConversationId ? <>
          <div className="message-header"><div><span className="kicker">Protected conversation</span><h3>Messages</h3></div><span className="lock-pill">Private</span></div>
          <div className="message-stream">
            {messages.map((message) => <div className={message.sender_user_id === user.id ? 'message-bubble mine' : 'message-bubble'} key={message.id}><p>{message.plaintext_body}</p><small>{message.pending ? 'Sending…' : formatDate(message.created_at)}</small></div>)}
            {!messages.length && <Empty title="No messages yet" detail="Start the conversation below." />}
          </div>
          <form className="message-composer" onSubmit={send}><textarea rows="2" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message…" /><button className="primary-button" disabled={busy || !body.trim()}>Send</button></form>
          {error && <div className="notice error">{error}</div>}
        </> : <Empty title="Choose a conversation" detail={isProvider ? 'Select a thread or start one for someone in your workspace.' : 'No conversation has been opened yet.'} />}
      </section>
    </div>
  )
}

function AuditWorkspace({ token, people }) {
  const [personId, setPersonId] = useState(people[0]?.id || '')
  const [events, setEvents] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (!personId && people[0]?.id) setPersonId(people[0].id) }, [people, personId])

  async function load() {
    if (!personId) return
    setBusy(true); setError('')
    try { setEvents(await apiRequest(`/audit?${new URLSearchParams({ subject_user_id: personId })}`, { token })) }
    catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  async function exportCsv() {
    setBusy(true); setError('')
    try { await downloadAudit({ token, clientId: personId }) }
    catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  return (
    <section className="section-card">
      <div className="section-heading"><div><span className="kicker">Workspace evidence</span><h2>Activity log</h2><p>Review security and access events for someone in your workspace.</p></div></div>
      <div className="audit-controls"><select value={personId} onChange={(event) => setPersonId(event.target.value)}><option value="">Choose person</option>{people.map((person) => <option key={person.id} value={person.id}>{person.email}</option>)}</select><button className="secondary-button" onClick={load} disabled={busy || !personId}>Load events</button><button className="primary-button" onClick={exportCsv} disabled={busy || !personId}>Export CSV</button></div>
      {error && <div className="notice error">{error}</div>}
      <div className="audit-table-wrap"><table><thead><tr><th>Time</th><th>Action</th><th>Resource</th><th>Result</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{formatDate(event.timestamp)}</td><td>{humanizeKey(event.action)}</td><td>{event.resource_type || '—'}</td><td><span className={event.success ? 'status-ok' : 'status-denied'}>{event.success ? 'Success' : 'Denied'}</span></td></tr>)}</tbody></table></div>
      {!events.length && <Empty title="No activity loaded" detail="Choose someone and load their scoped activity history." />}
    </section>
  )
}

function Empty({ title, detail }) {
  return <div className="empty"><span className="empty-icon">○</span><strong>{title}</strong><p>{detail}</p></div>
}

export default AppV2
