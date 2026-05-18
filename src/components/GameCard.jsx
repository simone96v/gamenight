// GameCard — card di gioco standard per le lobby di selezione.
// Usata sia in GamesScreen (modalità voto multi) che SoloGamesScreen (click diretto).
//
// Props:
//   game        — { id, name, emoji, tagline, difficulty, minPlayers, maxPlayers, bg, shadow, image }
//   index       — ordine di stagger per animazione entrata
//   onClick     — handler tap
//   selected    — bool, mostra check + bordo accent (solo voto)
//   voteCount   — numero voti (solo voto, opzionale)
//   mode        — 'vote' | 'solo' (default 'solo')
//   theme       — 'light' | 'dark' per scegliere immagine

import { motion } from 'framer-motion'

const SPRING = { type: 'spring', stiffness: 260, damping: 22 }

const pickImage = (image, theme) => {
  if (!image) return null
  if (typeof image === 'string') return image
  return theme === 'dark' ? image.dark : image.light
}

const DifficultyDots = ({ level = 1 }) => (
  <span style={S.diffDots} aria-label={`Difficoltà ${level} su 3`}>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        style={{
          ...S.dot,
          background: i < level ? 'currentColor' : 'transparent',
          borderColor: 'currentColor',
        }}
      />
    ))}
  </span>
)

const GameCard = ({
  game,
  index = 0,
  onClick,
  selected = false,
  voteCount = 0,
  mode = 'solo',
  theme = 'light',
  disabled = false,
}) => {
  const imageSrc = pickImage(game.image, theme)
  const isVote = mode === 'vote'
  const isLocked = !!game.locked
  const inactive = isLocked || disabled

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, ...SPRING }}
      whileHover={!inactive ? {
        scale: 1.025,
        y: -4,
        boxShadow: selected
          ? `0 0 0 4px rgba(0, 0, 0, 0.22), 0 26px 52px ${game.shadow}, 0 10px 22px rgba(0, 0, 0, 0.18)`
          : `0 22px 44px rgba(31, 41, 55, 0.22), 0 6px 14px rgba(0, 0, 0, 0.14), 0 0 0 1px var(--border-strong) inset`,
      } : {}}
      whileTap={!inactive ? {
        scale: 0.97,
        y: 0,
      } : {}}
      onClick={inactive ? undefined : onClick}
      aria-pressed={selected}
      aria-disabled={inactive}
      disabled={inactive}
      style={{
        ...S.card,
        border: selected ? '2.5px solid var(--accent)' : '1.5px solid var(--border-strong)',
        boxShadow: selected
          ? `0 0 0 4px rgba(0, 0, 0, 0.20), 0 18px 36px ${game.shadow}, 0 6px 14px rgba(0, 0, 0, 0.18)`
          : `0 14px 28px rgba(31, 41, 55, 0.18), 0 4px 10px rgba(0, 0, 0, 0.10)`,
        opacity: isLocked ? 0.62 : disabled ? 0.85 : 1,
        cursor: inactive ? 'not-allowed' : 'pointer',
        filter: isLocked ? 'grayscale(0.4)' : 'none',
      }}
    >
      {/* Hero illustrazione */}
      <div style={{ ...S.hero, background: game.bg }}>
        {imageSrc ? (
          <motion.img
            src={imageSrc}
            alt={game.name}
            loading="lazy"
            draggable={false}
            animate={selected ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={S.heroImg}
          />
        ) : (
          <>
            <div style={S.heroPattern} />
            <div style={S.heroBlur1} />
            <div style={S.heroBlur2} />
            <motion.div
              animate={selected
                ? { rotate: [0, -8, 8, -6, 6, 0], scale: [1, 1.06, 1] }
                : { rotate: 0, scale: 1 }
              }
              transition={{ duration: 1, ease: 'easeOut' }}
              style={S.emojiHero}
            >
              <div style={S.emojiGlow} />
              {game.emoji}
            </motion.div>
          </>
        )}

        {/* Difficulty badge — top-left (nascosto sui locked) */}
        {!isLocked && (
          <div style={S.diffBadge}>
            <DifficultyDots level={game.difficulty ?? 1} />
          </div>
        )}

        {/* Locked badge — bottom-left sui placeholder */}
        {isLocked && (
          <div style={S.lockedBadge}>
            <span style={{ fontSize: 11 }}>🔒</span>
            <span>Prossimamente</span>
          </div>
        )}

        {/* Vote count badge — top-right (solo modalità voto) */}
        {isVote && voteCount > 0 && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 16 }}
            style={S.voteBadge}
          >
            <span>{voteCount}</span>
          </motion.div>
        )}

        {/* Selected check — top-left overlay (solo modalità voto) */}
        {isVote && selected && (
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            style={S.selectedCheck}
          >
            ✓
          </motion.div>
        )}
      </div>

      {/* Body */}
      <div style={S.body}>
        <div style={S.titleRow}>
          <span style={S.title}>{game.name}</span>
          <span style={S.players}>
            <span style={S.playersIcon}>👥</span>
            {game.minPlayers}–{game.maxPlayers}
          </span>
        </div>
        {game.tagline && (
          <p style={S.tagline}>{game.tagline}</p>
        )}
      </div>
    </motion.button>
  )
}

