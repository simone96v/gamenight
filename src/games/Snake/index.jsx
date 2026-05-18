import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSnake } from './useSnake'
import { useSession } from '../../stores/useSession'
import CountdownOverlay from '../../components/CountdownOverlay'
import Spinner from '../../components/ui/Spinner'
import SoloEndScreen from '../../components/SoloEndScreen'
import SnakeLeaderboard from './components/SnakeLeaderboard'
import { submitSnakeScore, fetchPlayerRank } from './useSnakeLeaderboard'

const retryImport = (fn) => fn().catch(() => new Promise((r) => setTimeout(r, 1500)).then(fn))

const SnakePlaying = lazy(() => retryImport(() => import('./components/SnakePlaying')))

const Loading = () => (
  <div className="flex items-center justify-center" style={{ flex: 1 }}>
    <Spinner size="lg" />
  </div>
)

const Snake = () => {
  const sn = useSnake()
  const navigate = useNavigate()
  const [replaying, setReplaying] = useState(false)
  const [lbOpen, setLbOpen] = useState(false)
  const [localBest, setLocalBest] = useState(0)
  const submitFiredRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchPlayerRank().then((r) => {
      if (!cancelled && typeof r?.score === 'number') setLocalBest(r.score)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (sn.currentPhase !== 'snake_final') {
      submitFiredRef.current = false
      return
    }
    if (submitFiredRef.current) return
    submitFiredRef.current = true

    const me = sn.players.find((p) => p.id === sn.localPlayerId)
    const score = me?.score ?? 0
    if (!me || score <= 0) return
    submitSnakeScore({
      score,
      playerName: me.name || 'Anonimo',
      color: me.color,
      source: 'solo',
    }).then((res) => {
      if (typeof res?.newBest === 'number') setLocalBest(res.newBest)
    })
  }, [sn.currentPhase, sn.players, sn.localPlayerId])

  const handleChangeGame = useCallback(() => {
    navigate('/solo/games', { replace: true })
  }, [navigate])

  const handleReplay = useCallback(() => {
    if (replaying) return
    setReplaying(true)
    const newSeed = Math.floor(Math.random() * 2147483647)
    const now = new Date().toISOString()
    const s = useSession.getState()
    const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0 }))
    useSession.setState({
      players: resetPlayers,
      gameState: { ...(s.gameState || {}), currentSeed: newSeed },
      currentPhase: 'snake_playing',
      questionStartedAt: now,
    })
    setReplaying(false)
  }, [replaying])

  if (sn.currentPhase === 'snake_countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={sn.questionStartedAt}
        onComplete={() => {}}
        players={sn.players}
        localPlayerId={sn.localPlayerId}
        gameName="Blob Snake"
        gameEmoji="🐍"
      />
    )
  }

  if (sn.currentPhase === 'snake_playing') {
    return (
      <Suspense fallback={<Loading />}>
        <SnakePlaying
          seed={sn.currentSeed}
          blobColor={sn.blobColor}
          scoreSubmitted={sn.scoreSubmitted}
          onSubmitScore={sn.submitScore}
          localBest={localBest}
        />
      </Suspense>
    )
  }

  if (sn.currentPhase === 'snake_final') {
    const me = sn.players.find((p) => p.id === sn.localPlayerId)
    const score = me?.score ?? 0
    return (
      <>
        <SoloEndScreen
          gameEmoji="🐍"
          gameName="Blob Snake"
          player={me}
          primaryValue={score}
          primaryLabel="pillole"
          advancing={replaying}
          onReplay={handleReplay}
          onChangeGame={handleChangeGame}
          onLeaderboard={() => setLbOpen(true)}
        />
        <SnakeLeaderboard open={lbOpen} onClose={() => setLbOpen(false)} />
      </>
    )
  }

  return <Loading />
}

export default Snake
