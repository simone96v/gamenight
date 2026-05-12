// Modale 18+ per categorie con ageWarning. Aperta da HomeScreen prima di selezionare la categoria.
// Click sul backdrop → onCancel. ESC → onCancel.

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from './ui/Button'

const AgeModal = ({ open = false, onConfirm, onCancel }) => {
  // ESC chiude la modale (accessibilità da tastiera).
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', padding: 'clamp(16px, 4vw, 28px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="age-modal-title"
        >
          <motion.div
            initial={{ scale: 0.92, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="rounded bg-surface w-full"
            style={{
              maxWidth: 380,
              padding: 'clamp(20px, 3dvh, 28px)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <h2
              id="age-modal-title"
              className="font-bold"
              style={{
                fontSize: 'clamp(20px, 3.5dvh, 28px)',
                marginBottom: 'clamp(8px, 1.5dvh, 12px)',
                letterSpacing: '-0.01em',
              }}
            >
              Contenuto per adulti
            </h2>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: 'clamp(14px, 2dvh, 16px)',
                lineHeight: 1.45,
                marginBottom: 'clamp(16px, 2.5dvh, 24px)',
              }}
            >
              Questa categoria contiene domande non adatte ai minori.
              Confermi di avere almeno 18 anni?
            </p>
            <div className="flex" style={{ gap: 'clamp(8px, 1.5dvh, 12px)' }}>
              <Button variant="secondary" width="full" onClick={onCancel}>
                Annulla
              </Button>
              <Button variant="primary" width="full" onClick={onConfirm}>
                Ho 18+
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AgeModal
