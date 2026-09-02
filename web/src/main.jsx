import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './AppV3.jsx'
import DocsPage from './DocsPage.jsx'
import { SESSION_TOKEN_KEY, clearSessionToken } from './brand'
import { DEMO_PATIENT_TOKEN, DEMO_PROVIDER_TOKEN, IS_DEMO_MODE } from './demoApi'
import './styles.css'
import './platform-v3.css'
import './business-layout-v2.css'

const isDocsRoute = /^\/docs\/?$/.test(window.location.pathname)
const isDemoHome = /^\/demo\/?$/.test(window.location.pathname)
const demoMatch = window.location.pathname.match(/^\/demo\/(provider|patient)\/?$/)

if (IS_DEMO_MODE && isDemoHome) {
  clearSessionToken()
}

if (IS_DEMO_MODE && demoMatch) {
  const demoToken = demoMatch[1] === 'patient' ? DEMO_PATIENT_TOKEN : DEMO_PROVIDER_TOKEN
  sessionStorage.setItem(SESSION_TOKEN_KEY, demoToken)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isDocsRoute ? <DocsPage /> : <App />}
  </StrictMode>,
)
