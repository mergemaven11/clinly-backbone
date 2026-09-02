import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './AppV3.jsx'
import DocsPage from './DocsPage.jsx'
import './styles.css'
import './platform-v3.css'
import './business-layout-v2.css'

const isDocsRoute = /^\/docs\/?$/.test(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isDocsRoute ? <DocsPage /> : <App />}
  </StrictMode>,
)
