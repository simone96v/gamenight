// HomeScreen — hero + CTA "Crea party" / "Ho già un codice" + un blob piccolo sopra il logo e uno grande che sbuca dal basso al centro.

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import GradientTitle from '../components/ui/GradientTitle'
import OptionCard from '../components/ui/OptionCard'
import ErrorBanner from '../components/ErrorBanner'
import Blob from '../components/Blob'
import { useBlobGaze } from '../hooks/useBlob'
import { useSettings } from '../stores/useSettings'

const useOptions = () => {
  const theme = useSettings((s) => s.theme)
  const surfaceBg = theme === 'dark' ? '#1e2130' : '#fff'
  return [
    {
      id: 'create',
      emoji: '🎉',
      title: 'Crea party',
      description: 'Apri un nuovo party e invita i tuoi amici.',
      bg: `linear-gradient(${surfaceBg}, ${surfaceBg}) padding-box, linear-gradient(90deg, #8B5CF6, #3B82F6, #10B981, #F59E0B, #F43F5E, #EC4899) border-box`,
      shadow: 'rgba(0, 0, 0, 0.06)',
      // 1.5px allineato a Solo/Join così tutti i bottoni hanno la stessa dimensione.
      border: '1.5px solid transparent',
      textColor: 'var(--text)',
    },
    {
      id: 'solo',
      emoji: '🎮',
      title: 'Gioca da solo',
      description: 'Allenati o gioca per conto tuo.',
      bg: 'var(--surface)',
      shadow: 'rgba(0, 0, 0, 0.04)',
      border: '1.5px solid var(--border-strong)',
      textColor: 'var(--text)',
      subtleTitle: true,
    },
    {
      id: 'join',
      emoji: '🔑',
      title: 'Ho già un codice',
      description: 'Entra in un party già creato da un amico.',
      bg: 'var(--surface)',
      shadow: 'rgba(0, 0, 0, 0.04)',
      border: '1.5px solid var(--border-strong)',
      textColor: 'var(--text)',
      subtleTitle: true,
    },
  ]
}

const STATS = [
  { emoji: '🎮', label: 'Mini-giochi' },
  { emoji: '👥', label: '1-8 giocatori' },
  { emoji: '⚡', label: 'Senza account' },
]

const StatPill = ({ emoji, label, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
      borderRadius: 999,
      background: 'color-mix(in srgb, var(--surface) 65%, transparent)',
      backdropFilter: 'blur(6px)',
      border: '1px solid var(--border)',
      fontSize: 'clamp(11px, 1.4dvh, 13px)',
      fontWeight: 700,
      color: 'var(--text)',
      whiteSpace: 'nowrap',
    }}
  >
    <span style={{ fontSize: 14 }}>{emoji}</span>
    <span>{label}</span>
  </motion.div>
)

// Sequenza espressioni del blob hero — ciclo automatico di sguardi/blink/sorrisi.
const EXPR_SEQUENCE = [
  { expr: 'look-right', dur: 2500 },
  { expr: 'blink',      dur: 150 },
  { expr: 'look-right', dur: 3000 },
  { expr: 'normal',     dur: 2000 },
  { expr: 'happy',      dur: 2500 },
  { expr: 'blink',      dur: 150 },
  { expr: 'look-left',  dur: 2000 },
  { expr: 'blink',      dur: 150 },
  { expr: 'look-right', dur: 3000 },
]

const useExprCycle = (startIdx = 0) => {
  const [expr, setExpr] = useState(EXPR_SEQUENCE[startIdx].expr)
  const idxRef = useRef(startIdx)
  useEffect(() => {
    let timer
    const step = () => {
      const s = EXPR_SEQUENCE[idxRef.current]
      setExpr(s.expr)
      idxRef.current = (idxRef.current + 1) % EXPR_SEQUENCE.length
      timer = setTimeout(step, s.dur)
    }
    step()
    return () => clearTimeout(timer)
  }, [])
  return expr
}

