import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Button from '../components/ui/Button'
import PlayerAvatar from '../components/PlayerAvatar'
import { deleteRoom } from '../lib/room'
import { useSession } from '../stores/useSession'

const PODIUM_COLORS = ['#F59E0B', '#94A3B8', '#CD7F32']

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  show: { opacity: 1, y: 0, scale: 1 },
}

const ScoreboardScreen = () => {
  const navigate = useNavigate()
  const mode = useSession((s) => s.mode)
  const isHost = useSession((s) => s.isHost)
  const roomCode = useSession((s) => s.roomCode)
  const players = useSession((s) => s.players)
  const resetSession = useSession((s) => s.resetSession)
  const resetToLocal = useSession((s) => s.resetToLocal)

  const sorted = [...players].sort((a, b) => b.score - a.score)
  const top3 = sorted.slice(0, 3)
  const rest = sorted.slice(3)

  const handleNewGame = async () => {
    if (mode === 'online' && isHost && roomCode) {
      await deleteRoom(roomCode)
    }
    if (mode === 'online' && !isHost) {
      resetToLocal()
    } else {
      resetSession()
    }
    navigate('/')
  }

  const podiumOrder = [top3[1], top3[0], top3[2]]
  const podiumHeights = [
    'clamp(60px, 10dvh, 90px)',
    'clamp(80px, 14dvh, 120px)',
    'clamp(48px, 8dvh, 70px)',
  ]

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
          Classifica finale
        </h2>

        <motion.div
          className="flex justify-center items-end"
          style={{
            gap: 'clamp(12px, 3vw, 24px)',
            marginTop: 'clamp(8px, 2dvh, 20px)',
          }}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {podiumOrder.map((p, vi) => {
            if (!p) return null
            const rank = vi === 0 ? 2 : vi === 1 ? 1 : 3
            return (
              <motion.div
                key={p.id}
                variants={itemVariants}
                className="flex flex-col items-center"
                style={{ gap: 6 }}
              >
                {rank === 1 && (
                  <span style={{ fontSize: 'clamp(20px, 3dvh, 32px)' }}>
                    &#128081;
                  </span>
                )}
                <PlayerAvatar player={p} size="lg" showScore={false} />
                <span
                  className="font-bold"
                  style={{ fontSize: 'clamp(13px, 1.8dvh, 16px)' }}
                >
                  {p.name}
                </span>
                <div
                  className="rounded-t flex items-center justify-center font-bold"
                  style={{
                    width: 'clamp(60px, 12vw, 80px)',
                    height: podiumHeights[vi],
                    background: `color-mix(in srgb, ${PODIUM_COLORS[rank - 1]} 30%, var(--surface))`,
                    border: `1.5px solid ${PODIUM_COLORS[rank - 1]}`,
                    borderBottom: 'none',
                    fontSize: 'clamp(16px, 2.5dvh, 24px)',
                    color: PODIUM_COLORS[rank - 1],
                  }}
                >
                  {p.score}
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {rest.length > 0 && (
          <div
            className="w-full"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(6px, 1dvh, 10px)',
            }}
          >
            {rest.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center rounded"
                style={{
                  background: 'var(--surface)',
                  padding: 'clamp(8px, 1.2dvh, 14px) clamp(12px, 2vw, 18px)',
                  gap: 'clamp(10px, 2vw, 16px)',
                  border: '1px solid var(--border)',
                }}
              >
                <span
                  className="font-bold"
                  style={{
                    color: 'var(--muted)',
                    fontSize: 'clamp(14px, 2dvh, 18px)',
                    minWidth: 24,
                    textAlign: 'center',
                  }}
                >
                  {i + 4}
                </span>
                <PlayerAvatar player={p} size="sm" showScore={false} />
                <span
                  className="font-semibold"
                  style={{
                    flex: 1,
                    fontSize: 'clamp(14px, 2dvh, 18px)',
                  }}
                >
                  {p.name}
                </span>
                <span
                  className="font-bold"
                  style={{
                    color: 'var(--muted)',
                    fontSize: 'clamp(14px, 2dvh, 18px)',
                  }}
                >
                  {p.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="screen-footer">
        <Button variant="primary" width="full" onClick={handleNewGame}>
          {mode === 'online' && !isHost ? 'Esci' : 'Nuova serata'}
        </Button>
      </div>
    </motion.div>
  )
}

export default ScoreboardScreen
