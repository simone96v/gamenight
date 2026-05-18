import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Button from '../components/ui/Button'
import PlayerAvatar from '../components/PlayerAvatar'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { getCopy } from '../data/copy'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

const RoundEndScreen = () => {
  const navigate = useNavigate()
  const mode = useSession((s) => s.mode)
  const isHost = useSession((s) => s.isHost)
  const players = useSession((s) => s.players)
  const setPhase = useSession((s) => s.setPhase)
  const category = useSettings((s) => s.category)
  const copy = getCopy(category)

  const canAct = mode === 'local' || isHost
  const sorted = [...players].sort((a, b) => b.score - a.score)

  const handleNext = () => {
    setPhase('hub')
    navigate('/hub')
  }

  const handleEnd = () => {
    setPhase('scoreboard')
    navigate('/scoreboard')
  }

  return (
    <motion.div
      className="screen screen-narrow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <AppHeader />
      <ErrorBanner />
      <div className="screen-body" style={{ alignItems: 'center' }}>
        <h2
          className="font-bold"
          style={{
            fontSize: 'clamp(22px, 3.5dvh, 32px)',
            letterSpacing: '-0.01em',
          }}
        >
          {copy.roundEnd}
        </h2>

        <motion.div
          className="scrollable-list w-full"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(8px, 1.5dvh, 14px)',
          }}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {sorted.map((p, i) => (
            <motion.div
              key={p.id}
              variants={itemVariants}
              className="flex items-center rounded"
              style={{
                background: 'var(--surface)',
                padding: 'clamp(10px, 1.5dvh, 16px) clamp(12px, 2vw, 18px)',
                gap: 'clamp(10px, 2vw, 16px)',
                border: '1px solid var(--border)',
              }}
            >
              <span
                className="font-bold"
                style={{
                  color: 'var(--muted)',
                  fontSize: 'clamp(14px, 2dvh, 20px)',
                  minWidth: 24,
                  textAlign: 'center',
                }}
              >
                {i + 1}
              </span>
              <PlayerAvatar player={p} size="sm" showScore={false} />
              <span
                className="font-semibold"
                style={{ flex: 1, fontSize: 'clamp(14px, 2dvh, 18px)' }}
              >
                {p.name}
              </span>
              <span
                className="font-bold"
                style={{
                  color: 'var(--accent)',
                  fontSize: 'clamp(14px, 2dvh, 18px)',
                }}
              >
                {p.score}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <div className="screen-footer">
        {canAct ? (
          <>
            <Button variant="secondary" width="full" onClick={handleEnd}>
              Fine serata
            </Button>
            <Button variant="primary" width="full" onClick={handleNext}>
              Prossimo gioco
            </Button>
          </>
        ) : (
          <p
            style={{
              color: 'var(--muted)',
              fontSize: 'clamp(13px, 1.8dvh, 15px)',
              textAlign: 'center',
              width: '100%',
            }}
          >
            In attesa dell&apos;host...
          </p>
        )}
      </div>
    </motion.div>
  )
}

export default RoundEndScreen