const S = {
  card: {
    width: '100%',
    background: 'var(--surface)',
    borderRadius: 20,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    textAlign: 'left',
    position: 'relative',
    overflow: 'hidden',
  },
  hero: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 11',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  heroPattern: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)',
    backgroundSize: '14px 14px',
    pointerEvents: 'none',
    opacity: 0.6,
  },
  heroBlur1: {
    position: 'absolute',
    top: -32, right: -32,
    width: 130, height: 130,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.22)',
    filter: 'blur(24px)',
    pointerEvents: 'none',
  },
  heroBlur2: {
    position: 'absolute',
    bottom: -38, left: -38,
    width: 110, height: 110,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.14)',
    filter: 'blur(20px)',
    pointerEvents: 'none',
  },
  emojiHero: {
    position: 'relative',
    fontSize: 'clamp(56px, 12vw, 84px)',
    lineHeight: 1,
    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.22))',
    zIndex: 1,
  },
  emojiGlow: {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '140%', height: '140%',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0) 65%)',
    pointerEvents: 'none',
    zIndex: -1,
  },
  diffBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    background: 'rgba(0,0,0,0.45)',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: 999,
    backdropFilter: 'blur(8px)',
    display: 'inline-flex',
    alignItems: 'center',
    zIndex: 2,
  },
  lockedBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    padding: '4px 10px',
    borderRadius: 999,
    backdropFilter: 'blur(8px)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.02em',
    zIndex: 2,
  },
  diffDots: {
    display: 'inline-flex',
    gap: 3,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    border: '1.5px solid',
    display: 'inline-block',
  },
  voteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    background: 'var(--accent)',
    color: 'var(--bg)',
    borderRadius: 999,
    minWidth: 24,
    height: 24,
    padding: '0 8px',
    fontSize: 12,
    fontWeight: 900,
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    left: 8,
    background: 'var(--surface)',
    color: 'var(--text)',
    borderRadius: '50%',
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 900,
    boxShadow: '0 4px 12px rgba(0,0,0,0.20)',
    zIndex: 3,
  },
  body: {
    padding: 'clamp(10px, 1.4dvh, 14px) clamp(12px, 1.6vw, 14px) clamp(12px, 1.6dvh, 14px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 'clamp(14px, 1.8dvh, 17px)',
    fontWeight: 900,
    color: 'var(--text)',
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
  },
  players: {
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontWeight: 700,
    color: 'var(--muted)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
  },
  playersIcon: {
    fontSize: 11,
  },
  tagline: {
    margin: 0,
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontWeight: 600,
    color: 'var(--muted)',
    lineHeight: 1.35,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
}

export default GameCard
