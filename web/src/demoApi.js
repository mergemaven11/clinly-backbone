export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'
export const DEMO_PROVIDER_EMAIL = 'demo@clinly.app'
export const DEMO_PATIENT_EMAIL = 'patient@clinly.app'
export const DEMO_PASSWORD = 'ClinlyDemo2026!'
export const DEMO_PROVIDER_TOKEN = 'clinly-demo-provider-session'
export const DEMO_PATIENT_TOKEN = 'clinly-demo-patient-session'

const PROVIDER_ID = 'demo-provider-1'

function daysAgo(days, hour = 14) {
  const value = new Date()
  value.setHours(hour, 0, 0, 0)
  value.setDate(value.getDate() - days)
  return value.toISOString()
}

function seedState() {
  const people = [
    { id: 'demo-person-1', email: DEMO_PATIENT_EMAIL, role: 'PARTICIPANT', provider_id: PROVIDER_ID, is_active: true },
    { id: 'demo-person-2', email: 'jordan.brooks@example.demo', role: 'PARTICIPANT', provider_id: PROVIDER_ID, is_active: true },
    { id: 'demo-person-3', email: 'alex.rivera@example.demo', role: 'PARTICIPANT', provider_id: PROVIDER_ID, is_active: true },
  ]

  const tracks = [
    { id: 'demo-track-1', professional_user_id: PROVIDER_ID, client_user_id: people[0].id, kind: 'FITNESS', title: 'Strength & mobility goals', created_at: daysAgo(52) },
    { id: 'demo-track-2', professional_user_id: PROVIDER_ID, client_user_id: people[0].id, kind: 'GENERAL', title: 'Weekly accountability', created_at: daysAgo(39) },
    { id: 'demo-track-3', professional_user_id: PROVIDER_ID, client_user_id: people[1].id, kind: 'CARE', title: 'Wellbeing check-ins', created_at: daysAgo(28) },
    { id: 'demo-track-4', professional_user_id: PROVIDER_ID, client_user_id: people[2].id, kind: 'LASER_HAIR_REMOVAL', title: 'Treatment progress', created_at: daysAgo(20) },
  ]

  const conversations = people.map((person, index) => ({
    id: `demo-conversation-${index + 1}`,
    therapist_id: PROVIDER_ID,
    client_id: person.id,
    created_at: daysAgo(18 - index * 3),
  }))

  return {
    providerUser: { id: PROVIDER_ID, email: DEMO_PROVIDER_EMAIL, role: 'PROVIDER', provider_id: null, is_active: true },
    people,
    tracks,
    entries: [
      { id: 'demo-entry-1', track_id: 'demo-track-1', author_user_id: people[0].id, entry_type: 'FITNESS_CHECKIN', payload: { goal_name: 'Complete three strength sessions', goal_target: '3 sessions / week', progress_percent: 82, measurement_label: 'Weekly sessions', measurement_value: 3, measurement_unit: 'sessions', journal_text: 'Mobility work felt smoother this week and recovery improved.' }, created_at: daysAgo(3, 18) },
      { id: 'demo-entry-2', track_id: 'demo-track-1', author_user_id: PROVIDER_ID, entry_type: 'FITNESS_CHECKIN', payload: { progress_percent: 70, journal_text: 'Adjusted the next block to add a lighter recovery day.' }, created_at: daysAgo(10, 11) },
      { id: 'demo-entry-3', track_id: 'demo-track-2', author_user_id: people[0].id, entry_type: 'JOURNAL', payload: { mood: 'Focused', wellbeing_rating: 8, journal_text: 'Stayed consistent with the morning routine four days this week.' }, created_at: daysAgo(2, 9) },
      { id: 'demo-entry-4', track_id: 'demo-track-3', author_user_id: people[1].id, entry_type: 'CARE_JOURNAL', payload: { mood: 'Hopeful', wellbeing_rating: 7, journal_text: 'The new schedule made the week feel more manageable.' }, created_at: daysAgo(4, 16) },
      { id: 'demo-entry-5', track_id: 'demo-track-4', author_user_id: people[2].id, entry_type: 'SKIN_CHECKIN', payload: { session_date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), treatment_area: 'Face', redness: 2, sensitivity: 1, irritation: 1, journal_text: 'Mild redness settled by the following morning.' }, created_at: daysAgo(7, 19) },
    ],
    conversations,
    messages: [
      { id: 'demo-message-1', conversation_id: conversations[0].id, sender_user_id: people[0].id, plaintext_body: 'The mobility routine is helping a lot. Should I keep the same pace this week?', created_at: daysAgo(2, 10) },
      { id: 'demo-message-2', conversation_id: conversations[0].id, sender_user_id: PROVIDER_ID, plaintext_body: 'Yes—keep the pace comfortable and use the check-in if anything changes.', created_at: daysAgo(2, 11) },
      { id: 'demo-message-3', conversation_id: conversations[1].id, sender_user_id: people[1].id, plaintext_body: 'I added today\'s reflection. The shorter weekly plan feels realistic.', created_at: daysAgo(4, 17) },
      { id: 'demo-message-4', conversation_id: conversations[1].id, sender_user_id: PROVIDER_ID, plaintext_body: 'Great. We will review the pattern together at the next touchpoint.', created_at: daysAgo(4, 18) },
      { id: 'demo-message-5', conversation_id: conversations[2].id, sender_user_id: PROVIDER_ID, plaintext_body: 'Your progress space is ready whenever you want to add the next observation.', created_at: daysAgo(5, 15) },
    ],
    profile: {
      provider_user_id: PROVIDER_ID,
      display_name: 'Morgan Reed',
      business_name: 'Reed Wellness Studio',
      provider_type: 'Wellness & performance coach',
      headline: 'Practical support for sustainable progress.',
      bio: 'I help people turn big goals into clear, repeatable steps through connected plans, check-ins, and ongoing accountability.',
      categories: ['Wellness', 'Fitness', 'Accountability'],
      pronouns: 'they/them',
      timezone: 'America/New_York',
      locale: 'en-US',
      locations: [
        { label: 'Virtual', kind: 'VIRTUAL', address: null, public: true },
        { label: 'Midtown studio', kind: 'IN_PERSON', address: 'Atlanta, GA', public: true },
      ],
      credentials: [
        { name: 'Certified Personal Trainer', issuer: 'Demo credential', reference: null, expires_on: null, public: true },
      ],
      public_slug: 'morgan-reed',
      is_public: true,
      created_at: daysAgo(120),
      updated_at: daysAgo(5),
    },
    services: [
      { id: 'demo-service-1', provider_user_id: PROVIDER_ID, name: 'Progress planning session', description: 'A focused session to define the next milestone and build a realistic action plan.', duration_minutes: 60, price_minor: 9500, currency: 'USD', delivery_mode: 'HYBRID', capacity: 1, location_labels: ['Virtual', 'Midtown studio'], intake_required: true, is_public: true, active: true, created_at: daysAgo(70), updated_at: daysAgo(8), archived_at: null },
      { id: 'demo-service-2', provider_user_id: PROVIDER_ID, name: 'Monthly accountability', description: 'Ongoing check-ins, secure messaging, and shared progress tracking.', duration_minutes: 30, price_minor: 14900, currency: 'USD', delivery_mode: 'VIRTUAL', capacity: 1, location_labels: ['Virtual'], intake_required: false, is_public: true, active: true, created_at: daysAgo(64), updated_at: daysAgo(12), archived_at: null },
    ],
    integrations: [
      { key: 'google_calendar', display_name: 'Google Calendar', category: 'CALENDAR', description: 'Sync provider availability and bookings with Google Calendar.', capabilities: ['calendar_read', 'calendar_write', 'booking_sync'], availability: 'PLANNED', entitlement: 'PAID_ADDON', setup_type: 'OAUTH2_PKCE' },
      { key: 'microsoft_outlook', display_name: 'Microsoft Outlook Calendar', category: 'CALENDAR', description: 'Sync provider availability and bookings with Microsoft Outlook.', capabilities: ['calendar_read', 'calendar_write', 'booking_sync'], availability: 'PLANNED', entitlement: 'PAID_ADDON', setup_type: 'OAUTH2_PKCE' },
      { key: 'zoom', display_name: 'Zoom', category: 'VIDEO', description: 'Create provider session rooms from eligible bookings.', capabilities: ['meeting_create', 'meeting_join', 'meeting_cancel'], availability: 'PLANNED', entitlement: 'PLAN_GATED', setup_type: 'OAUTH2' },
      { key: 'stripe', display_name: 'Stripe', category: 'PAYMENTS', description: 'Accept service payments, subscriptions, invoices, and provider payouts.', capabilities: ['payments', 'subscriptions', 'invoices', 'refunds', 'payouts'], availability: 'PLANNED', entitlement: 'INCLUDED', setup_type: 'MANAGED' },
      { key: 'zapier_webhooks', display_name: 'Zapier & Webhooks', category: 'AUTOMATION', description: 'Send provider-approved workflow events to automation tools and custom systems.', capabilities: ['outgoing_events', 'workflow_automation'], availability: 'PLANNED', entitlement: 'PAID_ADDON', setup_type: 'WEBHOOK' },
    ],
    connections: [],
    auditEvents: people.flatMap((person, personIndex) => [
      { id: `demo-audit-${personIndex + 1}-1`, timestamp: daysAgo(2 + personIndex), actor_user_id: PROVIDER_ID, subject_user_id: person.id, action: 'portal_entries_read', resource_type: 'portal_track', resource_id: tracks.find((track) => track.client_user_id === person.id)?.id || null, success: true, ip_address: null, user_agent: 'Clinly demo', metadata: {} },
      { id: `demo-audit-${personIndex + 1}-2`, timestamp: daysAgo(5 + personIndex), actor_user_id: person.id, subject_user_id: person.id, action: 'message_created', resource_type: 'conversation', resource_id: conversations[personIndex].id, success: true, ip_address: null, user_agent: 'Clinly demo', metadata: {} },
      { id: `demo-audit-${personIndex + 1}-3`, timestamp: daysAgo(9 + personIndex), actor_user_id: 'foreign-demo-user', subject_user_id: person.id, action: 'authorization_denied', resource_type: 'portal_track', resource_id: null, success: false, ip_address: null, user_agent: 'Clinly demo', metadata: { reason: 'relationship_scope' } },
    ]),
  }
}

