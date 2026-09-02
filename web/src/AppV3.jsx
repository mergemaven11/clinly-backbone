import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiRequest } from './api'
import AuditWorkspace from './AuditWorkspace'
import AuthPage from './AuthPage'
import {
  APP_INITIAL,
  APP_NAME,
  SESSION_TOKEN_KEY,
  clearSessionToken,
  readSessionToken,
} from './brand'
import BusinessWorkspace from './BusinessWorkspace'
import CalendarWorkspace from './CalendarWorkspace'
import { IS_DEMO_MODE } from './demoApi'
import IntegrationsWorkspace from './IntegrationsWorkspace'
import MessagesWorkspace from './MessagesWorkspace'
import Overview from './Overview'
import PatientJournalWorkspace from './PatientJournalWorkspace'
import PeopleWorkspace from './PeopleWorkspace'
import { isProviderRole, TRACK_META } from './platformMeta'
import PortalWorkspace from './PortalWorkspace'
import PublicBookingPage from './PublicBookingPage'
import PublicProviderPage from './PublicProviderPage'

const NAV_ITEMS = [
  ['home', 'Overview', 'OV'],
  ['business', 'Business', 'BU'],
  ['calendar', 'Calendar', 'CA'],
  ['journal', 'Journal', 'JR'],
  ['portal', 'Plans & progress', 'PL'],
  ['messages', 'Messages', 'MS'],
  ['clients', 'People', 'PE'],
  ['integrations', 'Integrations', 'IN'],
  ['audit', 'Activity log', 'AL'],
]

const PROVIDER_ONLY_VIEWS = new Set(['business', 'clients', 'integrations', 'audit'])
const PATIENT_ONLY_VIEWS = new Set(['journal'])

function navLabel(key, defaultLabel, isProvider) {
  if (isProvider) return defaultLabel
  return {
    home: 'Patient home',
    calendar: 'Appointments',
    journal: 'My journal',
    portal: 'My plans & progress',
    messages: 'My messages',
  }[key] || defaultLabel
}

function viewTitle(view) {
  return {
    home: 'Overview',
    business: 'Business',
    calendar: 'Calendar',
    journal: 'Daily Journal',
    portal: 'Plans & progress',
    messages: 'Messages',
    clients: 'People',
    integrations: 'Integrations',
    audit: 'Activity log',
  }[view] || APP_NAME
}

function AppV3() {
  const publicMatch = window.location.pathname.match(/^\/p\/([^/]+)\/?$/)
  const bookingMatch = window.location.pathname.match(/^\/book\/([^/]+)\/([^/]+)\/?$/)
  const publicSlug = publicMatch ? decodeURIComponent(publicMatch[1]) : ''
  const bookingSlug = bookingMatch ? decodeURIComponent(bookingMatch[1]) : ''
  const bookingServiceId = bookingMatch ? decodeURIComponent(bookingMatch[2]) : ''
  const isPublicRoute = Boolean(publicSlug || bookingMatch)
  const [token, setToken] = useState(() => readSessionToken())
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(token) && !isPublicRoute)

  useEffect(() => {
    if (!isPublicRoute) document.title = `${APP_NAME} Portal`
  }, [isPublicRoute])

  useEffect(() => {
    if (isPublicRoute) {
      setLoading(false)
      return
    }
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    apiRequest('/account/me', { token })
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
  }, [token, isPublicRoute])

  function handleToken(nextToken) {
    sessionStorage.setItem(SESSION_TOKEN_KEY, nextToken)
    setToken(nextToken)
  }

  function logout() {
    clearSessionToken()
    setToken('')
    setUser(null)
  }

  if (bookingMatch) return <PublicBookingPage slug={bookingSlug} serviceId={bookingServiceId} />
  if (publicSlug) return <PublicProviderPage slug={publicSlug} />

  if (loading) {
    return (
      <div className="center-screen">
        <div className="brand-mark">{APP_INITIAL}</div>
        <p>Opening your workspace…</p>
      </div>
    )
  }

  if (!token || !user) return <AuthPage onToken={handleToken} />

  return <PlatformWorkspace token={token} user={user} onLogout={logout} />
}

