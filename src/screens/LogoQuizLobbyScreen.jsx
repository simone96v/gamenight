// Lobby Logo Quiz — selettori "Loghi" + "Tempo" + Start.

import { useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLobbyLayout from '../components/GameLobbyLayout'
import LobbySegmented from '../components/ui/LobbySegmented'
import BlobLoader from '../components/BlobLoader'
import { useSession } from '../stores/useSession'
import { pushRoom } from '../lib/room'
import { usePlayerAccent } from '../hooks/usePlayerAccent'
import { pickRounds, DEFAULT_MIX } from '../games/LogoQuiz/deckBuilder'
import {
  DEFAULT_NUM_LOGOS, NUM_LOGOS_OPTIONS,
  ROUND_DURATION_S, ROUND_DURATION_OPTIONS,
} from '../games/LogoQuiz/constants'

const MIX_LABELS = [
  { id: 'easy',     label: 'Facile' },
  { id: 'balanced', label: 'Bilanciato' },
  { id: 'brutal',   label: 'Brutale' },
]
import logoquizDeckRaw from '../data/questions/logoquiz.json'

const LogoQuizLobbyScreen = () => {
  const navigate = useNavigate()
  const C = usePlayerAccent()

  const isHost = useSession((s) => s.isHost)
  const mode = useSession((s) => s.mode)
  const players = useSession((s) => s.players)
  const gameState = useSession((s) => s.gameState)
  const showError = useSession((s) => s.showError)
  const setAwaitingGC = useSession((s) => s.setAwaitingGameChange)

  const isSolo = mode === 'local'
  const canControl = isHost || isSolo

  const session = gameState?.lqSession ?? null
  const numLogos = session?.numLogos ?? DEFAULT_NUM_LOGOS
  const durationS = session?.durationS ?? ROUND_DURATION_S
  const mix = session?.mix ?? DEFAULT_MIX
  const launching = session?.launching ?? false

  const launchingRef = useRef(false)
  useEffect(() => { launchingRef.current = launching }, [launching])
  useEffect(() => { launchingRef.current = false }, [])

  // Init session se mancante
  useEffect(() => {
    if (!canControl) return
    const cur = gameState?.lqSession
    if (cur && cur.launching !== true) return

    const s = useSession.getState()
    const newSession = {
      numLogos: cur?.numLogos ?? DEFAULT_NUM_LOGOS,
      durationS: cur?.durationS ?? ROUND_DURATION_S,
      mix: cur?.mix ?? DEFAULT_MIX,
      launching: false,
    }
    const newGameState = { ...s.gameState, lqSession: newSession }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canControl])

  const updateSession = useCallback((patch) => {
    if (!canControl) return
    const s = useSession.getState()
    const newSession = { ...(s.gameState?.lqSession ?? {}), ...patch }
    const newGameState = { ...s.gameState, lqSession: newSession }
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
  }, [canControl])

  const handleExit = useCallback(async () => {
    const s = useSession.getState()
    if (s.mode !== 'online') {
      navigate('/solo/games', { replace: true })
      return
    }
    setAwaitingGC(true)
    navigate('/games', { replace: true })
    const fullState = {
      players: (s.players || []).map((p) => ({ ...p, score: 0, correct_count: 0 })),
      currentIdx: 0,
      round: 0,
      activeGame: null,
      selectedCategory: s.gameState?.selectedCategory ?? null,
      categoryVotes: s.gameState?.categoryVotes ?? {},
      selectedGameCategory: s.gameState?.selectedGameCategory ?? null,
      gameCategoryVotes: {},
      gameVotes: {},
      selectedGame: null,
    }
    if (s.roomCode) await pushRoom(s.roomCode, 'game_voting', fullState)
    setAwaitingGC(false)
  }, [navigate, setAwaitingGC])

  const handleStart = useCallback(async () => {
    if (!canControl || launchingRef.current) return
    launchingRef.current = true

    const s = useSession.getState()
    const launchSession = {
      numLogos: s.gameState?.lqSession?.numLogos ?? DEFAULT_NUM_LOGOS,
      durationS: s.gameState?.lqSession?.durationS ?? ROUND_DURATION_S,
      mix: s.gameState?.lqSession?.mix ?? DEFAULT_MIX,
      launching: true,
    }
    useSession.setState({ gameState: { ...s.gameState, lqSession: launchSession } })

    try {
      const deck = pickRounds(logoquizDeckRaw, {
        numLogos: launchSession.numLogos,
        mix: launchSession.mix,
      })
      const now = new Date().toISOString()
      const fullState = {
        players: (s.players || []).map((p) => ({ ...p, score: 0, correct_count: 0 })),
        currentIdx: 0,
        round: 0,
        activeGame: 'logoquiz',
        selectedGame: 'logoquiz',
        lqSession: { ...launchSession, launching: false },
        lqDeck: deck,
        lqRoundIdx: 0,
        lqAnswers: {},
        lqRoundResult: null,
        lqScores: {},
        lqCorrectCount: {},
        lqStreaks: {},
        lqBestStreak: {},
        lqTotalSpeedMs: {},
      }

      if (s.mode === 'online' && s.roomCode) {
        const pushRes = await pushRoom(s.roomCode, 'logoquiz_countdown', fullState, now)
        if (pushRes.error) {
          showError('generic')
          updateSession({ launching: false })
          launchingRef.current = false
        }
      } else {
        useSession.setState({
          players: fullState.players,
          gameState: fullState,
          currentPhase: 'logoquiz_countdown',
          questionStartedAt: now,
          activeGame: 'logoquiz',
        })
        navigate('/game/logoquiz', { replace: true })
      }
    } catch (e) {
      console.error('[logoquiz-lobby] start:', e)
      showError('generic')
      updateSession({ launching: false })
      launchingRef.current = false
    }
  }, [canControl, showError, updateSession, navigate])

  if (launching) {
    return <BlobLoader text="Preparando i loghi…" />
  }

  return (
    <GameLobbyLayout
      gameName="Logo Quiz"
      gameDescription="Riconosci il marchio? 4 opzioni, 1 sola corretta."
      players={players}
      canControl={canControl}
      onBack={handleExit}
      onStart={handleStart}
      launching={launching}
    >
      <LobbySegmented
        label="Loghi"
        options={NUM_LOGOS_OPTIONS}
        value={numLogos}
        onChange={(n) => updateSession({ numLogos: n })}
        accent={C.accent}
        accentShadow={C.shadow}
        disabled={!canControl || launching}
      />
      <LobbySegmented
        label="Tempo per logo"
        options={ROUND_DURATION_OPTIONS.map((s) => ({ id: s, label: `${s}s` }))}
        value={durationS}
        onChange={(id) => updateSession({ durationS: id })}
        accent={C.accent}
        accentShadow={C.shadow}
        disabled={!canControl || launching}
      />
      <LobbySegmented
        label="Mix difficoltà"
        options={MIX_LABELS}
        value={mix}
        onChange={(id) => updateSession({ mix: id })}
        accent={C.accent}
        accentShadow={C.shadow}
        disabled={!canControl || launching}
      />
    </GameLobbyLayout>
  )
}

export default LogoQuizLobbyScreen
