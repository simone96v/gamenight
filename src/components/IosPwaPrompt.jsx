// Mostra un banner in-app su iOS Safari per guidare l'installazione PWA.
// Appare solo se: iOS + Safari + non già installata + non ancora mostrato.

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

const STORAGE_KEY = 'pwa-ios-prompt-dismissed'

// Icona Share di Safari — SVG inline per non dipendere da font
const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
)

const IosPwaPrompt = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Mostra solo su iOS Safari non-standalone e se non già chiuso
    if (!isIos()) return
    if (isInStandaloneMode()) return
    if (sessionStorage.getItem(STORAGE_KEY)) return

    // Piccolo delay per non sbucare subito al caricamento
    const t = setTimeout(() => setVisible(true), 2500)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    setVisible(false)
    sessionStorage.setItem(STORAGE_KEY, '1')
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
          {/* Freccia verso il basso che punta al tasto share */}
          <div style={S.arrow} />

          <div style={S.card}>
            {/* Header */}
            <div style={S.header}>
              <img src="/icons/icon-192.png" alt="Blob Party" style={S.appIcon} />
              <div style={S.headerText}>
                <span style={S.appName}>Blob Party</span>
                <span style={S.appSub}>Aggiungi alla schermata Home</span>
              </div>
              <button onClick={dismiss} style={S.closeBtn} aria-label="Chiudi">✕</button>
            </div>

            {/* Istruzioni step-by-step */}
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
  arrow: {
    width: 0,
    height: 0,
    borderLeft: '10px solid transparent',
    borderRight: '10px solid transparent',
    borderTop: '12px solid rgba(255,255,255,0.95)',
    marginBottom: -1,
    filter: 'drop-shadow(0 -2px 4px rgba(0,0,0,0.08))',
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
    background: '#F5F3FF',
    borderRadius: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: '#8B5CF6',
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

export default IosPwaPrompt
