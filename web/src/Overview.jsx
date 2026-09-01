import { APP_INITIAL, APP_NAME } from './brand'
import { isProviderRole, TRACK_META } from './platformMeta'

function TrackCard({ track, onClick }) {
  const meta = TRACK_META[track.kind] || TRACK_META.GENERAL
  return (
    <button className="track-card" onClick={onClick} type="button">
      <span className={`track-icon kind-${track.kind.toLowerCase()}`}>{meta.label.slice(0, 1)}</span>
      <span className="track-card-copy">
        <small>{meta.eyebrow}</small>
        <strong>{track.title}</strong>
        <span>{meta.description}</span>
      </span>
      <span className="chevron">›</span>
    </button>
  )
}

export default function Overview({ user, people, tracks, conversations, onOpenTrack, onOpenIntegrations }) {
  const isProvider = isProviderRole(user.role)
  const cards = isProvider
    ? [
        ['People', people.length, 'Relationships in your workspace'],
        ['Active tracks', tracks.length, 'Flexible service and progress spaces'],
        ['Conversations', conversations.length, 'Connected message threads'],
      ]
    : [
        ['My plans', tracks.length, 'Care and progress spaces shared with you'],
        ['Messages', conversations.length, 'Private provider conversations'],
        ['Privacy', 'On', 'Only your relationship data is available here'],
      ]

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="kicker">{isProvider ? 'Relationship-centered business workspace' : 'Private patient portal'}</span>
          <h2>{isProvider ? 'Keep the person, the progress, and the conversation together.' : 'Your plans, check-ins, and care conversation—all in one place.'}</h2>
          <p>{isProvider ? `${APP_NAME} is built around flexible provider relationships instead of forcing every business into the same workflow.` : 'Review what your provider shared, record how things are going, and stay connected between appointments or sessions.'}</p>
          {isProvider && (
            <div className="hero-actions">
              <button className="primary-button" type="button" onClick={onOpenIntegrations}>Explore integrations</button>
            </div>
          )}
        </div>
        <div className="hero-orb">{APP_INITIAL}</div>
      </section>

      <section className="metric-grid">
        {cards.map(([label, value, detail]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div><span className="kicker">{isProvider ? 'Recent spaces' : 'Shared with me'}</span><h3>{isProvider ? 'Relationship tracks' : 'My plans & progress'}</h3></div>
        </div>
        {tracks.length ? (
          <div className="track-grid">
            {tracks.slice(0, 6).map((track) => <TrackCard key={track.id} track={track} onClick={() => onOpenTrack(track.id)} />)}
          </div>
        ) : (
          <div className="empty">
            <span className="empty-icon">○</span>
            <strong>No tracks yet</strong>
            <p>{isProvider ? 'Add someone, then start a wellbeing, fitness, aesthetics, or general track.' : 'No relationship track has been shared with you yet.'}</p>
          </div>
        )}
      </section>
    </div>
  )
}
