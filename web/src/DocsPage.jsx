import { useMemo, useState } from 'react'

import { APP_INITIAL, APP_NAME } from './brand'
import './docs.css'

const SECTIONS = [
  {
    id: 'start',
    group: 'Getting started',
    title: 'Welcome to Clinly',
    summary: 'What Clinly is, who it is for, and how the provider and client/patient sides fit together.',
    body: (
      <>
        <p><strong>Clinly is a shared service workspace.</strong> It helps service professionals manage the ongoing relationship around their work — not just a single appointment. Providers can organize services, scheduling, people, plans, progress, and messages while clients or patients get a focused portal for appointments, plans, check-ins, messages, and personal reflection.</p>
        <div className="docs-callout"><strong>Think of Clinly as the layer between appointments.</strong><span>It keeps the context of a service relationship in one place so both sides know what is happening, what comes next, and what has changed.</span></div>
        <h3>Who can use Clinly?</h3>
        <p>Clinly is designed for service professionals who work with people over time. That can include coaches, trainers, consultants, wellness professionals, aesthetics providers, and other relationship-based service businesses.</p>
        <h3>Two connected experiences</h3>
        <div className="docs-two-column">
          <article><span className="docs-eyebrow">Provider workspace</span><h4>Run the relationship</h4><p>Manage your business profile, services, availability, appointments, people, plans, progress, messaging, integrations, and activity.</p></article>
          <article><span className="docs-eyebrow">Client / patient portal</span><h4>Stay oriented</h4><p>See appointments, personal plans and progress, message your provider, and use private tools such as the Daily Journal.</p></article>
        </div>
      </>
    ),
  },
  {
    id: 'demo', group: 'Getting started', title: 'Using the demo', summary: 'Explore Clinly safely without creating a real account.',
    body: (<><p>The public Clinly demo is intentionally seeded with fictional information so you can explore both sides of the product without using real personal data.</p><h3>Provider demo</h3><p>Use the provider view to explore Business, Calendar, Plans &amp; progress, Messages, People, Integrations, and Activity log.</p><h3>Client / patient demo</h3><p>Use the client/patient view to explore appointments, personal plans and progress, messages, and the Daily Journal.</p><div className="docs-note"><strong>Demo data resets.</strong><span>Changes made in the demo are local to your browser session. Refreshing may reset the seeded demo state.</span></div></>),
  },
  {
    id: 'provider-home', group: 'Provider guide', title: 'Provider workspace overview', summary: 'A plain-language map of the provider experience.',
    body: (<><p>The provider workspace is the operational side of Clinly. Each area answers a different question.</p><div className="docs-feature-list"><article><strong>Overview</strong><span>What needs my attention right now?</span></article><article><strong>Business</strong><span>What do I offer and what does the public see?</span></article><article><strong>Calendar</strong><span>When am I available and what is booked?</span></article><article><strong>Plans &amp; progress</strong><span>What are we working on together?</span></article><article><strong>Messages</strong><span>What conversations are active?</span></article><article><strong>People</strong><span>Who am I currently working with?</span></article><article><strong>Integrations</strong><span>What external systems are connected?</span></article><article><strong>Activity log</strong><span>What important workspace actions happened?</span></article></div></>),
  },
  {
    id: 'business', group: 'Provider guide', title: 'Business profile & services', summary: 'Set up the information clients use to understand your business.',
    body: (<><p>Business is where you define the public-facing side of your Clinly workspace. It is separate from the day-to-day operational data inside your portal.</p><h3>Business profile</h3><p>Add the name, provider type, description, categories, and other profile information that explains what you do.</p><h3>Services</h3><p>Services are the things people can book. Each service can include a name, description, delivery mode, price, duration, capacity, and publishing state. A service must be active and public before it can appear on your public profile or booking flow.</p><h3>Locations and credentials</h3><p>Use locations to explain where services happen. Credentials help communicate relevant qualifications or certifications where appropriate.</p><h3>Public profile</h3><p>Your public profile is the client-facing page that can be shared outside Clinly. Publishing controls determine what is visible. You can preview the experience before sharing it.</p></>),
  },
  {
    id: 'calendar', group: 'Provider guide', title: 'Availability & calendar', summary: 'Control when people can book and manage upcoming appointments.',
    body: (<><p>The Calendar combines two related things: <strong>your availability rules</strong> and <strong>actual bookings</strong>.</p><h3>Weekly availability</h3><p>Set the regular days and hours when you accept bookings. Clinly uses those rules when generating available appointment times.</p><h3>Special hours and time off</h3><p>Exceptions let you override your normal weekly pattern. Use them when you are unavailable on a normally open day or when you want to open additional time.</p><h3>Booking policy</h3><p>Providers can control the booking horizon, minimum notice, slot interval, buffers around appointments, cancellation notice, and whether clients can reschedule or cancel themselves.</p><div className="docs-callout"><strong>Availability is not the same as an appointment.</strong><span>Availability says when a booking could happen. A booking reserves a specific time so Clinly will not offer that same interval again.</span></div></>),
  },
  {
    id: 'booking', group: 'Provider guide', title: 'Booking & appointment status', summary: 'Create, reschedule, cancel, and complete appointments.',
    body: (<><p>Clinly currently supports one-to-one booking for services with a capacity of one. Providers can book on behalf of a client/patient, and eligible public services can expose live availability through the public booking page.</p><h3>Appointment lifecycle</h3><div className="docs-steps"><span>1</span><p><strong>Confirmed</strong> — the appointment is reserved.</p><span>2</span><p><strong>Rescheduled</strong> — the reservation moves to another available time.</p><span>3</span><p><strong>Completed, cancelled, or no-show</strong> — the appointment reaches its final status.</p></div><div className="docs-note"><strong>Group booking is intentionally separate.</strong><span>Services with capacity greater than one are not currently pushed through the one-to-one scheduling engine.</span></div></>),
  },
  {
    id: 'people', group: 'Provider guide', title: 'People & relationships', summary: 'Understand how clients/patients connect to the provider workspace.',
    body: (<><p>People is your relationship directory. It gives you a place to see the clients or patients connected to your workspace and move directly into the parts of Clinly you use with them.</p><p>A person is more than a contact record. Their relationship can connect to plans, progress entries, conversations, and bookings while still respecting role-based access.</p><h3>Starting a conversation</h3><p>From People, you can open the existing conversation for that person or create one if needed. Clinly keeps one relationship conversation in context instead of forcing you to hunt through disconnected messages.</p></>),
  },
  {
    id: 'plans', group: 'Shared work', title: 'Plans & progress', summary: 'Use shared tracks and check-ins to keep ongoing work visible.',
    body: (<><p>Plans &amp; progress is the structured shared-work area. Providers can create tracks for ongoing goals or service relationships, and clients/patients can see the tracks available to them.</p><h3>Tracks</h3><p>A track represents an ongoing area of work. Depending on the relationship, that might be a coaching goal, wellness plan, accountability focus, service plan, or another structured progression.</p><h3>Progress entries</h3><p>Entries capture updates inside a track. They are different from the Daily Journal because plan/progress entries are part of the shared relationship workspace.</p><div className="docs-callout"><strong>Shared progress and private reflection are different on purpose.</strong><span>Plans &amp; progress is collaborative. The Daily Journal is patient/client-owned and private by default.</span></div></>),
  },
  {
    id: 'messages', group: 'Shared work', title: 'Messaging', summary: 'Keep relationship conversations alongside the rest of the work.',
    body: (<><p>Messages are designed for the ongoing service relationship. Providers and clients/patients can communicate from their respective portals while keeping the conversation attached to the same workspace used for appointments and progress.</p><h3>Why it matters</h3><p>The goal is not to replace every communication tool. It is to keep important relationship context from becoming scattered across texts, email, calendars, and notes.</p><div className="docs-note"><strong>Use the right channel for urgent needs.</strong><span>Clinly messaging should not be treated as an emergency or crisis-response channel unless a specific provider has explicitly established that workflow.</span></div></>),
  },
  {
    id: 'patient-home', group: 'Client / patient guide', title: 'Your portal', summary: 'What clients and patients can do inside Clinly.',
    body: (<><p>The client/patient portal is intentionally simpler than the provider workspace. It focuses on the things you need to stay involved in your own relationship without exposing provider administration.</p><div className="docs-feature-list"><article><strong>Patient home</strong><span>A quick view of your workspace.</span></article><article><strong>Appointments</strong><span>See upcoming bookings and available services.</span></article><article><strong>My journal</strong><span>Reflect privately or intentionally share an entry.</span></article><article><strong>My plans &amp; progress</strong><span>See shared tracks and check-ins.</span></article><article><strong>My messages</strong><span>Continue the conversation with your provider.</span></article></div></>),
  },
  {
    id: 'journal', group: 'Client / patient guide', title: 'Daily Journal', summary: 'A private-by-default place for reflection, mood, energy, sleep, and gratitude.',
    body: (<><p>The Daily Journal is a personal reflection space inside the client/patient portal. You can write freely, choose a mood, record energy and sleep, and note something you are grateful for.</p><h3>Private by default</h3><p>Journal entries start as <strong>Only me</strong>. Choosing <strong>Share with provider</strong> is an intentional action for that entry.</p><div className="docs-privacy"><span>🔒</span><div><strong>Private means private from the provider view.</strong><p>The journal is intentionally separate from shared Plans &amp; progress. A private reflection should never become provider-visible merely because it exists in Clinly.</p></div></div><h3>What sharing means</h3><p>When sharing is enabled for an entry, that entry is meant to become part of the shared relationship context. You can use this for something you specifically want your provider to understand or discuss with you.</p><div className="docs-note"><strong>Current beta behavior</strong><span>The first Journal release stores entries locally in the browser while Clinly’s server-side journal privacy model is completed. Do not use the beta journal for sensitive production data yet.</span></div></>),
  },
  {
    id: 'privacy', group: 'Trust & safety', title: 'Privacy & access', summary: 'Understand what is shared, what is private, and why roles matter.',
    body: (<><p>Clinly separates provider administration, shared relationship data, and client/patient-owned experiences. The interface hides tools that do not belong to your role, and backend authorization is responsible for enforcing access to protected data.</p><h3>Provider-only areas</h3><p>Business, People, Integrations, and Activity log are provider administration areas. Clients/patients do not get those views.</p><h3>Shared relationship areas</h3><p>Appointments, Plans &amp; progress, and Messages can be visible to both sides according to the relationship and the specific data involved.</p><h3>Private client/patient areas</h3><p>The Daily Journal is the clearest example: an entry is private unless the client/patient explicitly chooses to share it.</p><div className="docs-callout"><strong>Visibility is a product rule, not just a visual preference.</strong><span>Clinly’s goal is for privacy decisions to be enforced by authorization rules, not merely by hiding a button or screen.</span></div></>),
  },
  {
    id: 'public-profile', group: 'Trust & safety', title: 'Public profile & booking links', summary: 'Know exactly what can be seen without signing in.',
    body: (<><p>Providers can publish a public profile so prospective clients can understand who they are and what they offer. Public information is intentionally separate from protected workspace data.</p><h3>What may appear publicly</h3><p>Published profile details, public services, service descriptions, prices, durations, delivery information, and eligible live availability can appear without requiring access to the provider workspace.</p><h3>What does not belong there</h3><p>Private messages, client/patient records, progress data, journal entries, internal activity history, and provider-only administration should never be exposed through the public profile.</p></>),
  },
  {
    id: 'activity', group: 'Trust & safety', title: 'Activity log', summary: 'Understand the provider-facing audit trail.',
    body: (<><p>The Activity log gives providers visibility into important actions that happen in the workspace. It is useful for understanding operational history and investigating unexpected changes.</p><p>It is not intended to be a client/patient activity feed. It belongs to the provider administration side of the product.</p></>),
  },
  {
    id: 'faq', group: 'Help', title: 'Frequently asked questions', summary: 'Quick answers to common Clinly questions.',
    body: (<div className="docs-faq"><details><summary>Is Clinly only for healthcare?</summary><p>No. Clinly is designed for relationship-based service professionals across wellness, aesthetics, fitness, coaching, consulting, and other service categories.</p></details><details><summary>Can clients book themselves?</summary><p>Yes, for eligible public one-to-one services. Providers can also create bookings on behalf of clients/patients.</p></details><details><summary>Can I control my availability?</summary><p>Yes. Providers can set weekly availability, special hours or time off, and booking-policy rules such as minimum notice and booking horizon.</p></details><details><summary>Can my provider see my journal?</summary><p>Journal entries are private by default. An entry must be intentionally marked for provider sharing. During the current beta, journal entries are browser-local and should not be used for sensitive production information.</p></details><details><summary>Are group appointments supported?</summary><p>The current scheduling engine is focused on one-to-one services. Group-capacity services are kept outside that booking flow until dedicated group-session inventory is available.</p></details><details><summary>Where should I report a product problem?</summary><p>For the beta, use the project’s public GitHub repository for technical issues or the support/contact channel provided by the Clinly team when one is listed in the product.</p></details></div>),
  },
]