let state = seedState()

function copy(value) {
  return structuredClone(value)
}

function response(value) {
  return Promise.resolve(copy(value))
}

function parseBody(options) {
  if (!options.body) return {}
  return typeof options.body === 'string' ? JSON.parse(options.body) : options.body
}

function fail(message, status = 400) {
  const error = new Error(message)
  error.status = status
  throw error
}

function requireDemoToken(path, token) {
  const isPublic = path === '/auth/login' || path === '/auth/signup-provider' || path.startsWith('/public/providers/')
  if (!isPublic && token !== DEMO_PROVIDER_TOKEN && token !== DEMO_PATIENT_TOKEN) fail('Demo session expired. Sign in again.', 401)
}

function userForToken(token) {
  if (token === DEMO_PATIENT_TOKEN) return state.people[0]
  return state.providerUser
}

function tracksForToken(token) {
  if (token === DEMO_PATIENT_TOKEN) return state.tracks.filter((track) => track.client_user_id === state.people[0].id)
  return state.tracks
}

function conversationsForToken(token) {
  if (token === DEMO_PATIENT_TOKEN) return state.conversations.filter((conversation) => conversation.client_id === state.people[0].id)
  return state.conversations
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

export function resetDemoState() {
  state = seedState()
}

export async function demoApiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const url = new URL(path, 'https://demo.clinly.local')
  const pathname = url.pathname
  requireDemoToken(pathname, options.token)

  await new Promise((resolve) => window.setTimeout(resolve, 90))

  if (pathname === '/auth/signup-provider') fail('Account creation is disabled in the public demo.', 403)
  if (pathname === '/auth/login' && method === 'POST') {
    const body = parseBody(options)
    const email = body.email?.toLowerCase()
    if (body.password !== DEMO_PASSWORD) fail('Use one of the demo accounts shown below.', 401)
    if (email === DEMO_PROVIDER_EMAIL) return response({ access_token: DEMO_PROVIDER_TOKEN, token_type: 'bearer', expires_in: 3600 })
    if (email === DEMO_PATIENT_EMAIL) return response({ access_token: DEMO_PATIENT_TOKEN, token_type: 'bearer', expires_in: 3600 })
    fail('Use one of the demo accounts shown below.', 401)
  }
  if (pathname === '/account/me') return response(userForToken(options.token))
  if (pathname === '/participants') return response(state.people)
  if (pathname === '/portal/tracks/me') return response(tracksForToken(options.token))
  if (pathname === '/conversations/me') return response(conversationsForToken(options.token))

  if (pathname === '/auth/create-participant' && method === 'POST') {
    const body = parseBody(options)
    if (state.people.some((person) => person.email === body.email?.toLowerCase())) fail('That demo person already exists.', 409)
    const person = { id: makeId('demo-person'), email: body.email.toLowerCase(), role: 'PARTICIPANT', provider_id: PROVIDER_ID, is_active: true }
    state.people.push(person)
    return response(person)
  }

  if (pathname === '/portal/tracks' && method === 'POST') {
    const body = parseBody(options)
    const track = { id: makeId('demo-track'), professional_user_id: PROVIDER_ID, client_user_id: body.client_id, kind: body.kind, title: body.title.trim(), created_at: new Date().toISOString() }
    state.tracks.unshift(track)
    return response(track)
  }

  if (pathname === '/portal/entries' && method === 'GET') {
    return response(state.entries.filter((entry) => entry.track_id === url.searchParams.get('track_id')).sort((a, b) => b.created_at.localeCompare(a.created_at)))
  }
  if (pathname === '/portal/entries' && method === 'POST') {
    const body = parseBody(options)
    const entry = { id: makeId('demo-entry'), track_id: body.track_id, author_user_id: userForToken(options.token).id, entry_type: body.entry_type, payload: body.payload, created_at: new Date().toISOString() }
    state.entries.unshift(entry)
    return response(entry)
  }

  if (pathname === '/conversations' && method === 'POST') {
    const body = parseBody(options)
    if (state.conversations.some((item) => item.client_id === body.client_id)) fail('A conversation already exists.', 409)
    const conversation = { id: makeId('demo-conversation'), therapist_id: PROVIDER_ID, client_id: body.client_id, created_at: new Date().toISOString() }
    state.conversations.unshift(conversation)
    return response(conversation)
  }

  if (pathname === '/messages' && method === 'GET') {
    return response(state.messages.filter((message) => message.conversation_id === url.searchParams.get('conversation_id')).sort((a, b) => a.created_at.localeCompare(b.created_at)))
  }
  if (pathname === '/messages' && method === 'POST') {
    const body = parseBody(options)
    const message = { id: makeId('demo-message'), conversation_id: body.conversation_id, sender_user_id: userForToken(options.token).id, plaintext_body: body.plaintext_body, created_at: new Date().toISOString() }
    state.messages.push(message)
    return response(message)
  }

  if (pathname === '/audit') {
    return response(state.auditEvents.filter((event) => event.subject_user_id === url.searchParams.get('subject_user_id')).sort((a, b) => b.timestamp.localeCompare(a.timestamp)))
  }

  if (pathname === '/provider/profile' && method === 'GET') return response(state.profile)
  if (pathname === '/provider/profile' && method === 'PUT') {
    state.profile = { ...state.profile, ...parseBody(options), provider_user_id: PROVIDER_ID, updated_at: new Date().toISOString() }
    return response(state.profile)
  }
  if (pathname === '/provider/services' && method === 'GET') return response(state.services)
  if (pathname === '/provider/services' && method === 'POST') {
    const now = new Date().toISOString()
    const service = { ...parseBody(options), id: makeId('demo-service'), provider_user_id: PROVIDER_ID, created_at: now, updated_at: now, archived_at: null }
    state.services.unshift(service)
    return response(service)
  }
  if (pathname.startsWith('/provider/services/')) {
    const id = pathname.split('/').pop()
    const index = state.services.findIndex((service) => service.id === id)
    if (index < 0) fail('Demo service not found.', 404)
    if (method === 'PATCH') {
      state.services[index] = { ...state.services[index], ...parseBody(options), updated_at: new Date().toISOString() }
      return response(state.services[index])
    }
    if (method === 'DELETE') {
      const [archived] = state.services.splice(index, 1)
      return response({ ...archived, archived_at: new Date().toISOString() })
    }
  }

  if (pathname === '/integrations/catalog') return response(state.integrations)
  if (pathname === '/integrations/connections') return response(state.connections)

  if (pathname.startsWith('/public/providers/')) {
    const slug = decodeURIComponent(pathname.split('/').pop())
    if (slug !== state.profile.public_slug || !state.profile.is_public) fail('This provider page is not published.', 404)
    const publicProfile = copy(state.profile)
    delete publicProfile.provider_user_id
    delete publicProfile.created_at
    delete publicProfile.updated_at
    delete publicProfile.is_public
    publicProfile.locations = publicProfile.locations.filter((item) => item.public)
    publicProfile.credentials = publicProfile.credentials.filter((item) => item.public)
    const services = state.services.filter((item) => item.is_public && item.active).map(({ provider_user_id, created_at, updated_at, archived_at, active, is_public, ...item }) => item)
    return response({ profile: publicProfile, services })
  }

  fail(`Demo route is not implemented: ${method} ${pathname}`, 404)
}

export function downloadDemoAudit(clientId) {
  const rows = state.auditEvents
    .filter((event) => event.subject_user_id === clientId)
    .map((event) => [event.timestamp, event.action, event.resource_type || '', event.success ? 'success' : 'denied'])
  const csv = [['timestamp', 'action', 'resource_type', 'result'], ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `clinly-demo-audit-${clientId}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
