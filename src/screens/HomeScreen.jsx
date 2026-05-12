// HomeScreen — Game Hub, full-screen on PC.
// Mostra tutti i giochi disponibili (Trivia) e quelli in arrivo (locked).
// Nessun aspect ratio fisso — si adatta a qualsiasi schermo.

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const GAMES_CATALOG = [
  {
    id: 'trivia',
    name: 'Trivia',
    emoji: '🧠',
    tagline: 'Sfida le tue conoscenze',
    description: 'Domande a risposta multipla su cultura, scienza, sport e molto altro. Chi sa di più vince!',
    bg: 'linear-gradient(145deg, #3B1F7A 0%, #6D28D9 55%, #A855F7 100%)',
    shadow: 'rgba(109, 40, 217, 0.45)',
    locked: false,
    minPlayers: 2,
    maxPlayers: 8,
    difficulty: 2,
  },
  {
    id: 'draw',
    name: 'Disegna!',
    emoji: '🎨',
    tagline: 'Disegna, indovina, ridi',
    description: 'Uno disegna, gli altri indovinano. Il peggior artista porta a casa i meme.',
    bg: 'linear-gradient(145deg, #1E3A8A 0%, #1D4ED8 55%, #60A5FA 100%)',
    shadow: 'rgba(29, 78, 216, 0.4)',
    locked: true,
    minPlayers: 3,
    maxPlayers: 8,
    difficulty: 2,
  },
  {
    id: 'stop',
    name: 'Stop!',
    emoji: '✏️',
    tagline: 'Categorie e velocità',
    description: 'Data una lettera, trova parole in ogni categoria prima dello stop. Nessuna ripetizione!',
    bg: 'linear-gradient(145deg, #78350F 0%, #B45309 55%, #FCD34D 100%)',
    shadow: 'rgba(180, 83, 9, 0.4)',
    locked: true,
    minPlayers: 2,
    maxPlayers: 10,
    difficulty: 2,
  },
  {
    id: 'bluff',
    name: 'Bluff',
    emoji: '🃏',
    tagline: 'Inganna tutti',
    description: 'Scrivi una definizione falsa e convincente. Vince chi inganna più giocatori.',
    bg: 'linear-gradient(145deg, #7F1D1D 0%, #B91C1C 55%, #F87171 100%)',
    shadow: 'rgba(185, 28, 28, 0.4)',
    locked: true,
    minPlayers: 3,
    maxPlayers: 8,
    difficulty: 3,
  },
  {
    id: 'mimo',
    name: 'Mimo',
    emoji: '🎭',
    tagline: 'No parole, solo gesti',
    description: 'Fai indovinare parole solo con il corpo. Silenzio assoluto — nessuna eccezione!',
    bg: 'linear-gradient(145deg, #831843 0%, #BE185D 55%, #F472B6 100%)',
    shadow: 'rgba(190, 24, 93, 0.4)',
    locked: true,
    minPlayers: 4,
    maxPlayers: 12,
    difficulty: 1,
  },
  {
    id: 'bomb',
    name: 'Bomba!',
    emoji: '💣',
    tagline: 'Passa la patata bollente',
    description: 'Rispondi e passa la bomba! Chi la tiene quando esplode perde tutto.',
    bg: 'linear-gradient(145deg, #7C2D12 0%, #C2410C 55%, #FB923C 100%)',
    shadow: 'rgba(194, 65, 12, 0.4)',
    locked: true,
    minPlayers: 2,
    maxPlayers: 10,
    difficulty: 1,
  },
]

const STARS = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐']

// ─── GameCard ────────────────────────────────────────────────────────────────

