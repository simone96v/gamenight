// Entry Vite. Monta App dentro <BrowserRouter> così App.jsx può usare gli hook di react-router.
// StrictMode tenuto: aiuta a beccare side-effects scorretti in dev (esegue effetti due volte).
// In prod StrictMode è un no-op.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
