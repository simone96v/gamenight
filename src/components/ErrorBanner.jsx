// Banner di errore — prima riga DENTRO .screen (non fixed). Lo ospita ogni schermata.
// Height 40px, flex-shrink:0, bg --danger, testo bianco 13px centrato.
// Auto-dismiss dopo AUTO_DISMISS_MS via setTimeout → clearError().
// Un nuovo errore SOSTITUISCE il precedente (cancella il timer in corso).

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSession } from '../stores/useSession'

const ERROR_MESSAGES = {
  connection:     'Connessione persa — riprovo...',
  room_not_found: 'Stanza non trovata. Controlla il codice.',
  room_full:      'Stanza piena (massimo 8 giocatori).',
  generic:        'Qualcosa è andato storto. Riprova.',
}

const AUTO_DISMISS_MS = 4000

const ErrorBanner = () => {
  const error = useSession((s) => s.error)
  const clearError = useSession((s) => s.clearError)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!error) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => clearError(), AUTO_DISMISS_MS)
    return () => clearTimeout(timerRef.current)
  }, [error, clearError])

  return (
    <AnimatePresence>
      {error && (
        <motion.div
          role="alert"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 40, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex-shrink-0 flex items-center justify-center text-white font-medium text-center overflow-hidden"
          style={{
            background: 'var(--danger)',
            fontSize: 13,
            padding: '0 16px',
            width: '100%',
          }}
        >
          {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.generic}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ErrorBanner