const GameCard = ({ game, index, onPlay }) => (
  <motion.div
    initial={{ opacity: 0, y: 28 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.055, type: 'spring', stiffness: 280, damping: 22 }}
    style={{
      background: game.bg,
      borderRadius: 20,
      overflow: 'hidden',
      position: 'relative',
      cursor: game.locked ? 'default' : 'pointer',
      filter: game.locked ? 'saturate(0.55) brightness(0.75)' : 'none',
      boxShadow: game.locked ? 'none' : `0 8px 32px ${game.shadow}`,
    }}
    whileHover={!game.locked ? { scale: 1.025, y: -2 } : {}}
    whileTap={!game.locked ? { scale: 0.975 } : {}}
    onClick={() => !game.locked && onPlay(game)}
  >
    {/* PROSSIMAMENTE badge */}
    {game.locked && (
      <div style={{
        position: 'absolute', top: 14, right: 14, zIndex: 2,
        background: '#DC2626', color: '#fff',
        fontWeight: 800, fontSize: 9, letterSpacing: '0.07em',
        padding: '4px 9px', borderRadius: 6,
      }}>
        PROSSIMAMENTE
      </div>
    )}

    <div style={{ padding: 'clamp(18px, 2vw, 26px)' }}>
      {/* Emoji */}
      <div style={{
        fontSize: 'clamp(42px, 5vw, 56px)',
        marginBottom: 10,
        lineHeight: 1,
        filter: game.locked ? 'grayscale(0.5)' : 'none',
      }}>
        {game.emoji}
      </div>

      {/* Name */}
      <h3 style={{ margin: 0, fontSize: 'clamp(18px, 2.2vw, 24px)', fontWeight: 800, color: '#fff' }}>
        {game.name}
      </h3>

      {/* Tagline */}
      <p style={{
        margin: '3px 0 0', color: 'rgba(255,255,255,0.55)',
        fontWeight: 700, fontSize: 'clamp(10px, 1vw, 12px)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {game.tagline}
      </p>

      {/* Description */}
      <p style={{
        margin: '10px 0 0', color: 'rgba(255,255,255,0.78)',
        fontSize: 'clamp(12px, 1.15vw, 14px)', lineHeight: 1.45,
      }}>
        {game.description}
      </p>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 7, marginTop: 14, flexWrap: 'wrap' }}>
        <span style={badgeStyle}>👥 {game.minPlayers}–{game.maxPlayers}</span>
        {game.difficulty > 0 && (
          <span style={badgeStyle}>{STARS[game.difficulty]}</span>
        )}
      </div>

      {/* Action */}
      <div style={{ marginTop: 18 }}>
        {game.locked ? (
          <div style={lockedBtnStyle}>🔒 In arrivo</div>
        ) : (
          <div style={playBtnStyle}>▶ GIOCA ORA</div>
        )}
      </div>
    </div>
  </motion.div>
)

// ─── HomeScreen ──────────────────────────────────────────────────────────────

const HomeScreen = () => {
  const navigate = useNavigate()

  const handlePlay = (game) => {
    if (game.id === 'trivia') navigate('/mode')
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div style={topBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 'clamp(22px, 2.5vw, 30px)' }}>🎮</span>
          <span style={{
            fontWeight: 900, fontSize: 'clamp(16px, 2vw, 22px)',
            letterSpacing: '-0.025em', color: 'var(--text)',
          }}>
            GameNight
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={statPillStyle}><span>💰</span><span style={{ fontWeight: 700 }}>100</span></div>
          <div style={statPillStyle}><span>💎</span><span style={{ fontWeight: 700 }}>5</span></div>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────── */}
      <div style={{
        padding: 'clamp(20px, 3vw, 48px) clamp(20px, 4vw, 48px) clamp(12px, 2vw, 24px)',
      }}>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            margin: 0,
            fontSize: 'clamp(22px, 3.5vw, 42px)',
            fontWeight: 900, letterSpacing: '-0.035em',
            background: 'linear-gradient(130deg, #fff 20%, #A855F7 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}
        >
          Scegli il tuo gioco
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 'clamp(13px, 1.4vw, 16px)' }}
        >
          Sfida i tuoi amici — ovunque siate
        </motion.p>
      </div>

      {/* ── Games Grid ──────────────────────────────────────── */}
      <div style={{
        flex: 1,
        padding: '0 clamp(20px, 4vw, 48px) clamp(24px, 3vw, 48px)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))',
          gap: 'clamp(14px, 2vw, 24px)',
        }}>
          {GAMES_CATALOG.map((game, i) => (
            <GameCard key={game.id} game={game} index={i} onPlay={handlePlay} />
          ))}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div style={{
        padding: 'clamp(14px, 2vw, 24px)',
        textAlign: 'center',
        borderTop: '1px solid var(--border)',
      }}>
        <span style={{ color: 'var(--muted)', fontSize: 12, opacity: 0.45 }}>
          GameNight v1.0 — Più giochi in arrivo 🚀
        </span>
      </div>
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const topBarStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: 'clamp(12px, 1.5vw, 18px) clamp(20px, 4vw, 48px)',
  borderBottom: '1px solid var(--border)', flexShrink: 0,
  position: 'sticky', top: 0, zIndex: 10,
  background: 'rgba(15,15,26,0.92)', backdropFilter: 'blur(12px)',
}

const statPillStyle = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 20, padding: '5px 14px', fontSize: 'clamp(13px, 1.3vw, 15px)',
}

const badgeStyle = {
  background: 'rgba(0,0,0,0.25)', borderRadius: 20,
  padding: '3px 10px', fontSize: 11,
  color: 'rgba(255,255,255,0.8)', fontWeight: 600,
}

const playBtnStyle = {
  background: 'linear-gradient(135deg, #16A34A, #22C55E)',
  color: '#fff', fontWeight: 800,
  fontSize: 'clamp(13px, 1.3vw, 15px)',
  padding: 'clamp(10px, 1.2vw, 13px) clamp(18px, 2vw, 24px)',
  borderRadius: 12, textAlign: 'center', letterSpacing: '0.04em',
  boxShadow: '0 4px 16px rgba(34, 197, 94, 0.45)',
}

const lockedBtnStyle = {
  background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.4)',
  fontWeight: 700, fontSize: 13,
  padding: '10px 20px', borderRadius: 12, textAlign: 'center',
  border: '1px solid rgba(255,255,255,0.08)',
}

export default HomeScreen
