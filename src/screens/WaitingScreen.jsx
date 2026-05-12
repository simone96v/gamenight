import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/ui/Spinner'
import PlayerStrip from '../components/PlayerStrip'
import { useSession } from '../stores/useSession'

const WaitingScreen = () => {
  const players = useSession((s) => s.players)

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <AppHeader />
      <ErrorBanner />
      <div
        className="screen-body"
        style={{ justifyContent: 'center', alignItems: 'center' }}
      >
        <Spinner size="lg" />
        <p
          style={{
            color: 'var(--muted)',
            fontSize: 'clamp(14px, 2dvh, 18px)',
            textAlign: 'center',
          }}
        >
          In attesa che l&apos;host avvii la partita...
        </p>
        {players.length > 0 && (
          <PlayerStrip players={players} showScore={false} />
        )}
      </div>
      <div className="screen-footer" />
    </motion.div>
  )
}

export default WaitingScreen
