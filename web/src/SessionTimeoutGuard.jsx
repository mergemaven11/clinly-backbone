import { useEffect } from 'react'

import { clearSessionToken, readSessionToken } from './brand'
import { IS_DEMO_MODE } from './demoApi'

const DEFAULT_IDLE_TIMEOUT_MINUTES = 15
const MIN_IDLE_TIMEOUT_MINUTES = 1
const MAX_IDLE_TIMEOUT_MINUTES = 120

function configuredTimeoutMinutes() {
  const parsed = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES)
  if (!Number.isFinite(parsed)) return DEFAULT_IDLE_TIMEOUT_MINUTES
  return Math.min(MAX_IDLE_TIMEOUT_MINUTES, Math.max(MIN_IDLE_TIMEOUT_MINUTES, parsed))
}

export default function SessionTimeoutGuard() {
  useEffect(() => {
    if (IS_DEMO_MODE) return undefined

    const timeoutMs = configuredTimeoutMinutes() * 60_000
    let timerId = null

    const expireSession = () => {
      if (!readSessionToken()) return
      sessionStorage.setItem('clinly.session.timeout', '1')
      clearSessionToken()
      window.location.assign('/')
    }

    const schedule = () => {
      if (!readSessionToken()) return
      if (timerId !== null) window.clearTimeout(timerId)
      timerId = window.setTimeout(expireSession, timeoutMs)
    }

    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'focus']
    for (const eventName of activityEvents) {
      window.addEventListener(eventName, schedule, { passive: true })
    }
    schedule()

    return () => {
      if (timerId !== null) window.clearTimeout(timerId)
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, schedule)
      }
    }
  }, [])

  return null
}
