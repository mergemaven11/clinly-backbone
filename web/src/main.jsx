import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './AppV3.jsx'
import './styles.css'
import './platform-v3.css'
import './business-layout-v2.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
