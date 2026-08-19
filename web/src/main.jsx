import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './AppV3.jsx'
import MarketingPage from './MarketingPage.jsx'
import './styles.css'
import './platform-v3.css'
import './brand-refresh.css'

const isMarketingHome = window.location.pathname === '/' || window.location.pathname === ''

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isMarketingHome ? <MarketingPage /> : <App />}
  </StrictMode>,
)
