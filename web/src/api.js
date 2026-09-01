import { demoApiRequest, downloadDemoAudit, IS_DEMO_MODE } from './demoApi'

const API_BASE = '/api'

function messageFromBody(body, fallback) {
  if (!body) return fallback
  if (typeof body.detail === 'string') return body.detail
  if (body.error?.message) return body.error.message
  if (Array.isArray(body.detail)) {
    return body.detail.map((item) => item.msg).filter(Boolean).join(', ') || fallback
  }
  return fallback
}

export async function apiRequest(path, options = {}) {
  if (IS_DEMO_MODE) return demoApiRequest(path, options)

  const { token, headers = {}, ...rest } = options
  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    const error = new Error(messageFromBody(body, `Request failed (${response.status})`))
    error.status = response.status
    throw error
  }

  return body
}

export async function downloadAudit({ token, clientId }) {
  if (IS_DEMO_MODE) {
    downloadDemoAudit(clientId)
    return
  }

  const params = new URLSearchParams({ subject_user_id: clientId })
  const response = await fetch(`${API_BASE}/export?${params.toString()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    let body = null
    try {
      body = await response.json()
    } catch {
      // Keep the generic fallback when the response is not JSON.
    }
    throw new Error(messageFromBody(body, `Export failed (${response.status})`))
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `workspace-audit-${clientId}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
