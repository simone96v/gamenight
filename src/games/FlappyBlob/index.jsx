import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlappyBlob } from './useFlappyBlob'
import { useSession } from '../../stores/useSession'
import CountdownOverlay from '../../components/CountdownOverlay'
import Spinner from '../../components/ui/Spinner'
import SoloEndScreen from '../../components/SoloEndScreen'
import FlappyBlobLeaderboard from './components/FlappyBlobLeaderboard'
import { submitFlappyBlobScore, fetchPlayerRank } from './useFlappyBlobLeaderboard'

const retryImport = (fn) => fn().catch(() => new Promise((r) => setTimeout(r, 1500)).then(fn))

const FlappyBlobPlaying = lazy(() => retryImport(() => import('./components/FlappyBlobPlaying')))

const Loading = () => (
  <div className="flex items-center justify-center" style={{ flex: 1 }}>
    <Spinner size="lg" />
  </div>
)

const FlappyBlob = () => {
  const fb = useFlappyBlob()
  const navigate = useNavigate()
  const [replaying, setReplaying] = useState(false)
  const [lbOpen, setLbOpen] = useState(false)
  const [localBest, setLocalBest] = useState(0)
  const submitFiredRef = useRef(false)

  // Fetch local best on mount (for HUD display)
  useEffect(() => {
    let cancelled = false
    fetchPlayerRank().then((r) => {
      if (!cancelled && typeof r?.score === 'number') setLocalBest(r.score)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Submit best score globally on final
  useEffect(() => {
    if (fb.currentPhase !== 'flappyblob_final') {
      submitFiredRef.current = false
      return
    }
    if (submitFiredRef.current) return
    submitFiredRef.current = true

    const me = fb.players.find((p) => p.id === fb.localPlayerId)
    const score = me?.score ?? 0
    if (!me || score <= 0) return
    submitFlappyBlobScore({
      score,
      playerName: me.name || 'Anonimo',
      color: me.color,
      source: 'solo',
    }).then((res) => {
      if (typeof res?.newBest === 'number') setLocalBest(res.newBest)
    })
  }, [fb.currentPhase, fb.players, fb.localPlayerId])

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
      currentPhase: 'flappyblob_playing',
      questionStartedAt: now,
    })
    setReplaying(false)
  }, [replaying])

  // Su PC: Space rigioca dalla schermata finale (stesso input usato per
  // flap durante il gioco). e.repeat=false evita lo spam se Space resta
  // premuto al momento della morte.
  useEffect(() => {
    if (fb.currentPhase !== 'flappyblob_final') return
    const onKey = (e) => {
      if (e.code !== 'Space' || e.repeat) return
      e.preventDefault()
      handleReplay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fb.currentPhase, handleReplay])

  if (fb.currentPhase === 'flappyblob_countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={fb.questionStartedAt}
        onComplete={() => {}}
        players={fb.players}
        localPlayerId={fb.localPlayerId}
        gameName="Flappy Blob"
        gameEmoji="🐤"
      />
    )
  }

  if (fb.currentPhase === 'flappyblob_playing') {
    return (
      <Suspense fallback={<Loading />}>
        <FlappyBlobPlaying
          seed={fb.currentSeed}
          blobColor={fb.blobColor}
          scoreSubmitted={fb.scoreSubmitted}
          onSubmitScore={fb.submitScore}
          localBest={localBest}
        />
      </Suspense>
    )
  }

  if (fb.currentPhase === 'flappyblob_final') {
    const me = fb.players.find((p) => p.id === fb.localPlayerId)
    const score = me?.score ?? 0
    return (
      <>
        <SoloEndScreen
          gameEmoji="🐤"
          gameName="Flappy Blob"
          player={me}
          primaryValue={score}
          primaryLabel="punti"
          advancing={replaying}
          onReplay={handleReplay}
          onChangeGame={handleChangeGame}
          onLeaderboard={() => setLbOpen(true)}
        />
        <FlappyBlobLeaderboard open={lbOpen} onClose={() => setLbOpen(false)} />
      </>
    )
  }

  return <Loading />
}

export default FlappyBlob
