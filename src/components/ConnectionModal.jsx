// ConnectionModal — modale full-screen NON-dismissibile (no ESC, no backdrop click)
// per gli stati di disconnessione. Si chiude solo via CTA esplicita o
// auto-dismiss quando la condizione torna a posto.
//
// Renderizzata in App.jsx in base ai flag di useSession:
//   hostClosed         → variant="party-closed"   (terminale, CTA "Torna alla home")
//   hostOffline        → variant="host-offline"   (in attesa, CTA "Esci dal party")
//   own connection lost → variant="own-connection" (CTA "Riprova" / "Torna alla home")

import { motion, AnimatePresence } from 'framer-motion'
import Button from './ui/Button'
import Spinner from './ui/Spinner'

const VARIANTS = {
  'host-offline': {
    emoji: '🟡',
    title: 'Host disconnesso',
    body: 'L\'host si è disconnesso. Stiamo aspettando che torni — la partita riprenderà dalla lobby appena rientra.',
    showSpinner: true,
    primary: null,
    secondary: { label: 'Esci dal party' },
  },
  'party-closed': {
    emoji: '👋',
    title: 'Party chiuso',
    body: 'L\'host ha chiuso il party. Puoi tornare alla home e crearne uno nuovo o entrare in un altro.',
    showSpinner: false,
    primary: { label: 'Torna alla home' },
    secondary: null,
  },
  'own-connection': {
    emoji: '🔴',
    title: 'Connessione persa',
    body: 'Non riusciamo a raggiungere il party. Stiamo riprovando — controlla la tua connessione.',
    showSpinner: true,
    primary: null,
    secondary: { label: 'Torna alla home' },
  },
}

const ConnectionModal = ({ variant, attempts = 0, onPrimary, onSecondary }) => {
  const cfg = VARIANTS[variant]
  const open = !!cfg

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="conn-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={S.backdrop}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={S.card}
          >
            <div style={S.emoji} aria-hidden="true">{cfg.emoji}</div>
            <h2 id="conn-modal-title" style={S.title}>{cfg.title}</h2>
            <p style={S.body}>{cfg.body}</p>

            {cfg.showSpinner && (
              <div style={S.spinnerRow}>
                <Spinner size="sm" />
                {variant === 'own-connection' && attempts > 0 && (
                  <span style={S.attempts}>Tentativo {attempts}/5</span>
                )}
              </div>
            )}

            <div style={S.actions}>
              {cfg.primary && (
                <Button
                  variant="primary"
                  width="full"
                  onClick={onPrimary}
                >
                  {cfg.primary.label}
                </Button>
              )}
              {cfg.secondary && (
                <Button
                  variant="secondary"
                  width="full"
                  onClick={onSecondary}
                >
                  {cfg.secondary.label}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const S = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(15, 23, 42, 0.78)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(16px, 4vw, 28px)',
  },
  card: {
    maxWidth: 380,
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-lg)',
    padding: 'clamp(22px, 4dvh, 32px) clamp(22px, 5vw, 30px) clamp(18px, 3dvh, 26px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    color: 'var(--text)',
  },
  emoji: {
    fontSize: 'clamp(46px, 8dvh, 60px)',
    lineHeight: 1,
    marginBottom: 'clamp(8px, 1.2dvh, 12px)',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(18px, 2.5dvh, 22px)',
    fontWeight: 800,
    letterSpacing: '-0.01em',
    color: 'var(--text)',
  },
  body: {
    margin: 'clamp(8px, 1.2dvh, 12px) 0 clamp(12px, 1.8dvh, 18px)',
    fontSize: 'clamp(13px, 1.6dvh, 15px)',
    color: 'var(--muted)',
    fontWeight: 500,
    lineHeight: 1.45,
  },
  spinnerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 'clamp(14px, 2dvh, 18px)',
    color: 'var(--muted)',
    fontSize: 'clamp(12px, 1.4dvh, 13px)',
    fontWeight: 600,
  },
  attempts: {
    fontVariantNumeric: 'tabular-nums',
  },
  actions: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
}

export default ConnectionModal
