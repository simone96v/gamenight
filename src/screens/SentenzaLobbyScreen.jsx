import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import IconButton from '../components/ui/IconButton'
import Button from '../components/ui/Button'
import GradientTitle from '../components/ui/GradientTitle'
import { useSession } from '../stores/useSession'
import { pushRoom } from '../lib/room'
import { initSentenzaState } from '../games/Sentenza/useSentenza'
import { accentBtnStyle } from '../theme/gameColors'
import { usePlayerAccent } from '../hooks/usePlayerAccent'

const ROUND_OPTIONS = [5, 8, 12]

const SentenzaLobbyScreen = () => {
  const C = usePlayerAccent()
  const navigate = useNavigate()
  const isHost = useSession((s) => s.isHost)
  const players = useSession((s) => s.players)
  const gameState = useSession((s) => s.gameState)
  const showError = useSession((s) => s.showError)
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)

  const savedRounds = gameState?.sentenzaRounds ?? 8
  const [rounds, setRounds] = useState(savedRounds)
  const [launching, setLaunching] = useState(false)

  const syncRounds = useCallback((val) => {
    setRounds(val)
    if (!isHost) return
    const s = useSession.getState()
    const newGameState = { ...s.gameState, sentenzaRounds: val }
    useSession.setState({ gameState: newGameState })
    if (s.mode === 'online' && s.roomCode) {
      pushRoom(s.roomCode, s.currentPhase, {
        players: s.players,
        currentIdx: s.currentIdx,
        round: s.round,
        activeGame: s.activeGame,
        ...newGameState,
      })
    }
  }, [isHost])

  const handleStart = useCallback(async () => {
    if (!isHost || launching) return
    setLaunching(true)

    try {
      const s = useSession.getState()
      const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0 }))
      const sentenzaState = initSentenzaState(resetPlayers, rounds)
      const now = new Date().toISOString()

      if (s.mode === 'online' && s.roomCode) {
        const fullState = {
          players: resetPlayers,
          currentIdx: 0,
          round: 0,
          activeGame: 'sentenza',
          selectedGame: 'sentenza',
          sentenzaRounds: rounds,
          ...sentenzaState,
        }
        const pushRes = await pushRoom(s.roomCode, 'sentenza_countdown', fullState, now)
        if (pushRes.error) {
          showError('generic')
          setLaunching(false)
          return
        }
        useSession.setState({
          players: resetPlayers,
          gameState: { ...sentenzaState, sentenzaRounds: rounds },
          currentPhase: 'sentenza_countdown',
          questionStartedAt: now,
          activeGame: 'sentenza',
        })
        navigate('/game/sentenza', { replace: true })
      } else {
        useSession.setState({
          players: resetPlayers,
          gameState: { ...sentenzaState, sentenzaRounds: rounds },
          currentPhase: 'sentenza_countdown',
          questionStartedAt: now,
          activeGame: 'sentenza',
        })
        navigate('/game/sentenza', { replace: true })
      }
    } catch {
      showError('generic')
      setLaunching(false)
    }
  }, [isHost, launching, rounds, showError, navigate])

  const handleBack = useCallback(() => {
    setAwaitingGC(true)
    navigate('/games', { replace: true })
    const s = useSession.getState()
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
    if (s.mode === 'online' && s.roomCode) {
      pushRoom(s.roomCode, 'game_voting', fullState)
    }
    setAwaitingGC(false)
  }, [navigate, setAwaitingGC])

  const tooFew = players.length < 3

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={isHost && <IconButton ariaLabel="Indietro" onClick={handleBack}>←</IconButton>}
      />

      <div style={S.body}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center' }}
        >
          <GradientTitle as="h2" size="lg" gradient={C.gradient}>
            ⚖️ Sentenza
          </GradientTitle>
          <p style={S.subtitle}>Il Giudice ha sempre ragione. Completa la frase con la carta più assurda.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={S.settingsCard}
        >
          <span style={S.settingLabel}>Quanti round?</span>
          <div style={S.optionsRow}>
            {ROUND_OPTIONS.map((n) => (
              <motion.button
                key={n}
                type="button"
                onClick={() => isHost && syncRounds(n)}
                disabled={!isHost}
                whileHover={isHost ? {
                  y: -2,
                  boxShadow: rounds === n
                    ? '0 8px 20px rgba(0, 0, 0, 0.25)'
                    : '0 4px 14px rgba(0,0,0,0.10)',
                } : undefined}
                whileTap={isHost ? {
                  y: 0,
                  scale: 0.95,
                } : undefined}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                style={{
                  ...S.optionBtn,
                  background: rounds === n ? 'var(--accent)' : 'var(--surface)',
                  color: rounds === n ? 'var(--bg)' : 'var(--text)',
                  border: rounds === n ? '2px solid var(--accent)' : '2px solid var(--border)',
                  boxShadow: rounds === n
                    ? '0 4px 12px rgba(0, 0, 0, 0.2)'
                    : '0 2px 6px rgba(0,0,0,0.04)',
                  opacity: !isHost ? 0.6 : 1,
                  cursor: isHost ? 'pointer' : 'default',
                }}
              >
                {n}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={S.playersCard}
        >
          <span style={S.settingLabel}>Giocatori ({players.length})</span>
          <div style={S.playersList}>
            {players.map((p) => (
              <div key={p.id} style={S.playerChip}>
                <div style={{ ...S.playerDot, backgroundColor: p.color }} />
                <span style={S.playerName}>{p.name}</span>
              </div>
            ))}
          </div>
          {tooFew && (
            <p style={S.warning}>⚠️ Servono almeno 3 giocatori per Sentenza</p>
          )}
        </motion.div>

        <div style={S.footer}>
          {isHost ? (
            <Button
              variant="primary"
              width="full"
              onClick={handleStart}
              disabled={launching || tooFew}
              style={tooFew ? undefined : accentBtnStyle(C.accent)}
            >
              {launching ? '⏳ Caricamento...' : '⚖️ Inizia!'}
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
  optionsRow: {
    display: 'flex',
    gap: 10,
  },
  optionBtn: {
    flex: 1,
    padding: 'clamp(12px, 2dvh, 18px) 0',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'clamp(16px, 2dvh, 20px)',
    fontWeight: 900,
    transition: 'all 0.2s',
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
    padding: '6px 12px',
    background: 'var(--bg)',
    borderRadius: 999,
    border: '1px solid var(--border)',
  },
  playerDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  playerName: {
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
    fontWeight: 700,
    color: 'var(--text)',
  },
  warning: {
    margin: 0,
    fontSize: 'clamp(12px, 1.4dvh, 14px)',
    fontWeight: 700,
    color: 'var(--danger)',
    textAlign: 'center',
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

export default SentenzaLobbyScreen
