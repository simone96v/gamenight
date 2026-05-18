import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlobJump } from './useBlobJump'
import { useSession } from '../../stores/useSession'
import CountdownOverlay from '../../components/CountdownOverlay'
import Spinner from '../../components/ui/Spinner'
import SoloEndScreen from '../../components/SoloEndScreen'
import BlobJumpLeaderboard from './components/BlobJumpLeaderboard'
import { submitBlobJumpScore } from './useBlobJumpLeaderboard'
import { recordMatch } from '../../lib/auth'

const retryImport = (fn) => fn().catch(() => new Promise((r) => setTimeout(r, 1500)).then(fn))

const BlobJumpPlaying = lazy(() => retryImport(() => import('./components/BlobJumpPlaying')))

const Loading = () => (
  <div className="flex items-center justify-center" style={{ flex: 1 }}>
    <Spinner size="lg" />
  </div>
)

const BlobJump = () => {
  const bj = useBlobJump()
  const navigate = useNavigate()
  const [replaying, setReplaying] = useState(false)
  const [lbOpen, setLbOpen] = useState(false)
  const submitFiredRef = useRef(false)

  // Submit del best score globale appena entriamo in final.
  useEffect(() => {
    if (bj.currentPhase !== 'blobjump_final') {
      submitFiredRef.current = false
      return
    }
    if (submitFiredRef.current) return
    submitFiredRef.current = true

    const me = bj.players.find((p) => p.id === bj.localPlayerId)
    const score = me?.score ?? 0
    if (!me || score <= 0) return
    submitBlobJumpScore({
      score,
      playerName: me.name || 'Anonimo',
      color: me.color,
      source: 'solo',
    })
    // Storico partite (no-op se l'utente è guest).
    recordMatch({ gameId: 'blobjump', mode: 'solo', score, won: null })
  }, [bj.currentPhase, bj.players, bj.localPlayerId])

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
    // Solo: skip countdown — Rigioca deve essere istantaneo.
    useSession.setState({
      players: resetPlayers,
      gameState: { ...(s.gameState || {}), currentSeed: newSeed },
      currentPhase: 'blobjump_playing',
      questionStartedAt: now,
    })
    setReplaying(false)
  }, [replaying])

  if (bj.currentPhase === 'blobjump_countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={bj.questionStartedAt}
        onComplete={() => {}}
        players={bj.players}
        localPlayerId={bj.localPlayerId}
        gameName="Blob Jump"
        gameEmoji="🦘"
      />
    )
  }

  if (bj.currentPhase === 'blobjump_playing') {
    return (
      <Suspense fallback={<Loading />}>
        <BlobJumpPlaying
          seed={bj.currentSeed}
          blobColor={bj.blobColor}
          scoreSubmitted={bj.scoreSubmitted}
          onSubmitScore={bj.submitScore}
        />
      </Suspense>
    )
  }

  if (bj.currentPhase === 'blobjump_final') {
    const me = bj.players.find((p) => p.id === bj.localPlayerId)
    const height = me?.score ?? 0
    return (
      <>
        <SoloEndScreen
          gameEmoji="🦘"
          gameName="Blob Jump"
          player={me}
          primaryValue={height}
          primaryLabel="metri"
          advancing={replaying}
          onReplay={handleReplay}
          onChangeGame={handleChangeGame}
          onLeaderboard={() => setLbOpen(true)}
        />
        <BlobJumpLeaderboard open={lbOpen} onClose={() => setLbOpen(false)} />
      </>
    )
  }

  return <Loading />
}

export default BlobJump