function PlatformWorkspace({ token, user, onLogout }) {
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
      if (isProvider) requests.push(apiRequest('/participants', { token }))
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

  useEffect(() => {
    if (!isProvider && PROVIDER_ONLY_VIEWS.has(view)) setView('home')
    if (isProvider && PATIENT_ONLY_VIEWS.has(view)) setView('home')
  }, [isProvider, view])

  function flash(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  async function createPerson(values) {
    const created = await apiRequest('/auth/create-participant', {
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
    return created
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

  const visibleNav = NAV_ITEMS.filter(([key]) => (
    isProvider ? !PATIENT_ONLY_VIEWS.has(key) : !PROVIDER_ONLY_VIEWS.has(key)
  ))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup sidebar-brand">
          <div className="brand-mark">{APP_INITIAL}</div>
          <span>{APP_NAME}</span>
          <span className="beta-badge">BETA</span>
        </div>
        <span className="sidebar-label">Workspace</span>
        <nav>
          {visibleNav.map(([key, label, icon]) => (
            <button key={key} className={view === key ? 'nav-button active' : 'nav-button'} type="button" onClick={() => setView(key)}>
              <span className="nav-icon" aria-hidden="true">{icon}</span><span>{navLabel(key, label, isProvider)}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="avatar">{user.email.slice(0, 1).toUpperCase()}</span>
          <div><strong>{isProvider ? 'Provider' : 'Patient'}</strong><span>{user.email}</span></div>
        </div>
        <button className="secondary-button full" type="button" onClick={onLogout}>Sign out</button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="kicker">{isProvider ? 'Provider workspace' : 'Patient portal'}</span>
            <h1>{viewTitle(view)}</h1>
          </div>
          <div className={IS_DEMO_MODE ? 'privacy-chip demo-chip' : 'privacy-chip'}><span />{IS_DEMO_MODE ? 'Seeded demo data' : isProvider ? 'Protected workspace data' : 'Private patient workspace'}</div>
        </header>

        {IS_DEMO_MODE && (
          <div className="demo-banner">
            <strong>Demo environment</strong>
            <span>Explore freely—changes are local to this tab and no real personal data is used.</span>
            <a href="https://github.com/mergemaven11/clinly-backbone" target="_blank" rel="noreferrer">View source</a>
          </div>
        )}

        {notice && <div className="notice success">{notice}</div>}
        {error && <div className="notice error dismissible">{error}<button type="button" onClick={() => setError('')}>×</button></div>}

        {loading ? (
          <div className="empty-state"><div className="spinner" /><p>Loading your workspace…</p></div>
        ) : (
          <>
            {view === 'home' && (
              <Overview
                user={user}
                people={people}
                tracks={tracks}
                conversations={conversations}
                onOpenTrack={(id) => { setSelectedTrackId(id); setView('portal') }}
                onOpenIntegrations={() => setView('integrations')}
              />
            )}
            {view === 'business' && isProvider && <BusinessWorkspace token={token} />}
            {view === 'calendar' && <CalendarWorkspace token={token} isProvider={isProvider} people={people} />}
            {view === 'journal' && !isProvider && <PatientJournalWorkspace />}
            {view === 'portal' && (
              <PortalWorkspace
                isProvider={isProvider}
                people={people}
                tracks={tracks}
                selectedTrack={selectedTrack}
                entries={entries}
                onSelectTrack={setSelectedTrackId}
                onCreateTrack={createTrack}
                onCreateEntry={createEntry}
              />
            )}
            {view === 'messages' && (
              <MessagesWorkspace
                isProvider={isProvider}
                people={people}
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                messages={messages}
                user={user}
                onSelectConversation={setSelectedConversationId}
                onCreateConversation={createConversation}
                onSendMessage={sendMessage}
              />
            )}
            {view === 'clients' && isProvider && (
              <PeopleWorkspace
                people={people}
                tracks={tracks}
                conversations={conversations}
                onCreatePerson={createPerson}
                onMessage={createConversation}
              />
            )}
            {view === 'integrations' && isProvider && <IntegrationsWorkspace token={token} />}
            {view === 'audit' && isProvider && <AuditWorkspace token={token} people={people} />}
          </>
        )}
      </main>
    </div>
  )
}

export default AppV3
