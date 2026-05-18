// Entry Vite. Monta App dentro <BrowserRouter> così App.jsx può usare gli hook di react-router.
// StrictMode tenuto: aiuta a beccare side-effects scorretti in dev (esegue effetti due volte).
// In prod StrictMode è un no-op.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { useAuth } from './stores/useAuth'

// Idrata la sessione Supabase appena possibile (prima del render iniziale).
// Fa una sola lettura di getSession() + registra il listener auth-state.
useAuth.getState().bootstrap()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Rimuovi il fallback HTML di boot ora che React ha preso il controllo.
// (Definito in index.html — vedi #boot-fallback)
const bootFallback = document.getElementById('boot-fallback')
if (bootFallback) bootFallback.remove()
