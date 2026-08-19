import { APP_INITIAL, APP_NAME } from './brand'
import './marketing.css'

const featureRows = [
  ['One connected workspace', 'Bring scheduling, messaging, progress, services, and relationship context together without making providers jump between tools.'],
  ['Built around real relationships', 'Give every person a clear place for plans, appointments, communication, and ongoing progress.'],
  ['Flexible enough to grow', 'Start with the essentials, then extend the workspace with integrations, richer workflows, and team capabilities.'],
]

const capabilityCards = [
  ['Schedule', 'Turn services and availability into bookable time with provider controls, buffers, rescheduling, and cancellations.'],
  ['Serve', 'Keep plans, progress, notes, check-ins, and shared context organized around the person you are working with.'],
  ['Communicate', 'Keep secure conversations tied to the relationship instead of scattered across disconnected channels.'],
  ['Operate', 'Manage your business profile, services, integrations, activity, and people from one provider workspace.'],
]

function AppPreview() {
  return (
    <div className="marketing-preview-shell" aria-hidden="true">
      <div className="marketing-preview-sidebar">
        <div className="preview-brand"><span>{APP_INITIAL}</span><strong>{APP_NAME}</strong></div>
        <div className="preview-nav active">Overview</div>
        <div className="preview-nav">Calendar</div>
        <div className="preview-nav">People</div>
        <div className="preview-nav">Plans & progress</div>
        <div className="preview-nav">Messages</div>
        <div className="preview-nav">Business</div>
      </div>
      <div className="marketing-preview-main">
        <div className="preview-toolbar"><div><small>Provider workspace</small><strong>Good morning</strong></div><span className="preview-status">Protected</span></div>
        <div className="preview-metrics">
          <div><span>Upcoming</span><strong>8</strong><small>appointments</small></div>
          <div><span>People</span><strong>24</strong><small>active relationships</small></div>
          <div><span>Services</span><strong>6</strong><small>bookable offers</small></div>
        </div>
        <div className="preview-grid">
          <div className="preview-card preview-calendar">
            <div className="preview-card-head"><strong>Today</strong><span>View calendar</span></div>
            <div className="preview-event"><b>9:00</b><span>Consultation</span><small>30 min</small></div>
            <div className="preview-event"><b>11:30</b><span>Follow-up</span><small>45 min</small></div>
            <div className="preview-event"><b>2:00</b><span>Progress session</span><small>60 min</small></div>
          </div>
          <div className="preview-card preview-activity">
            <div className="preview-card-head"><strong>Relationship health</strong><span>This week</span></div>
            <div className="preview-chart"><i/><i/><i/><i/><i/><i/><i/></div>
            <div className="preview-activity-row"><span className="preview-dot blue"/><div><strong>New check-in</strong><small>Progress updated</small></div></div>
            <div className="preview-activity-row"><span className="preview-dot red"/><div><strong>Appointment moved</strong><small>Calendar updated</small></div></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MarketingPage() {
  return (
    <main className="marketing-page">
      <nav className="marketing-nav">
        <a className="marketing-brand" href="/" aria-label={`${APP_NAME} home`}>
          <span className="marketing-brand-mark">{APP_INITIAL}</span>
          <strong>{APP_NAME}</strong>
        </a>
        <div className="marketing-nav-links">
          <a href="#product">Product</a>
          <a href="#workflows">Workflows</a>
          <a href="#integrations">Integrations</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="marketing-nav-actions">
          <a className="marketing-link-button" href="/app">Sign in</a>
          <a className="marketing-primary" href="/app">Start your workspace <span>→</span></a>
        </div>
      </nav>

      <section className="marketing-hero" id="product">
        <div className="marketing-hero-copy">
          <div className="marketing-eyebrow"><span/>A calmer operating system for service relationships</div>
          <h1>Run the relationship.<br/><em>Not the tool stack.</em></h1>
          <p>One adaptable provider workspace for scheduling, messaging, progress, services, and the ongoing work that happens between appointments.</p>
          <div className="marketing-hero-actions">
            <a className="marketing-primary large" href="/app">Start your workspace <span>→</span></a>
            <a className="marketing-secondary large" href="#workflows">See how it works</a>
          </div>
          <div className="marketing-trust-row">
            <span>Provider-first workflows</span><span>Private by default</span><span>Built to integrate</span>
          </div>
        </div>
        <div className="marketing-hero-visual">
          <div className="marketing-glow glow-blue"/>
          <div className="marketing-glow glow-red"/>
          <AppPreview />
        </div>
      </section>

      <section className="marketing-proof-strip">
        <p>Designed for professionals who need more than a booking link and less chaos than a pile of disconnected software.</p>
        <div><span>Therapy</span><span>Coaching</span><span>Fitness</span><span>Aesthetics</span><span>Wellness</span><span>Consulting</span></div>
      </section>

      <section className="marketing-section marketing-capabilities" id="workflows">
        <div className="marketing-section-heading">
          <span className="marketing-section-kicker">A connected workflow</span>
          <h2>Everything important stays in context.</h2>
          <p>Use one operating layer for the work your clients or members actually experience—from discovery through ongoing progress.</p>
        </div>
        <div className="marketing-capability-grid">
          {capabilityCards.map(([title, copy], index) => (
            <article key={title} className="marketing-capability-card">
              <div className="marketing-card-number">0{index + 1}</div>
              <h3>{title}</h3>
              <p>{copy}</p>
              <span className="marketing-card-line"/>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-story">
        <div className="marketing-story-visual">
          <div className="marketing-story-panel">
            <div className="story-panel-top"><span className="story-avatar">TS</span><div><small>Client relationship</small><strong>Progress overview</strong></div><span className="story-pill">Active</span></div>
            <div className="story-progress-head"><span>Shared plan</span><strong>72%</strong></div>
            <div className="story-progress"><i/></div>
            <div className="story-grid"><div><small>Next session</small><strong>Thu · 2:00 PM</strong></div><div><small>Last check-in</small><strong>Today</strong></div></div>
            <div className="story-message"><span className="preview-dot blue"/><div><strong>New progress update</strong><small>Goal milestone moved forward</small></div><time>8m</time></div>
          </div>
        </div>
        <div className="marketing-story-copy">
          <span className="marketing-section-kicker">More signal, less switching</span>
          <h2>A workspace that understands the relationship—not just the appointment.</h2>
          <div className="marketing-feature-rows">
            {featureRows.map(([title, copy]) => <div key={title}><strong>{title}</strong><p>{copy}</p></div>)}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-integrations" id="integrations">
        <div className="marketing-section-heading compact">
          <span className="marketing-section-kicker">Connect the tools you already use</span>
          <h2>Integrations without turning your workspace into a patchwork.</h2>
        </div>
        <div className="marketing-integration-row">
          {['Google Calendar', 'Microsoft Outlook', 'Zoom', 'Stripe', 'Zapier', 'Webhooks'].map((item) => <div key={item}><span>{item.slice(0, 1)}</span><strong>{item}</strong></div>)}
        </div>
        <p className="marketing-integrations-note">Connections are provider-scoped and only become active when a real integration is configured.</p>
      </section>

      <section className="marketing-section marketing-pricing" id="pricing">
        <div className="marketing-pricing-copy">
          <span className="marketing-section-kicker">Start simple</span>
          <h2>A provider workspace that can grow with the business.</h2>
          <p>Core relationship workflows first. Advanced integrations, teams, analytics, and business automation can expand as your operation grows.</p>
        </div>
        <div className="marketing-pricing-card">
          <span>Provider workspace</span>
          <strong>Start building</strong>
          <p>Create your account, configure your services, and shape the workflow around the relationships you manage.</p>
          <a className="marketing-primary large full-width" href="/app">Open the workspace <span>→</span></a>
        </div>
      </section>

      <section className="marketing-final-cta">
        <div><span className="marketing-section-kicker light">One relationship. One connected place.</span><h2>Give the work between appointments a real home.</h2></div>
        <a className="marketing-primary inverse large" href="/app">Start your workspace <span>→</span></a>
      </section>

      <footer className="marketing-footer">
        <a className="marketing-brand" href="/"><span className="marketing-brand-mark">{APP_INITIAL}</span><strong>{APP_NAME}</strong></a>
        <p>Flexible provider relationship infrastructure for modern service businesses.</p>
        <div><a href="#product">Product</a><a href="#integrations">Integrations</a><a href="/app">Sign in</a></div>
      </footer>
    </main>
  )
}
