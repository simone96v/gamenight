import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlobDash } from './useBlobDash'
import { useSession } from '../../stores/useSession'
import CountdownOverlay from '../../components/CountdownOverlay'
import Spinner from '../../components/ui/Spinner'
import SoloEndScreen from '../../components/SoloEndScreen'
import BlobDashLeaderboard from './components/BlobDashLeaderboard'
import { submitBlobDashScore } from './useBlobDashLeaderboard'

const retryImport = (fn) => fn().catch(() => new Promise((r) => setTimeout(r, 1500)).then(fn))

const BlobDashPlaying = lazy(() => retryImport(() => import('./components/BlobDashPlaying')))

const Loading = () => (
  <div className="flex items-center justify-center" style={{ flex: 1 }}>
    <Spinner size="lg" />
  </div>
)

const BlobDash = () => {
  const bd = useBlobDash()
  const navigate = useNavigate()
  const [replaying, setReplaying] = useState(false)
  const [lbOpen, setLbOpen] = useState(false)
  const submitFiredRef = useRef(false)

  // Submit del best score globale quando entriamo in final.
  useEffect(() => {
    if (bd.currentPhase !== 'blobdash_final') {
      submitFiredRef.current = false
      return
    }
    if (submitFiredRef.current) return
    submitFiredRef.current = true

    const me = bd.players.find((p) => p.id === bd.localPlayerId)
    const score = me?.score ?? 0
    if (!me || score <= 0) return
    submitBlobDashScore({
      score,
      playerName: me.name || 'Anonimo',
      color: me.color,
      source: 'solo',
    })
  }, [bd.currentPhase, bd.players, bd.localPlayerId])

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
      currentPhase: 'blobdash_playing',
      questionStartedAt: now,
    })
    setReplaying(false)
  }, [replaying])

  // Shortcut keyboard: SPACE/ENTER rigioca quando sei in final.
  useEffect(() => {
    if (bd.currentPhase !== 'blobdash_final') return
    const onKey = (e) => {
      if (lbOpen) return // se la classifica è aperta, lascia stare
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handleReplay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [bd.currentPhase, lbOpen, handleReplay])

  if (bd.currentPhase === 'blobdash_countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={bd.questionStartedAt}
        onComplete={() => {}}
        players={bd.players}
        localPlayerId={bd.localPlayerId}
        gameName="Blob Dash"
        gameEmoji="💨"
      />
    )
  }

  if (bd.currentPhase === 'blobdash_playing') {
    return (
      <Suspense fallback={<Loading />}>
        <BlobDashPlaying
          seed={bd.currentSeed}
          blobColor={bd.blobColor}
          scoreSubmitted={bd.scoreSubmitted}
          onSubmitScore={bd.submitScore}
        />
      </Suspense>
    )
  }

  if (bd.currentPhase === 'blobdash_final') {
    const me = bd.players.find((p) => p.id === bd.localPlayerId)
    const distance = me?.score ?? 0
    return (
      <>
        <SoloEndScreen
          gameEmoji="💨"
          gameName="Blob Dash"
          player={me}
          primaryValue={distance}
          primaryLabel="metri"
          advancing={replaying}
          onReplay={handleReplay}
          onChangeGame={handleChangeGame}
          onLeaderboard={() => setLbOpen(true)}
        />
        <BlobDashLeaderboard open={lbOpen} onClose={() => setLbOpen(false)} />
      </>
    )
  }

  return <Loading />
}

export default BlobDash
