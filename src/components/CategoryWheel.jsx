// Wheel delle categorie — sincronizzata tra host e client.
//
// Flusso:
//   1. Host clicca Spin → chiama onRequestSpin()
//   2. Il parent sceglie il vincitore e lo pusha su DB come spinTarget
//   3. TUTTI i client ricevono spinTarget via Realtime
//   4. La wheel anima verso quella categoria (~4s + 2s celebrazione)
//   5. Al termine chiama onSpinEnd(category) — solo l'host lo gestisce
//
// Props:
//   - categories: array di { id, label, emoji, color }
//   - spinTarget: category ID da raggiungere (null = idle)
//   - onRequestSpin(): host chiede di spinnare
//   - onSpinEnd(category): dopo animazione + celebrazione
//   - disabled: disabilita il bottone
//   - canSpin: true se il giocatore locale può spinnare
//   - spinnerName: nome del giocatore che deve spinnare (per il testo d'attesa)

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { haptic } from '../utils/haptic'

const WHEEL_SIZE = 280
const CX = WHEEL_SIZE / 2
const CY = WHEEL_SIZE / 2
const R = (WHEEL_SIZE / 2) - 4

const CategoryWheel = ({
  categories = [],
  spinTarget = null,
  onRequestSpin,
  onSpinEnd,
  disabled = false,
  canSpin = false,
  spinnerName = '',
}) => {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [landed, setLanded] = useState(null)
  const [celebrating, setCelebrating] = useState(false)
  const processedTarget = useRef(null)

  // Refs stabili — evitano che le Realtime updates (che producono nuovi array/callback)
  // cancellino i timer dell'animazione in corso via cleanup dell'effect.
  const categoriesRef = useRef(categories)
  const onSpinEndRef = useRef(onSpinEnd)
  useEffect(() => { categoriesRef.current = categories }, [categories])
  useEffect(() => { onSpinEndRef.current = onSpinEnd }, [onSpinEnd])

  const segCount = categories.length
  const segAngle = segCount > 0 ? 360 / segCount : 0

  // Quando spinTarget cambia (arriva dal DB), avvia l'animazione.
  // UNICA dep reale: spinTarget. Tutto il resto è letto via ref.
  useEffect(() => {
    if (!spinTarget) return
    if (spinTarget === processedTarget.current) return

    const cats = categoriesRef.current
    const count = cats.length
    if (count === 0) return

    const angle = 360 / count
    const winIdx = cats.findIndex((c) => c.id === spinTarget)
    if (winIdx === -1) return

    processedTarget.current = spinTarget
    setSpinning(true)
    setLanded(null)
    setCelebrating(false)
    haptic.medium()

    const segCenter = winIdx * angle + angle / 2
    const offset = ((360 - segCenter) % 360 + 360) % 360
    const total = 360 * 6 + offset

    setRotation((prev) => prev + total)

    // Wheel stops ~4.2s → celebration ~2.2s → onSpinEnd
    let celebTimer
    const spinTimer = setTimeout(() => {
      setSpinning(false)
      setLanded(cats[winIdx])
      setCelebrating(true)
      haptic.land()

      celebTimer = setTimeout(() => {
        setCelebrating(false)
        onSpinEndRef.current?.(cats[winIdx])
      }, 1500)
    }, 4200)

    return () => {
      clearTimeout(spinTimer)
      clearTimeout(celebTimer)
    }
    // Solo spinTarget triggera l'animazione. categories e onSpinEnd via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinTarget])

  if (segCount === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
        Nessuna categoria disponibile
      </div>
    )
  }

  const isBusy = spinning || celebrating

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      {/* Celebration overlay */}
      <AnimatePresence>
        {celebrating && landed && (
          <motion.div
            key="celebration"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={celebrationOverlayStyle}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, -8, 8, -4, 0] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ fontSize: 'clamp(64px, 14vw, 88px)', lineHeight: 1, filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.3))' }}
            >
              {landed.emoji}
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                margin: 0,
                fontSize: 'clamp(24px, 5vw, 34px)',
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '-0.01em',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {landed.label}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ delay: 0.4 }}
              style={{
                margin: 0,
                fontSize: 'clamp(13px, 1.6dvh, 16px)',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              Preparati... si parte! 🚀
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', width: WHEEL_SIZE, height: WHEEL_SIZE + 24 }}>
        {/* Pointer */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '14px solid transparent',
          borderRight: '14px solid transparent',
          borderTop: '22px solid #374151',
          zIndex: 2,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        }} />

        <motion.svg
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.17, 0.67, 0.16, 0.99] }}
          style={{
            position: 'absolute',
            top: 24,
            left: 0,
            filter: 'drop-shadow(0 14px 32px rgba(0, 0, 0, 0.25))',
          }}
        >
          {categories.map((cat, i) => {
            const a1 = (i * segAngle - 90) * Math.PI / 180
            const a2 = ((i + 1) * segAngle - 90) * Math.PI / 180
            const x1 = CX + R * Math.cos(a1)
            const y1 = CY + R * Math.sin(a1)
            const x2 = CX + R * Math.cos(a2)
            const y2 = CY + R * Math.sin(a2)
            const largeArc = segAngle > 180 ? 1 : 0
            const path = `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`

            // Colored accent arc at the outer edge
            const arcR = R - 3
            const ax1 = CX + arcR * Math.cos(a1)
            const ay1 = CY + arcR * Math.sin(a1)
            const ax2 = CX + arcR * Math.cos(a2)
            const ay2 = CY + arcR * Math.sin(a2)
            const accentArc = `M ${ax1} ${ay1} A ${arcR} ${arcR} 0 ${largeArc} 1 ${ax2} ${ay2}`

            const labelAngle = (i * segAngle + segAngle / 2 - 90) * Math.PI / 180
            const lr = R * 0.56
            const lx = CX + lr * Math.cos(labelAngle)
            const ly = CY + lr * Math.sin(labelAngle)
            const textRotation = i * segAngle + segAngle / 2
            const emojiSize = segCount > 6 ? 28 : 36
            const baseFill = i % 2 === 0 ? '#F9FAFB' : '#F1F3F5'

            return (
              <g key={cat.id}>
                <path d={path} fill={baseFill} stroke="#E5E7EB" strokeWidth={1.5} />
                <path d={accentArc} fill="none" stroke={cat.color} strokeWidth={6} strokeLinecap="round" />
                <g transform={`translate(${lx} ${ly}) rotate(${textRotation})`}>
                  <text
                    x="0" y={emojiSize * 0.35}
                    textAnchor="middle"
                    fontSize={emojiSize}
                  >
                    {cat.emoji}
                  </text>
                </g>
              </g>
            )
          })}
          <circle cx={CX} cy={CY} r={22} fill="#fff" stroke="#E5E7EB" strokeWidth={2} />
          <circle cx={CX} cy={CY} r={8} fill="#1F2937" />
        </motion.svg>
      </div>

      {/* Spin button (spinner) / status text (others) */}
      {canSpin ? (
        <motion.button
          type="button"
          onClick={onRequestSpin}
          disabled={isBusy || disabled || segCount === 0}
          whileHover={(isBusy || disabled) ? undefined : {
            y: -2,
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
          }}
          whileTap={(isBusy || disabled) ? undefined : {
            y: 1,
            scale: 0.97,
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          style={{
            background: isBusy
              ? 'var(--surface2)'
              : 'var(--accent)',
            color: isBusy ? 'var(--muted)' : 'var(--bg)',
            border: 'none',
            padding: '14px 32px',
            borderRadius: 16,
            fontSize: 'clamp(14px, 1.8dvh, 17px)',
            fontWeight: 900,
            letterSpacing: '0.01em',
            cursor: (isBusy || disabled) ? 'default' : 'pointer',
            opacity: disabled ? 0.55 : 1,
            boxShadow: isBusy ? 'none' : '0 8px 20px rgba(0, 0, 0, 0.35)',
            transition: 'opacity 0.2s, background 0.15s, color 0.15s',
            minWidth: 200,
          }}
        >
          {spinning
            ? 'Sto spinnando...'
            : celebrating
              ? 'Caricamento...'
              : 'SPIN!'}
        </motion.button>
      ) : (
        <p style={{
          margin: 0,
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: 'clamp(13px, 1.6dvh, 15px)',
          fontWeight: 600,
          minHeight: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {isBusy
            ? 'La ruota gira...'
            : spinnerName
              ? `Tocca a ${spinnerName} spinnare!`
              : 'In attesa...'}
        </p>
      )}
    </div>
  )
}

const celebrationOverlayStyle = {
  position: 'absolute',
  inset: 0,
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'clamp(10px, 2dvh, 18px)',
  background: 'radial-gradient(ellipse at center, rgba(17,24,39,0.92) 0%, rgba(31,41,55,0.95) 100%)',
  borderRadius: 20,
  backdropFilter: 'blur(12px)',
}

export default CategoryWheel
