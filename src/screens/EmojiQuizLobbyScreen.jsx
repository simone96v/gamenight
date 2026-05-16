// Lobby online di Emoji Quiz.
// L'host carica il deck (con `answers`) dal DB Supabase e lo pubblica nello
// stato della stanza. Il deck è condiviso con i client perché serve per la
// validazione locale dei guess (ogni client controlla se ha indovinato).
// Il "primo che indovina" viene poi arbitrato dall'host osservando i `timeMs`
// pubblicati via castVote('eqGuesses').

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
import { loadEmojiQuizDeck } from '../lib/emojiQuizDeck'
import { TOTAL_ROUNDS } from '../games/EmojiQuiz/config'
import { accentBtnStyle } from '../theme/gameColors'
import { usePlayerAccent } from '../hooks/usePlayerAccent'

const EmojiQuizLobbyScreen = () => {
  const C = usePlayerAccent()
  const navigate = useNavigate()
  const isHost = useSession((s) => s.isHost)
  const mode = useSession((s) => s.mode)
  const players = useSession((s) => s.players)
  const showError = useSession((s) => s.showError)
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)
  const expr = useMiniExpr()

  const isSolo = mode === 'local'
  const canControl = isHost || isSolo
  const [launching, setLaunching] = useState(false)

  const handleStart = useCallback(async () => {
    if (!canControl || launching) return
    setLaunching(true)
    try {
      const deck = await loadEmojiQuizDeck(TOTAL_ROUNDS)
      const now = new Date().toISOString()
      const s = useSession.getState()
      const fullState = {
        players: (s.players || []).map((p) => ({ ...p, score: 0 })),
        currentIdx: 0,
        round: 0,
        activeGame: 'emojiquiz',
        selectedGame: 'emojiquiz',
        eqDeck: deck,
        eqRoundIdx: 0,
        eqGuesses: {},
        eqHintUsed: {},
        eqRoundResult: null,
        eqScores: {},
        eqStreaks: {},
        eqRoundLog: [],
      }
      if (s.mode === 'online' && s.roomCode) {
        const pushRes = await pushRoom(s.roomCode, 'emojiquiz_countdown', fullState, now)
        if (pushRes.error) {
          showError('generic')
          setLaunching(false)
          return
        }
      } else {
        // Local fallthrough: in solo questa lobby non viene usata, ma per
        // sicurezza la gestiamo. Solo va diretto a /game/emojiquiz.
        useSession.setState({
          players: fullState.players,
          gameState: fullState,
          currentPhase: 'emojiquiz_countdown',
          questionStartedAt: now,
          activeGame: 'emojiquiz',
        })
        navigate('/game/emojiquiz', { replace: true })
      }
    } catch (e) {
      console.error('[emojiquiz-lobby] start error:', e)
      showError('generic')
      setLaunching(false)
    }
  }, [canControl, launching, showError, navigate])

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
    if (s.roomCode) pushRoom(s.roomCode, 'game_voting', fullState)
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
            🎬 Emoji Quiz
          </GradientTitle>
          <p style={S.subtitle}>Decifra il film o la canzone — chi indovina prima vince</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={S.infoCard}
        >
          <div style={S.infoRow}>
            <span style={S.infoLabel}>⏱️ Tempo per round</span>
            <span style={S.infoValue}>25s</span>
          </div>
          <div style={S.infoRow}>
            <span style={S.infoLabel}>🎯 Numero round</span>
            <span style={S.infoValue}>{TOTAL_ROUNDS}</span>
          </div>
          <div style={S.infoRow}>
            <span style={S.infoLabel}>🏆 Vince</span>
            <span style={S.infoValue}>Punteggio + alto</span>
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
            {players.map((p, i) => (
              <div key={p.id} style={S.playerChip}>
                <MiniBlob color={p.color} expr={expr} size={28} id={`eql-${i}`} />
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
              disabled={launching || players.length < 2}
              style={accentBtnStyle(C.accent)}
            >
              {launching ? '⏳ Caricamento...' : (players.length < 2 ? 'Servono almeno 2 giocatori' : '🎬 Inizia!')}
            </Button>
          ) : (
            <p style={S.waitText}>Aspettando l'host... 👑</p>
          )}
        </div>
      </div>
    </div>
  )
}

const S = {
  container: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  body: {
    display: 'flex', flexDirection: 'column', flex: 1,
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
  infoCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 'clamp(14px, 2dvh, 20px)',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 'clamp(13px, 1.6dvh, 15px)', color: 'var(--muted)', fontWeight: 600 },
  infoValue: { fontSize: 'clamp(14px, 1.7dvh, 16px)', color: 'var(--text)', fontWeight: 800 },
  settingLabel: { fontSize: 'clamp(14px, 1.8dvh, 17px)', fontWeight: 800, color: 'var(--text)' },
  playersCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 'clamp(16px, 2.5dvh, 24px)',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  playersList: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  playerChip: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '4px 10px 4px 4px',
    background: 'var(--bg)', borderRadius: 999,
    border: '1px solid var(--border)',
  },
  playerName: { fontSize: 'clamp(12px, 1.4dvh, 14px)', fontWeight: 700, color: 'var(--text)' },
  footer: { marginTop: 'auto', flexShrink: 0 },
  waitText: {
    color: 'var(--muted)', fontSize: 'clamp(13px, 1.6dvh, 16px)', fontWeight: 600,
    textAlign: 'center', padding: 'clamp(10px, 1.5dvh, 16px) 0', margin: 0,
  },
}

export default EmojiQuizLobbyScreen
