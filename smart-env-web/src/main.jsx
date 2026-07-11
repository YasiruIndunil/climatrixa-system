import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import api from './utils/api'

// Backend is hosted on Render's free tier and sleeps after inactivity —
// cold starts can take 20-30s. Pinging it on first paint (before login/data
// queries fire) means it's usually already awake by the time real requests go out.
api.get('/health').catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
