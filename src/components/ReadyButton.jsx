// Pulsante "Pronto" — toggle per segnalare che il giocatore è pronto.
// Chiama toggle_ready RPC e mostra stato corrente.

import { useState } from 'react'
import { motion } from 'framer-motion'

const ReadyButton = ({ isReady, onToggle, disabled = false, label = 'Pronto' }) => {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading || disabled) return
    setLoading(true)
    try {
      await onToggle()
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.button
      whileHover={disabled || loading ? undefined : {
        y: -2,
        boxShadow: isReady
          ? '0 8px 24px rgba(34,197,94,0.3)'
          : '0 6px 18px rgba(0,0,0,0.10)',
      }}
      whileTap={disabled || loading ? undefined : {
        y: 1,
        scale: 0.96,
        boxShadow: isReady
          ? '0 2px 6px rgba(34,197,94,0.15)'
          : '0 1px 4px rgba(0,0,0,0.06)',
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      onClick={handleClick}
      disabled={disabled || loading}
      style={{
        width: '100%',
        height: 'clamp(48px, 7dvh, 64px)',
        borderRadius: 'var(--radius-sm)',
        border: isReady ? '2px solid var(--success)' : '2px solid var(--border)',
        background: isReady ? 'var(--success)' : 'var(--surface)',
        color: isReady ? 'white' : 'var(--muted)',
        fontSize: 'clamp(16px, 2.5dvh, 20px)',
        fontWeight: 700,
        cursor: disabled || loading ? 'default' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        boxShadow: isReady ? '0 4px 14px rgba(34,197,94,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'background 0.2s, border-color 0.2s, color 0.2s, opacity 0.2s',
      }}
    >
      {loading ? '...' : isReady ? `${label} ✓` : label}
    </motion.button>
  )
}

export default ReadyButton
