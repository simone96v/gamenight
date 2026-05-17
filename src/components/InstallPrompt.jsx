// Banner di installazione PWA, mostrato al primo accesso.
//
// Tre modalità:
//   - iOS Safari: istruzioni passo-passo (Add to Home Screen)
//   - Android/Desktop con beforeinstallprompt: bottone "Installa" che triggera
//     il prompt nativo del browser
//   - In tutti gli altri casi (già installata, browser senza supporto): non mostra
//
// Persiste il dismiss in localStorage così non riappare al successivo accesso.

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STORAGE_KEY = 'pwa-install-dismissed'

const isIos = () => {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return true
  // iPadOS 13+ si identifica come Mac, distinguiamo via touch
  if (ua.includes('Mac') && navigator.maxTouchPoints > 1) return true
  return false
}

const isInStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

const isSafari = () =>
  /safari/i.test(navigator.userAgent) &&
  !/chrome|android|crios|fxios/i.test(navigator.userAgent)

const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
)

const InstallPrompt = () => {
  const [mode, setMode] = useState(null) // 'ios' | 'native'
  const [visible, setVisible] = useState(false)
  const deferredRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(STORAGE_KEY)) return
    if (isInStandalone()) return

    // iOS Safari: nessun beforeinstallprompt nativo, mostriamo istruzioni.
    if (isIos() && isSafari()) {
      const t = setTimeout(() => {
        setMode('ios')
        setVisible(true)
      }, 800)
      return () => clearTimeout(t)
    }

    // Altri browser: aspettiamo l'evento beforeinstallprompt.
    const beforeHandler = (e) => {
      e.preventDefault()
      deferredRef.current = e
      setMode('native')
      setVisible(true)
    }
    const installedHandler = () => {
      setVisible(false)
      localStorage.setItem(STORAGE_KEY, '1')
    }
    window.addEventListener('beforeinstallprompt', beforeHandler)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeHandler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  const triggerInstall = async () => {
    const dp = deferredRef.current
    if (!dp) return
    dp.prompt()
    try {
      const { outcome } = await dp.userChoice
      deferredRef.current = null
      if (outcome === 'accepted') {
        setVisible(false)
        localStorage.setItem(STORAGE_KEY, '1')
      }
    } catch {
      // Utente annulla / browser blocca — banner resta visibile
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          style={S.wrapper}
        >
          <div style={S.card}>
            <div style={S.header}>
              <img src="/icons/icon-192.png" alt="Blob Party" style={S.appIcon} />
              <div style={S.headerText}>
                <span style={S.appName}>Blob Party</span>
                <span style={S.appSub}>
                  {mode === 'ios' ? 'Aggiungi alla schermata Home' : 'Installa l\'app'}
                </span>
              </div>
              <button onClick={dismiss} style={S.closeBtn} aria-label="Chiudi">✕</button>
            </div>

            {mode === 'native' ? (
              <button onClick={triggerInstall} style={S.installBtn}>
                Installa
              </button>
            ) : (
              <div style={S.steps}>
                <div style={S.step}>
                  <span style={S.stepNum}>1</span>
                  <span style={S.stepText}>
                    Tocca il tasto{' '}
                    <span style={S.inlineIcon}><ShareIcon /></span>
                    {' '}in basso su Safari
                  </span>
                </div>
                <div style={S.step}>
                  <span style={S.stepNum}>2</span>
                  <span style={S.stepText}>
                    Scorri e tocca <strong>"Aggiungi a schermata Home"</strong>
                  </span>
                </div>
                <div style={S.step}>
                  <span style={S.stepNum}>3</span>
                  <span style={S.stepText}>Tocca <strong>"Aggiungi"</strong> in alto a destra</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const S = {
  wrapper: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
    pointerEvents: 'none',
  },
  card: {
    background: 'rgba(255,255,255,0.97)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px 20px 0 0',
    padding: '16px 20px 20px',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
    pointerEvents: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  appIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
  headerText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  appName: {
    fontWeight: 800,
    fontSize: 16,
    color: '#111827',
    lineHeight: 1.2,
  },
  appSub: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: 500,
  },
  closeBtn: {
    background: 'rgba(0,0,0,0.06)',
    border: 'none',
    borderRadius: '50%',
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    color: '#6B7280',
    cursor: 'pointer',
    flexShrink: 0,
    fontWeight: 700,
  },
  installBtn: {
    width: '100%',
    padding: '14px 20px',
    borderRadius: 14,
    border: 'none',
    background: '#F59E0B',
    color: '#fff',
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: '0.01em',
    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
    cursor: 'pointer',
  },
  steps: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: '#FEF3C7',
    borderRadius: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: '#F59E0B',
    color: '#fff',
    fontWeight: 800,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 1.4,
  },
  inlineIcon: {
    display: 'inline-flex',
    verticalAlign: 'middle',
    color: '#007AFF',
    marginBottom: 2,
  },
}

export default InstallPrompt
