import { APP_INITIAL, APP_NAME } from './brand'
import { IS_DEMO_MODE } from './demoApi'
import { isProviderRole, TRACK_META } from './platformMeta'
import { familyForSpecialty, specialtyForKey, specialtyFromProviderType, templatePlansForSpecialty } from './specialtyCatalog'

const DEMO_SPECIALTY_KEY = 'clinly-demo-specialty-v1'

const FAMILY_OVERVIEW = {
  AESTHETICS: { section: 'Treatment journeys', extras: ['Aftercare & response', 'Client treatment preferences'], descriptions: ['Follow treatment areas, sessions, response, and next steps.', 'Keep aftercare guidance and treatment response easy to review.', 'Remember treatment areas, sensitivities, settings, and preferences.'] },
  BEAUTY: { section: 'Client services', extras: ['Rebooking & retention', 'Client preferences'], descriptions: ['Keep service history and maintenance plans together.', 'See maintenance cadence, recommended return, and follow-up needs.', 'Remember styles, products, sensitivities, and service preferences.'] },
  REHAB: { section: 'Care plans', extras: ['Outcomes & measurements', 'Home program adherence'], descriptions: ['Follow functional goals, sessions, and recovery milestones.', 'Keep measurements and functional outcomes in one progress view.', 'Track assigned home work, adherence, and follow-up needs.'] },
  FITNESS: { section: 'Active programs', extras: ['Check-ins & measurements', 'Performance milestones'], descriptions: ['Keep training goals, programming, and progress connected.', 'Follow check-ins, measurements, consistency, and readiness.', 'Capture performance goals, tests, wins, and next targets.'] },
  WELLNESS: { section: 'Wellness journeys', extras: ['Habits & routines', 'Client check-ins'], descriptions: ['Keep wellness goals, routines, and progress together.', 'Follow the routines and habits supporting each client goal.', 'Review client-reported progress and follow-up needs over time.'] },
  COACHING: { section: 'Client goals', extras: ['Actions & accountability', 'Milestones & reflections'], descriptions: ['Keep goals, commitments, and coaching progress connected.', 'Track next actions, ownership, and accountability between sessions.', 'Capture milestones, reflections, decisions, and what comes next.'] },
  BODYWORK: { section: 'Recovery journeys', extras: ['Session history', 'Recovery check-ins'], descriptions: ['Keep recovery goals, sessions, and client response together.', 'Review bodywork focus, session history, and recurring needs.', 'Follow recovery response, mobility, comfort, and next-session needs.'] },
  CONSULTING: { section: 'Client engagements', extras: ['Deliverables & decisions', 'Next actions & milestones'], descriptions: ['Keep engagement goals, workstreams, and progress connected.', 'Capture deliverables, important decisions, and client context.', 'Track owners, next actions, deadlines, and engagement milestones.'] },
  CARE: { section: 'Client plans', extras: ['Check-ins & follow-up', 'Notes & resources'], descriptions: ['Keep support goals, services, and progress connected.', 'Follow client check-ins, follow-up needs, and next steps.', 'Keep useful notes and shared resources attached to the client journey.'] },
}

function specialtyOverview(specialtyKey) {
  const specialty = specialtyForKey(specialtyKey)
  const family = familyForSpecialty(specialtyKey)
  const config = FAMILY_OVERVIEW[specialty.family] || FAMILY_OVERVIEW.CARE
  const samples = templatePlansForSpecialty(specialtyKey)
  const templateCards = specialty.overviewCards || specialty.workspaceTemplate?.overviewCards
  const titles = templateCards?.length ? templateCards.slice(0, 4) : [...samples.slice(0, 2), ...config.extras].slice(0, 4)
  return {
    specialty,
    family,
    section: specialty.workspaceTemplate?.templateName || config.section,
    cards: titles.map((title, index) => ({
      title,
      eyebrow: index < 2 ? family.label : index === 2 ? 'Workflow' : 'Client context',
      description: config.descriptions[Math.min(index, config.descriptions.length - 1)],
    })),
  }
}

