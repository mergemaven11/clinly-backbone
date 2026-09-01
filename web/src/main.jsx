import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

import App from './AppV3.jsx'
import { readSessionToken } from './brand'
import LandingPage from './LandingPage.jsx'
import './styles.css'
import './platform-v3.css'
import './business-layout-v2.css'

function shouldOpenProduct(pathname = window.location.pathname) {
  return Boolean(readSessionToken()) || pathname === '/login' || pathname === '/demo' || /^\/p\/[^/]+\/?$/.test(pathname)
}

function Root() {
  const [openProduct, setOpenProduct] = useState(() => shouldOpenProduct())

  useEffect(() => {
    function handlePopState() {
      setOpenProduct(shouldOpenProduct())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function enterProduct(mode) {
    const path = mode === 'demo' ? '/demo' : '/login'
    window.history.pushState({}, '', path)
    setOpenProduct(true)
  }

  return openProduct ? <App /> : <LandingPage onEnter={enterProduct} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
