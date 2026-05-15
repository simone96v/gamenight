// Sincronizza il tema (light/dark) dal settings store all'attributo data-theme sull'html.
// Chiamato una volta in App.jsx.

import { useEffect } from 'react'
import { useSettings } from '../stores/useSettings'

export const useThemeSync = () => {
  const theme = useSettings((s) => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    // Aggiorna anche il meta theme-color per la barra del browser mobile
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#0f1117' : '#F8F9FA')
    }
  }, [theme])
}