function TrackCard({ track, display, onClick }) {
  const meta = TRACK_META[track?.kind] || TRACK_META.GENERAL
  return (
    <button className="track-card" onClick={onClick} type="button">
      <span className={`track-icon kind-${(track?.kind || 'GENERAL').toLowerCase()}`}>{(display?.title || meta.label).slice(0, 1)}</span>
      <span className="track-card-copy">
        <small>{display?.eyebrow || meta.eyebrow}</small>
        <strong>{display?.title || track?.title}</strong>
        <span>{display?.description || meta.description}</span>
      </span>
      <span className="chevron">›</span>
    </button>
  )
}

export default function Overview({ user, people, tracks, conversations, onOpenTrack, onOpenIntegrations }) {
  const isProvider = isProviderRole(user.role)
  const specialtyKey = isProvider && IS_DEMO_MODE
    ? window.localStorage.getItem(DEMO_SPECIALTY_KEY) || 'WELLNESS_COACH'
    : specialtyFromProviderType(user.provider_type || '').key
  const adaptive = specialtyOverview(specialtyKey)
  const specialty = adaptive.specialty
  const family = adaptive.family
  const compatibleTracks = isProvider && IS_DEMO_MODE
    ? tracks.filter((track) => specialty.allowedKinds.includes(track.kind))
    : tracks

  const cards = isProvider
    ? [
        [specialty.workspaceTemplate?.clientLabel === 'Patient' ? 'Patients' : 'Clients', people.length, `People in your ${family.workspace.toLowerCase()}`],
        [specialty.planPlural || 'Active plans', compatibleTracks.length, `${family.progress} spaces`],
        ['Conversations', conversations.length, 'Connected client message threads'],
      ]
    : [
        ['My plans', tracks.length, 'Care and progress spaces shared with you'],
        ['Messages', conversations.length, 'Private provider conversations'],
        ['Privacy', 'On', 'Only your relationship data is available here'],
      ]

  const providerHero = IS_DEMO_MODE
    ? {
        kicker: specialty.workspaceTemplate?.templateName || `${adaptive.family.label} workspace`,
        title: `A workspace built for ${specialty.label.toLowerCase()} work.`,
        detail: `Keep ${family.progress.toLowerCase()}, client history, appointments, and conversations together without forcing your business into somebody else’s workflow.`,
      }
    : {
        kicker: 'Relationship-centered business workspace',
        title: 'Keep the person, the progress, and the conversation together.',
        detail: `${APP_NAME} is built around flexible provider relationships instead of forcing every business into the same workflow.`,
      }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="kicker">{isProvider ? providerHero.kicker : 'Private patient portal'}</span>
          <h2>{isProvider ? providerHero.title : 'Your plans, check-ins, and care conversation—all in one place.'}</h2>
          <p>{isProvider ? providerHero.detail : 'Review what your provider shared, record how things are going, and stay connected between appointments or sessions.'}</p>
          {isProvider && <div className="hero-actions"><button className="primary-button" type="button" onClick={onOpenIntegrations}>Explore integrations</button></div>}
        </div>
        <div className="hero-orb">{APP_INITIAL}</div>
      </section>

      <section className="metric-grid">
        {cards.map(([label, value, detail]) => <article className="metric-card" key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="kicker">{isProvider && IS_DEMO_MODE ? specialty.label : isProvider ? 'Recent spaces' : 'Shared with me'}</span><h3>{isProvider && IS_DEMO_MODE ? adaptive.section : isProvider ? 'Relationship tracks' : 'My plans & progress'}</h3></div></div>
        {isProvider && IS_DEMO_MODE ? (
          <div className="track-grid">
            {adaptive.cards.map((display, index) => {
              const track = compatibleTracks[index % Math.max(compatibleTracks.length, 1)] || tracks[index % Math.max(tracks.length, 1)]
              return <TrackCard key={display.title} track={track} display={display} onClick={() => track && onOpenTrack(track.id)} />
            })}
          </div>
        ) : tracks.length ? (
          <div className="track-grid">{tracks.slice(0, 6).map((track) => <TrackCard key={track.id} track={track} onClick={() => onOpenTrack(track.id)} />)}</div>
        ) : (
          <div className="empty"><span className="empty-icon">○</span><strong>No plans yet</strong><p>{isProvider ? `Add a client, then start a ${String(specialty.planLabel || 'client plan').toLowerCase()}.` : 'No plan has been shared with you yet.'}</p></div>
        )}
      </section>
    </div>
  )
}
