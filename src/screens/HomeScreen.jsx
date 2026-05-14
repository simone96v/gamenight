// HomeScreen — hero + CTA "Crea party" / "Ho già un codice" + blob che sbucano.

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import GradientTitle from '../components/ui/GradientTitle'
import OptionCard from '../components/ui/OptionCard'
import Spinner from '../components/ui/Spinner'
import ErrorBanner from '../components/ErrorBanner'
import { useSession } from '../stores/useSession'
import { createRoom } from '../lib/room'

const OPTIONS = [
  {
    id: 'create',
    emoji: '🎉',
    title: 'Crea party',
    description: 'Apri un nuovo party e invita i tuoi amici.',
    bg: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(90deg, #8B5CF6, #3B82F6, #10B981, #F59E0B, #F43F5E, #EC4899) border-box',
    shadow: 'rgba(0, 0, 0, 0.06)',
    border: '3px solid transparent',
    textColor: '#111827',
  },
  {
    id: 'join',
    emoji: '🔑',
    title: 'Ho già un codice',
    description: 'Entra in un party già creato da un amico.',
    bg: '#FFFFFF',
    shadow: 'rgba(0, 0, 0, 0.04)',
    border: '1.5px solid var(--border-strong)',
    textColor: '#111827',
    subtleTitle: true,
  },
]

const STATS = [
  { emoji: '🎮', label: 'Mini-giochi' },
  { emoji: '👥', label: '2-8 giocatori' },
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
      background: 'rgba(255,255,255,0.65)',
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

// Sequenza espressioni — blob guardano verso il centro.
// Top-left guarda a destra, bottom-right guarda a sinistra.
const EXPR_SEQUENCE = [
  { top: 'look-right', bottom: 'look-left',  dur: 2500 },
  { top: 'blink',      bottom: 'look-left',  dur: 150 },
  { top: 'look-right', bottom: 'look-left',  dur: 3000 },
  { top: 'look-right', bottom: 'blink',      dur: 150 },
  { top: 'look-right', bottom: 'look-left',  dur: 2000 },
  { top: 'normal',     bottom: 'normal',     dur: 2000 },
  { top: 'blink',      bottom: 'blink',      dur: 150 },
  { top: 'happy',      bottom: 'look-left',  dur: 2500 },
  { top: 'look-right', bottom: 'happy',      dur: 2500 },
  { top: 'blink',      bottom: 'look-left',  dur: 150 },
  { top: 'look-right', bottom: 'look-left',  dur: 2000 },
  { top: 'look-left',  bottom: 'look-right', dur: 2000 },
  { top: 'look-right', bottom: 'blink',      dur: 150 },
  { top: 'look-right', bottom: 'look-left',  dur: 3000 },
  { top: 'blink',      bottom: 'blink',      dur: 150 },
]

const useExpressions = () => {
  const [topExpr, setTopExpr] = useState('look-right')
  const [bottomExpr, setBottomExpr] = useState('look-left')
  const idxRef = useRef(0)

  useEffect(() => {
    let timer
    const step = () => {
      const s = EXPR_SEQUENCE[idxRef.current]
      setTopExpr(s.top)
      setBottomExpr(s.bottom)
      idxRef.current = (idxRef.current + 1) % EXPR_SEQUENCE.length
      timer = setTimeout(step, s.dur)
    }
    step()
    return () => clearTimeout(timer)
  }, [])

  return { topExpr, bottomExpr }
}

// Occhi SVG con espressioni — posizioni relative al centro (lx, rx, ey).
const BlobEyes = ({ expr, lx, rx, ey, prefix, rotate = 0 }) => {
  const pupilDx = expr === 'look-left' ? -9 : expr === 'look-right' ? 9 : 0
  const pupilDy = expr === 'look-left' ? -3 : expr === 'look-right' ? -3 : 0
  const cx = (lx + rx) / 2
  const wrap = (children) =>
    rotate ? <g transform={`rotate(${rotate}, ${cx}, ${ey})`}>{children}</g> : <>{children}</>

  if (expr === 'blink') {
    return wrap(
      <>
        <ellipse cx={lx} cy={ey} rx="24" ry="4" fill="#fff" opacity="0.9" />
        <ellipse cx={rx} cy={ey} rx="24" ry="4" fill="#fff" opacity="0.9" />
      </>
    )
  }

  if (expr === 'happy') {
    return wrap(
      <>
        <path d={`M${lx - 22} ${ey + 3} Q${lx} ${ey - 22}, ${lx + 22} ${ey + 3}`}
          fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <path d={`M${rx - 22} ${ey + 3} Q${rx} ${ey - 22}, ${rx + 22} ${ey + 3}`}
          fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      </>
    )
  }

  return wrap(
    <>
      <ellipse cx={lx} cy={ey} rx="26" ry="28" fill={`url(#${prefix}-eye-l)`} />
      <circle cx={lx + 3 + pupilDx} cy={ey + 4 + pupilDy} r="12" fill="#6D28D9" />
      <circle cx={lx + 5 + pupilDx} cy={ey + 1 + pupilDy} r="4.5" fill="#1E1B4B" />
      <circle cx={lx + 9 + pupilDx} cy={ey - 3 + pupilDy} r="2.8" fill="rgba(255,255,255,0.9)" />
      <ellipse cx={rx} cy={ey} rx="26" ry="28" fill={`url(#${prefix}-eye-r)`} />
      <circle cx={rx + 3 + pupilDx} cy={ey + 4 + pupilDy} r="12" fill="#6D28D9" />
      <circle cx={rx + 5 + pupilDx} cy={ey + 1 + pupilDy} r="4.5" fill="#1E1B4B" />
      <circle cx={rx + 9 + pupilDx} cy={ey - 3 + pupilDy} r="2.8" fill="rgba(255,255,255,0.9)" />
    </>
  )
}

const BLOB_COLORS = {
  tb: ['#C4B5FD', '#A78BFA', '#8B5CF6'],
  tr: ['#FDE68A', '#FBBF24', '#F59E0B'],
  bl: ['#6EE7B7', '#34D399', '#10B981'],
  bb: ['#FDA4AF', '#FB7185', '#F43F5E'],
}

const blobDefs = (prefix) => {
  const [c1, c2, c3] = BLOB_COLORS[prefix] || BLOB_COLORS.tb
  return (
    <defs>
      <linearGradient id={`${prefix}-grad`} x1="0%" y1="0%" x2="100%" y2="80%">
        <stop offset="0%" stopColor={c1} />
        <stop offset="40%" stopColor={c2} />
        <stop offset="100%" stopColor={c3} />
      </linearGradient>
      <radialGradient id={`${prefix}-eye-l`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fff" />
        <stop offset="100%" stopColor="#F0ECF9" />
      </radialGradient>
      <radialGradient id={`${prefix}-eye-r`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fff" />
        <stop offset="100%" stopColor="#F0ECF9" />
      </radialGradient>
    </defs>
  )
}

const BottomBlob = ({ expr }) => (
  <div style={{
    position: 'fixed',
    bottom: 'clamp(-60px, -9dvh, -35px)',
    right: 'clamp(-80px, -12vw, -50px)',
    zIndex: 0,
    pointerEvents: 'none',
    lineHeight: 0,
  }}>
    <svg
      viewBox="0 0 300 300"
      style={{ width: 'clamp(200px, 45vw, 320px)', height: 'auto' }}
      aria-hidden="true"
    >
      {blobDefs('bb')}
      <circle cx="150" cy="150" r="145" fill="url(#bb-grad)" />
      <BlobEyes expr={expr} lx={115} rx={185} ey={140} prefix="bb" rotate={-45} />
    </svg>
  </div>
)

const TopBlob = ({ expr }) => (
  <div style={{
    position: 'fixed',
    top: 'clamp(-60px, -9dvh, -35px)',
    left: 'clamp(-80px, -12vw, -50px)',
    zIndex: 0,
    pointerEvents: 'none',
    lineHeight: 0,
  }}>
    <svg
      viewBox="0 0 300 300"
      style={{ width: 'clamp(200px, 45vw, 320px)', height: 'auto' }}
      aria-hidden="true"
    >
      {blobDefs('tb')}
      <circle cx="150" cy="150" r="145" fill="url(#tb-grad)" />
      <BlobEyes expr={expr} lx={115} rx={185} ey={140} prefix="tb" rotate={-45} />
    </svg>
  </div>
)

const TopRightBlob = ({ expr }) => (
  <div style={{
    position: 'fixed',
    top: 'clamp(-70px, -10dvh, -40px)',
    right: 'clamp(-90px, -14vw, -55px)',
    zIndex: 0,
    pointerEvents: 'none',
    lineHeight: 0,
  }}>
    <svg
      viewBox="0 0 300 300"
      style={{ width: 'clamp(230px, 52vw, 360px)', height: 'auto' }}
      aria-hidden="true"
    >
      {blobDefs('tr')}
      <circle cx="150" cy="150" r="145" fill="url(#tr-grad)" />
      <BlobEyes expr={expr} lx={115} rx={185} ey={140} prefix="tr" rotate={45} />
    </svg>
  </div>
)

const BottomLeftBlob = ({ expr }) => (
  <div style={{
    position: 'fixed',
    bottom: 'clamp(-70px, -10dvh, -40px)',
    left: 'clamp(-90px, -14vw, -55px)',
    zIndex: 0,
    pointerEvents: 'none',
    lineHeight: 0,
  }}>
    <svg
      viewBox="0 0 300 300"
      style={{ width: 'clamp(230px, 52vw, 360px)', height: 'auto' }}
      aria-hidden="true"
    >
      {blobDefs('bl')}
      <circle cx="150" cy="150" r="145" fill="url(#bl-grad)" />
      <BlobEyes expr={expr} lx={115} rx={185} ey={140} prefix="bl" rotate={45} />
    </svg>
  </div>
)

const HomeScreen = () => {
  const navigate = useNavigate()
  const resetSession = useSession((s) => s.resetSession)
  const setOnlineMode = useSession((s) => s.setOnlineMode)
  const showError = useSession((s) => s.showError)
  const [creating, setCreating] = useState(false)
  const { topExpr, bottomExpr } = useExpressions()

  const handlePick = async (id) => {
    if (creating) return
    if (id === 'join') {
      navigate('/join')
      return
    }
    setCreating(true)
    resetSession()
    const { code, error } = await createRoom({
      players: [],
      categoryVotes: {},
      gameVotes: {},
      selectedGame: null,
    })
    if (error || !code) {
      showError('generic')
      setCreating(false)
      return
    }
    setOnlineMode(code, true, null)
    setCreating(false)
    navigate('/lobby')
  }

  return (
    <motion.div
      className="screen screen-narrow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <ErrorBanner />

      <div
        className="screen-body"
        style={{
          justifyContent: 'center',
          paddingTop: 'clamp(24px, 5dvh, 48px)',
          paddingBottom: 'clamp(16px, 3dvh, 28px)',
          gap: 'clamp(20px, 3.5dvh, 36px)',
        }}
      >
        {/* HERO — solo testo, niente blob */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ textAlign: 'center' }}
        >
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
              disabled={creating && opt.id === 'create'}
              badge={creating && opt.id === 'create' ? <Spinner size="sm" /> : null}
            />
          ))}
        </div>

      </div>

      <TopBlob expr={topExpr} />
      <TopRightBlob expr={bottomExpr} />
      <BottomLeftBlob expr={topExpr} />
      <BottomBlob expr={bottomExpr} />
    </motion.div>
  )
}

export default HomeScreen
