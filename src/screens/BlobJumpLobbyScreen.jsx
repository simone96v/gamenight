import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import IconButton from '../components/ui/IconButton'
import Button from '../components/ui/Button'
import GradientTitle from '../components/ui/GradientTitle'
import MiniBlob, { useMiniExpr } from '../components/MiniBlob'
import { useSession } from '../stores/useSession'
import { pushRoom } from '../lib/room'
import { accentBtnStyle } from '../theme/gameColors'
import { usePlayerAccent } from '../hooks/usePlayerAccent'

const BlobJumpLobbyScreen = () => {
  const C = usePlayerAccent()
  const navigate = useNavigate()
  const isHost = useSession((s) => s.isHost)
  const mode = useSession((s) => s.mode)
  const players = useSession((s) => s.players)
  const gameState = useSession((s) => s.gameState)
  const showError = useSession((s) => s.showError)
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)
  const expr = useMiniExpr()

  const isSolo = mode === 'local'
  const canControl = isHost || isSolo
  const rounds = 1
  const [launching, setLaunching] = useState(false)


  const handleStart = useCallback(async () => {
    if (!canControl || launching) return
    setLaunching(true)

    try {
      const seed = Math.floor(Math.random() * 2147483647)
      const now = new Date().toISOString()
      const s = useSession.getState()

      const fullState = {
        players: (s.players || []).map((p) => ({ ...p, score: 0 })),
        currentIdx: 0,
        round: 0,
        activeGame: 'blobjump',
        selectedGame: 'blobjump',
        currentSeed: seed,
        currentRoundIdx: 0,
        totalRounds: rounds,
        roundDuration: 0, // 0 = endless — game ends only on death
        roundScores: {},
        roundFinished: {},
        totalScores: {},
      }

      if (s.mode === 'online' && s.roomCode) {
        const pushRes = await pushRoom(s.roomCode, 'blobjump_countdown', fullState, now)
        if (pushRes.error) {
          showError('generic')
          setLaunching(false)
          return
        }
        useSession.setState({
          players: fullState.players,
          gameState: {
            currentSeed: seed,
            currentRoundIdx: 0,
            totalRounds: rounds,
            roundDuration: 0,
            roundScores: {},
            roundFinished: {},
            totalScores: {},
          },
          currentPhase: 'blobjump_countdown',
          questionStartedAt: now,
          activeGame: 'blobjump',
        })
        navigate('/game/blobjump', { replace: true })
      } else {
        useSession.setState({
          players: fullState.players,
          gameState: {
            currentSeed: seed,
            currentRoundIdx: 0,
            totalRounds: rounds,
            roundDuration: 0,
            roundScores: {},
            roundFinished: {},
            totalScores: {},
          },
          currentPhase: 'blobjump_countdown',
          questionStartedAt: now,
          activeGame: 'blobjump',
        })
        navigate('/game/blobjump', { replace: true })
      }
    } catch {
      showError('generic')
      setLaunching(false)
    }
  }, [canControl, launching, rounds, showError, navigate])

  const handleBack = useCallback(() => {
    const s = useSession.getState()
    if (s.mode !== 'online') {
      navigate('/solo/games', { replace: true })
      return
    }
    setAwaitingGC(true)
    navigate('/games', { replace: true })
    const fullState = {
      players: s.players,
      currentIdx: s.currentIdx,
      round: s.round,
      activeGame: null,
      selectedCategory: s.gameState?.selectedCategory ?? null,
      categoryVotes: s.gameState?.categoryVotes ?? {},
      gameVotes: {},
      selectedGame: null,
    }
    if (s.roomCode) {
      pushRoom(s.roomCode, 'game_voting', fullState)
    }
    setAwaitingGC(false)
  }, [navigate, setAwaitingGC])

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={canControl && <IconButton ariaLabel="Indietro" onClick={handleBack}>←</IconButton>}
      />

      <div style={S.body}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center' }}
        >
          <GradientTitle as="h2" size="lg" gradient={C.gradient}>
            🦘 Blob Jump
          </GradientTitle>
          <p style={S.subtitle}>Salta più in alto degli altri!</p>
        </motion.div>


        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={S.playersCard}
        >
          <span style={S.settingLabel}>Giocatori ({players.length})</span>
          <div style={S.playersList}>
            {players.map((p, i) => (
              <div key={p.id} style={S.playerChip}>
                <MiniBlob color={p.color} expr={expr} size={28} id={`bjl-${i}`} />
                <span style={S.playerName}>{p.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div style={S.footer}>
          {canControl ? (
            <Button
              variant="primary"
              width="full"
              onClick={handleStart}
              disabled={launching}
              style={accentBtnStyle(C.accent)}
            >
              {launching ? '⏳ Caricamento...' : '🦘 Via!'}
            </Button>
          ) : (
            <p style={S.waitText}>Aspettando il boss... 👑</p>
          )}
        </div>
      </div>
    </div>
  )
}

const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    padding: 'clamp(16px, 3dvh, 28px) clamp(16px, 4vw, 28px)',
    gap: 'clamp(14px, 2.5dvh, 22px)',
    overflow: 'auto',
  },
  subtitle: {
    margin: '6px 0 0',
    color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.6dvh, 15px)',
    fontWeight: 600,
  },
  settingsCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 'clamp(16px, 2.5dvh, 24px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  settingLabel: {
    fontSize: 'clamp(14px, 1.8dvh, 17px)',
    fontWeight: 800,
    color: 'var(--text)',
  },
  playersCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 'clamp(16px, 2.5dvh, 24px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  playersList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px 4px 4px',
    background: 'var(--bg)',
    borderRadius: 999,
    border: '1px solid var(--border)',
  },
  playerName: {
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
    fontWeight: 700,
    color: 'var(--text)',
  },
  footer: {
    marginTop: 'auto',
    flexShrink: 0,
  },
  waitText: {
    color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 600,
    textAlign: 'center',
    padding: 'clamp(10px, 1.5dvh, 16px) 0',
    margin: 0,
  },
}

export default BlobJumpLobbyScreen