const ThemeToggle = () => {
  const theme = useSettings((s) => s.theme)
  const toggleTheme = useSettings((s) => s.toggleTheme)
  const isDark = theme === 'dark'

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ scale: 1.08, boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      aria-label={isDark ? 'Passa a modalita chiara' : 'Passa a modalita scura'}
      style={{
        width: 42,
        height: 42,
        borderRadius: '50%',
        background: 'var(--surface)',
        border: '1.5px solid var(--border-strong)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: 20,
        lineHeight: 1,
      }}
    >
      <motion.span
        key={isDark ? 'sun' : 'moon'}
        initial={{ rotate: -90, scale: 0 }}
        animate={{ rotate: 0, scale: 1 }}
        exit={{ rotate: 90, scale: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      >
        {isDark ? '☀️' : '🌙'}
      </motion.span>
    </motion.button>
  )
}

// Blob inferiore: 35% del corpo esce dal viewport bottom (65% visibile).
// Con il viso canonico (smile bottom y=174) la faccia resta sopra il bordo.
const BOTTOM_BLOB_SIZE   = 'clamp(166px, 48vw, 307px)'
const BOTTOM_BLOB_OFFSET = 'clamp(-108px, -17vw, -58px)'

const HomeScreen = () => {
  const navigate = useNavigate()
  const topExpr = useExprCycle(0)
  const bottomExpr = useExprCycle(4) // sfasato dal top per non blinkare insieme
  const gaze = useBlobGaze({ strength: 1 })
  const OPTIONS = useOptions()

  const handlePick = (id) => {
    if (id === 'join') navigate('/join')
    else if (id === 'solo') navigate('/solo')
    else navigate('/create')
  }

  return (
    <motion.div
      className="screen screen-narrow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ position: 'relative' }}
    >
      <ErrorBanner />

      <div
        className="screen-body"
        style={{
          justifyContent: 'flex-start',
          paddingTop: 'clamp(12px, 2.5dvh, 24px)',
          paddingBottom: 'clamp(16px, 3dvh, 28px)',
          gap: 'clamp(20px, 3.5dvh, 36px)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ textAlign: 'center' }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <Blob
              color="#F59E0B"
              expr={topExpr}
              id="hero"
              size="clamp(56px, 12vw, 88px)"
              animate={false}
              gaze={gaze}
              style={{ position: 'relative' }}
            />
          </div>
          <GradientTitle as="h1" size="xl">
            Blob Party
          </GradientTitle>
          <p
            style={{
              margin: '6px 0 0',
              color: 'var(--muted)',
              fontSize: 'clamp(13px, 1.7dvh, 15px)',
              fontWeight: 500,
            }}
          >
            Mini-giochi per le serate con i tuoi
          </p>

          {/* Stats pills */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 'clamp(10px, 1.6dvh, 16px)',
            }}
          >
            {STATS.map((s, i) => (
              <StatPill key={s.label} emoji={s.emoji} label={s.label} delay={0.15 + i * 0.05} />
            ))}
          </div>
        </motion.div>

        {/* CTA cards */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(10px, 1.5dvh, 14px)',
          }}
        >
          {OPTIONS.map((opt, i) => (
            <OptionCard
              key={opt.id}
              option={opt}
              index={i}
              onClick={() => handlePick(opt.id)}
            />
          ))}
        </div>

        {/* Theme toggle */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <ThemeToggle />
        </motion.div>
      </div>

      {/* Blob inferiore — 35% esce dal viewport bottom, 65% visibile */}
      <Blob
        color="#F59E0B"
        expr={bottomExpr}
        id="bottom-hero"
        size={BOTTOM_BLOB_SIZE}
        animate={false}
        gaze={gaze}
        style={{
          bottom: BOTTOM_BLOB_OFFSET,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
    </motion.div>
  )
}

export default HomeScreen
