// Blob Dig entry — phase router single-player endless.
//
// Phase: blobdig_countdown (skip su Rigioca solo) → blobdig_playing → blobdig_final

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlobDig } from './useBlobDig'
import { useSession } from '../../stores/useSession'
import CountdownOverlay from '../../components/CountdownOverlay'
import Spinner from '../../components/ui/Spinner'
import SoloEndScreen from '../../components/SoloEndScreen'
import BlobDigPlaying from './components/BlobDigPlaying'
import BlobDigLeaderboard from './components/BlobDigLeaderboard'
import { submitBlobDigScore } from './useBlobDigLeaderboard'

const Loading = () => (
  <div className="flex items-center justify-center" style={{ flex: 1 }}>
    <Spinner size="lg" />
  </div>
)

const BlobDig = () => {
  const bd = useBlobDig()
  const navigate = useNavigate()
  const [replaying, setReplaying] = useState(false)
  const [lbOpen, setLbOpen] = useState(false)

  const handleChangeGame = useCallback(() => {
    navigate('/solo/games', { replace: true })
  }, [navigate])

  const handleReplay = useCallback(async () => {
    setReplaying(true)
    const newSeed = Math.floor(Math.random() * 2147483647)
    const now = new Date().toISOString()
    const s = useSession.getState()
    const resetPlayers = (s.players || []).map((p) => ({ ...p, score: 0 }))
    useSession.setState({
      players: resetPlayers,
      gameState: { currentSeed: newSeed },
      currentPhase: 'blobdig_playing',
      questionStartedAt: now,
    })
    setReplaying(false)
  }, [])

  if (bd.currentPhase === 'blobdig_countdown') {
    return (
      <CountdownOverlay
        questionStartedAt={bd.questionStartedAt}
        onComplete={() => {}}
        players={bd.players}
        localPlayerId={bd.localPlayerId}
        gameName="Blob Dig"
        gameEmoji="⛏️"
      />
    )
  }

  if (bd.currentPhase === 'blobdig_playing') {
    return (
      <BlobDigPlaying
        seed={bd.currentSeed}
        blobColor={bd.blobColor}
        scoreSubmitted={bd.scoreSubmitted}
        onSubmitScore={(score) => {
          if (bd.scoreSubmitted) return
          bd.submitScore(score)
          const me = bd.players.find((p) => p.id === bd.localPlayerId)
          if (me && score > 0) {
            submitBlobDigScore({
              score,
              playerName: me.name || 'Anonimo',
              color: me.color,
              source: 'solo',
            })
          }
        }}
      />
    )
  }

  if (bd.currentPhase === 'blobdig_final') {
    const me = bd.players.find((p) => p.id === bd.localPlayerId)
    const score = me?.score ?? 0
    return (
      <>
        <SoloEndScreen
          gameEmoji="⛏️"
          gameName="Blob Dig"
          player={me}
          primaryValue={score}
          primaryLabel="punti"
          advancing={replaying}
          onReplay={handleReplay}
          onChangeGame={handleChangeGame}
          onLeaderboard={() => setLbOpen(true)}
        />
        <BlobDigLeaderboard open={lbOpen} onClose={() => setLbOpen(false)} />
      </>
    )
  }

  return <Loading />
}

export default BlobDig
