import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCatchBlob } from './useCatchBlob'
import { useSession } from '../../stores/useSession'
import CountdownOverlay from '../../components/CountdownOverlay'
import Spinner from '../../components/ui/Spinner'
import SoloEndScreen from '../../components/SoloEndScreen'
import CatchBlobLeaderboard from './components/CatchBlobLeaderboard'
import { submitCatchBlobScore } from './useCatchBlobLeaderboard'
import { recordMatch } from '../../lib/auth'

const retryImport = (fn) => fn().catch(() => new Promise((r) => setTimeout(r, 1500)).then(fn))

const CatchBlobPlaying = lazy(() => retryImport(() => import('./components/CatchBlobPlaying')))

const Loading = () => (
  <div className="flex items-center justify-center" style={{ flex: 1 }}>
    <Spinner size="lg" />
  </div>
)

const CatchBlob = () => {
  const cb = useCatchBlob()
  const navigate = useNavigate()
  const [replaying, setReplaying] = useState(false)
  const [lbOpen, setLbOpen] = useState(false)
  const submitFiredRef = useRef(false)

  // Submit del best score globale appena entriamo in final.
  useEffect(() => {
    if (cb.currentPhase !== 'catchblob_final') {
      submitFiredRef.current = false
      return
    }
    if (submitFiredRef.current) return
    submitFiredRef.current = true

    const me = cb.players.find((p) => p.id === cb.localPlayerId)
    const score = me?.score ?? 0
    if (!me || score <= 0) return
    submitCatchBlobScore({
      score,
      playerName: me.name || 'Anonimo',
      color: me.color,
      source: 'solo',
    })
    recordMatch({ gameId: 'catchblob', mode: 'solo', score, won: null })
  }, [cb.currentPhase, cb.players, cb.localPlayerId])

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
      currentPhase: 'catchblob_playing',
      questionStartedAt: now,
    })
    setReplaying(false)
  }, [replaying])

  if (cb.currentPhase === 'catchblob_countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={cb.questionStartedAt}
        onComplete={() => {}}
        players={cb.players}
        localPlayerId={cb.localPlayerId}
        gameName="Catch The Blob"
        gameEmoji="🧺"
      />
    )
  }

  if (cb.currentPhase === 'catchblob_playing') {
    return (
      <Suspense fallback={<Loading />}>
        <CatchBlobPlaying
          seed={cb.currentSeed}
          blobColor={cb.blobColor}
          scoreSubmitted={cb.scoreSubmitted}
          onSubmitScore={cb.submitScore}
        />
      </Suspense>
    )
  }

  if (cb.currentPhase === 'catchblob_final') {
    const me = cb.players.find((p) => p.id === cb.localPlayerId)
    const score = me?.score ?? 0
    return (
      <>
        <SoloEndScreen
          gameEmoji="🧺"
          gameName="Catch The Blob"
          player={me}
          primaryValue={score}
          primaryLabel="punti"
          advancing={replaying}
          onReplay={handleReplay}
          onChangeGame={handleChangeGame}
          onLeaderboard={() => setLbOpen(true)}
        />
        <CatchBlobLeaderboard open={lbOpen} onClose={() => setLbOpen(false)} />
      </>
    )
  }

  return <Loading />
}

export default CatchBlob
