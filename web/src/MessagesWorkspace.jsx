import { useEffect, useState } from 'react'

import { formatDate } from './platformMeta'

function Empty({ title, detail }) {
  return <div className="empty"><span className="empty-icon">○</span><strong>{title}</strong><p>{detail}</p></div>
}

export default function MessagesWorkspace({ isProvider, people, conversations, selectedConversationId, messages, user, onSelectConversation, onCreateConversation, onSendMessage }) {
  const [personId, setPersonId] = useState(people[0]?.id || '')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!personId && people[0]?.id) setPersonId(people[0].id)
  }, [people, personId])

  async function createThread() {
    setBusy(true)
    setError('')
    try {
      await onCreateConversation(personId)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function send(event) {
    event.preventDefault()
    if (!body.trim()) return
    const nextBody = body.trim()
    setBody('')
    setBusy(true)
    setError('')
    try {
      await onSendMessage(nextBody)
    } catch (requestError) {
      setBody(nextBody)
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="message-layout section-card">
      <aside className="conversation-list">
        <div className="section-heading"><div><span className="kicker">Threads</span><h3>Messages</h3></div></div>
        {isProvider && people.length > 0 && (
          <div className="new-thread">
            <select value={personId} onChange={(event) => setPersonId(event.target.value)}>
              {people.map((person) => <option value={person.id} key={person.id}>{person.email}</option>)}
            </select>
            <button className="small-button" type="button" onClick={createThread} disabled={busy}>+ Thread</button>
          </div>
        )}
        {conversations.map((conversation) => {
          const person = people.find((item) => item.id === conversation.client_id)
          const label = isProvider ? person?.email || 'Person' : 'Conversation'
          return (
            <button
              key={conversation.id}
              type="button"
              className={conversation.id === selectedConversationId ? 'conversation-button active' : 'conversation-button'}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <span className="avatar">{label.slice(0, 1).toUpperCase()}</span>
              <span><strong>{label}</strong><small>{formatDate(conversation.created_at)}</small></span>
            </button>
          )
        })}
      </aside>

      <section className="message-panel">
        {selectedConversationId ? (
          <>
            <div className="message-header">
              <div><span className="kicker">Protected conversation</span><h3>Messages</h3></div>
              <span className="lock-pill">Private</span>
            </div>
            <div className="message-stream">
              {messages.map((message) => (
                <div className={message.sender_user_id === user.id ? 'message-bubble mine' : 'message-bubble'} key={message.id}>
                  <p>{message.plaintext_body}</p>
                  <small>{message.pending ? 'Sending…' : formatDate(message.created_at)}</small>
                </div>
              ))}
              {!messages.length && <Empty title="No messages yet" detail="Start the conversation below." />}
            </div>
            <form className="message-composer" onSubmit={send}>
              <textarea rows="2" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message…" />
              <button className="primary-button" disabled={busy || !body.trim()}>Send</button>
            </form>
            {error && <div className="notice error">{error}</div>}
          </>
        ) : (
          <Empty title="Choose a conversation" detail={isProvider ? 'Select a thread or start one for someone in your workspace.' : 'No conversation has been opened yet.'} />
        )}
      </section>
    </div>
  )
}
