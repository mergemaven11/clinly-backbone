import { APP_INITIAL, APP_NAME } from './brand'
import { IS_DEMO_MODE } from './demoApi'
import './landing.css'

const PROVIDERS = [
  ['Aesthetics & Botox', 'Consultations, treatment plans, follow-ups, and ongoing client communication.'],
  ['Fitness & training', 'Goals, programs, check-ins, progress, and messaging between sessions.'],
  ['Coaching & consulting', 'Shared plans, milestones, accountability, notes, and relationship history.'],
  ['Wellness & beauty', 'Services, client context, recurring care, and a polished public presence.'],
]

const FEATURES = [
  ['Business profile', 'Publish your services, locations, provider details, and public profile from one workspace.'],
  ['People & relationships', 'Keep each client or patient relationship organized instead of scattered across tools.'],
  ['Plans & progress', 'Create flexible tracks for goals, treatment journeys, programs, or ongoing engagements.'],
  ['Connected messaging', 'Keep conversations attached to the relationship they belong to.'],
  ['Service catalog', 'Define your offers, prices, duration, capacity, delivery mode, and visibility.'],
  ['Integrations-ready', 'Build around the tools your business already uses instead of replacing everything at once.'],
]

function Brand() {
  return (
    <div className="marketing-brand">
      <span className="marketing-brand-mark">{APP_INITIAL}</span>
      <strong>{APP_NAME}</strong>
      <span className="marketing-beta">BETA</span>
    </div>
  )
}

export default function LandingPage({ onEnter }) {
  return (
    <div className="marketing-page">
      <header className="marketing-nav">
        <a className="marketing-brand-link" href="#top" aria-label={`${APP_NAME} home`}><Brand /></a>
        <nav aria-label="Marketing navigation">
          <a href="#features">Features</a>
          <a href="#providers">Who it’s for</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="marketing-nav-actions">
          <button className="marketing-link-button" type="button" onClick={() => onEnter('login')}>Sign in</button>
          <button className="marketing-primary-button" type="button" onClick={() => onEnter('demo')}>{IS_DEMO_MODE ? 'Explore demo' : 'Get started'}</button>
        </div>
      </header>

      <main id="top">
        <section className="marketing-hero">
          <div className="marketing-hero-copy">
            <span className="marketing-eyebrow">One relationship. One connected place.</span>
            <h1>Run your service business without stitching together six different tools.</h1>
            <p className="marketing-lede">
              Clinly gives relationship-driven providers one adaptable workspace for services, clients, plans, progress, messaging, and ongoing care.
            </p>
            <p className="marketing-provider-line">
              Built for providers ranging from <strong>Botox and aesthetics specialists</strong> to <strong>fitness trainers, coaches, consultants, wellness professionals</strong>, and more.
            </p>
            <div className="marketing-hero-actions">
              <button className="marketing-primary-button large" type="button" onClick={() => onEnter('demo')}>{IS_DEMO_MODE ? 'Explore the live demo' : 'Create your workspace'}</button>
              <a className="marketing-secondary-button" href="#features">See how Clinly works</a>
            </div>
            {IS_DEMO_MODE && <small className="marketing-demo-note">Interactive demo • fictional data • changes reset on refresh</small>}
          </div>

          <div className="marketing-product-stage" aria-label="Clinly product preview">
            <div className="marketing-preview-window">
              <div className="marketing-preview-topbar">
                <Brand />
                <span className="marketing-preview-pill">Provider workspace</span>
              </div>
              <div className="marketing-preview-body">
                <aside className="marketing-preview-sidebar">
                  {['Overview', 'Business', 'Plans', 'Messages', 'People'].map((item, index) => (
                    <span className={index === 1 ? 'active' : ''} key={item}><i />{item}</span>
                  ))}
                </aside>
                <div className="marketing-preview-content">
                  <div className="marketing-preview-heading"><span>BUSINESS</span><strong>Your services, your way.</strong></div>
                  <div className="marketing-preview-grid">
                    <article>
                      <small>PUBLIC SERVICE</small>
                      <strong>Initial consultation</strong>
                      <p>45 min · In person</p>
                      <div><span>$95</span><span>Active</span></div>
                    </article>
                    <article>
                      <small>ONGOING</small>
                      <strong>Monthly membership</strong>
                      <p>Progress + messaging</p>
                      <div><span>$149</span><span>Virtual</span></div>
                    </article>
                  </div>
                  <div className="marketing-preview-progress">
                    <div><strong>12</strong><span>People</span></div>
                    <div><strong>8</strong><span>Active plans</span></div>
                    <div><strong>4</strong><span>Services</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="marketing-proof-strip" aria-label="Clinly capabilities">
          <span>Client & patient relationships</span>
          <span>Service catalog</span>
          <span>Progress tracking</span>
          <span>Messaging</span>
          <span>Public provider profiles</span>
        </section>

        <section className="marketing-section" id="providers">
          <div className="marketing-section-heading">
            <span>BUILT TO ADAPT</span>
            <h2>“Provider” shouldn’t mean one profession.</h2>
            <p>Clinly is designed around the relationship between a professional and the people they serve — not around one narrow industry template.</p>
          </div>
          <div className="marketing-provider-grid">
            {PROVIDERS.map(([title, copy], index) => (
              <article key={title}>
                <span className="marketing-card-number">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="marketing-section marketing-feature-section" id="features">
          <div className="marketing-section-heading compact">
            <span>THE WORKSPACE</span>
            <h2>Everything important stays connected to the relationship.</h2>
          </div>
          <div className="marketing-feature-grid">
            {FEATURES.map(([title, copy]) => (
              <article key={title}>
                <span className="marketing-feature-icon">+</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="marketing-section marketing-flow-section" id="how-it-works">
          <div className="marketing-section-heading compact">
            <span>HOW IT WORKS</span>
            <h2>Start simple. Add structure as the relationship grows.</h2>
          </div>
          <div className="marketing-flow-grid">
            <article><strong>1</strong><div><h3>Set up your business</h3><p>Add your provider identity, locations, credentials, and services.</p></div></article>
            <article><strong>2</strong><div><h3>Bring in your people</h3><p>Create a private portal for clients or patients and keep their context together.</p></div></article>
            <article><strong>3</strong><div><h3>Build the relationship</h3><p>Use plans, progress, messaging, check-ins, and future integrations as needed.</p></div></article>
          </div>
        </section>

        <section className="marketing-privacy-section">
          <div>
            <span className="marketing-eyebrow">PRIVATE BY DEFAULT</span>
            <h2>Your public presence and private workspace are different things.</h2>
          </div>
          <p>Clinly separates what you intentionally publish — such as a provider profile or service — from the private relationship workspace you use with the people you serve.</p>
        </section>

        <section className="marketing-cta">
          <div>
            <span className="marketing-eyebrow">SEE THE PRODUCT</span>
            <h2>Don’t just read about it. Click around.</h2>
            <p>The Clinly demo includes both sides of the relationship so you can explore the provider workspace and the client/patient experience.</p>
          </div>
          <button className="marketing-primary-button large light" type="button" onClick={() => onEnter('demo')}>{IS_DEMO_MODE ? 'Open interactive demo' : 'Get started'}</button>
        </section>
      </main>

      <footer className="marketing-footer">
        <Brand />
        <p>Flexible relationship software for modern service providers.</p>
        <div>
          <button type="button" onClick={() => onEnter('login')}>Sign in</button>
          <a href="https://github.com/mergemaven11/clinly-backbone" target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      </footer>
    </div>
  )
}
