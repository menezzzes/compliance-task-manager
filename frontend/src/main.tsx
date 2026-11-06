import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { API_URL } from './api/config'
import { MissingApiUrl } from './components/MissingApiUrl'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {API_URL === null ? <MissingApiUrl /> : <App />}
  </StrictMode>,
)