export default function DocsPage() {
  const [query, setQuery] = useState('')
  const grouped = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const visible = normalized
      ? SECTIONS.filter((section) => `${section.title} ${section.summary} ${section.group}`.toLowerCase().includes(normalized))
      : SECTIONS
    return visible.reduce((acc, section) => {
      if (!acc[section.group]) acc[section.group] = []
      acc[section.group].push(section)
      return acc
    }, {})
  }, [query])

  return (
    <div className="docs-shell">
      <header className="docs-topbar">
        <a className="docs-brand" href="/">
          <span className="brand-mark">{APP_INITIAL}</span>
          <span>{APP_NAME}</span>
          <small>Docs</small>
        </a>
        <nav><a href="/">Open Clinly</a><a href="https://github.com/mergemaven11/clinly-backbone" target="_blank" rel="noreferrer">GitHub</a></nav>
      </header>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <label className="docs-search"><span>Search docs</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “journal” or “booking”" /></label>
          {Object.entries(grouped).map(([group, sections]) => (
            <div className="docs-nav-group" key={group}><strong>{group}</strong>{sections.map((section) => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}</div>
          ))}
        </aside>

        <main className="docs-main">
          <section className="docs-hero">
            <span className="kicker">Clinly customer guide</span>
            <h1>Everything you need to understand Clinly.</h1>
            <p>Plain-language documentation for providers, clients, and patients — from first login to booking, progress tracking, messaging, privacy, and the Daily Journal.</p>
            <div className="docs-hero-actions"><a className="primary-button" href="#start">Start here</a><a className="secondary-button" href="#privacy">Privacy guide</a></div>
          </section>

          {Object.values(grouped).flat().length === 0 && <div className="docs-empty">No docs matched “{query}”. Try a broader term.</div>}
          {Object.values(grouped).flat().map((section) => (
            <article className="docs-section" id={section.id} key={section.id}>
              <span className="docs-section-group">{section.group}</span>
              <h2>{section.title}</h2>
              <p className="docs-summary">{section.summary}</p>
              <div className="docs-body">{section.body}</div>
            </article>
          ))}
          <footer className="docs-footer"><strong>Clinly is in beta.</strong><span>These docs describe the current product and will grow as Packages, Staff, Payments, and additional client/patient tools ship.</span></footer>
        </main>
      </div>
    </div>
  )
}
