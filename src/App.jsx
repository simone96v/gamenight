import { lazy, Suspense, useCallback } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { useRoomSync } from './hooks/useRoomSync'
import { useHostHeartbeat } from './hooks/useHostHeartbeat'
import { useThemeSync } from './hooks/useThemeSync'
import { ConnectionContext } from './contexts/connection'
import { useSession } from './stores/useSession'
import { closeRoom } from './lib/room'

import ErrorBoundary from './components/ErrorBoundary'
import HomeScreen from './screens/HomeScreen'
import InstallPrompt from './components/InstallPrompt'
import ConnectionModal from './components/ConnectionModal'

const ModeScreen = lazy(() => import('./screens/ModeScreen'))
const CreatePartyScreen = lazy(() => import('./screens/CreatePartyScreen'))
const JoinScreen = lazy(() => import('./screens/JoinScreen'))
const WaitingScreen = lazy(() => import('./screens/WaitingScreen'))
const LobbyScreen = lazy(() => import('./screens/LobbyScreen'))
const CategoryScreen = lazy(() => import('./screens/CategoryScreen'))
const GameCategoryScreen = lazy(() => import('./screens/GameCategoryScreen'))
const GamesScreen = lazy(() => import('./screens/GamesScreen'))
const GameHubScreen = lazy(() => import('./screens/GameHubScreen'))
const GameScreen = lazy(() => import('./screens/GameScreen'))
const TriviaLobbyScreen = lazy(() => import('./screens/TriviaLobbyScreen'))
const MappaLobbyScreen = lazy(() => import('./screens/MappaLobbyScreen'))
const BlobJumpLobbyScreen = lazy(() => import('./screens/BlobJumpLobbyScreen'))
const CatchBlobLobbyScreen = lazy(() => import('./screens/CatchBlobLobbyScreen'))
const FlappyBlobLobbyScreen = lazy(() => import('./screens/FlappyBlobLobbyScreen'))
const EmojiQuizLobbyScreen = lazy(() => import('./screens/EmojiQuizLobbyScreen'))
const ScrambleLobbyScreen = lazy(() => import('./screens/ScrambleLobbyScreen'))
const RoundEndScreen = lazy(() => import('./screens/RoundEndScreen'))
const ScoreboardScreen = lazy(() => import('./screens/ScoreboardScreen'))
const SoloSetupScreen = lazy(() => import('./screens/SoloSetupScreen'))
const SoloGamesScreen = lazy(() => import('./screens/SoloGamesScreen'))
const MappaTest = lazy(() => import('./games/Mappa/MappaTest'))
const BlobJumpTest = lazy(() => import('./games/BlobJump/BlobJumpTest'))
const CatchBlobTest = lazy(() => import('./games/CatchBlob/CatchBlobTest'))

// Soglia oltre la quale la connessione persa del proprio client diventa modale
// bloccante (sotto, basta il banner inline).
const OWN_CONNECTION_MODAL_AFTER = 3

const ConnectionLayer = () => {
  const navigate = useNavigate()
  const mode = useSession((s) => s.mode)
  const isHost = useSession((s) => s.isHost)
  const roomCode = useSession((s) => s.roomCode)
  const hostOffline = useSession((s) => s.hostOffline)
  const hostClosed = useSession((s) => s.hostClosed)
  const connectionAttempts = useSession((s) => s.connectionAttempts)
  const resetSession = useSession((s) => s.resetSession)

  const goHome = useCallback(async () => {
    if (isHost && roomCode) {
      try { await closeRoom(roomCode) } catch { /* best-effort */ }
    }
    resetSession()
    navigate('/', { replace: true })
  }, [isHost, roomCode, resetSession, navigate])

  if (mode !== 'online') return null

  // Priorità: party-closed (terminale) > host-offline > own-connection.
  let variant = null
  if (hostClosed) variant = 'party-closed'
  else if (hostOffline && !isHost) variant = 'host-offline'
  else if (connectionAttempts >= OWN_CONNECTION_MODAL_AFTER) variant = 'own-connection'

  if (!variant) return null

  return (
    <ConnectionModal
      variant={variant}
      attempts={connectionAttempts}
      onPrimary={goHome}
      onSecondary={goHome}
    />
  )
}

function App() {
  useHostHeartbeat()
  useThemeSync()
  const { status } = useRoomSync()

  return (
    <ErrorBoundary>
      <ConnectionContext.Provider value={status}>
        <InstallPrompt />
        <Suspense>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/create" element={<CreatePartyScreen />} />
            <Route path="/mode" element={<ModeScreen />} />
            <Route path="/join" element={<JoinScreen />} />
            <Route path="/waiting" element={<WaitingScreen />} />
            <Route path="/lobby" element={<LobbyScreen />} />
            <Route path="/category" element={<CategoryScreen />} />
            <Route path="/game-category" element={<GameCategoryScreen />} />
            <Route path="/games" element={<GamesScreen />} />
            <Route path="/solo" element={<SoloSetupScreen />} />
            <Route path="/solo/category" element={<GameCategoryScreen />} />
            <Route path="/solo/games" element={<SoloGamesScreen />} />
            <Route path="/hub" element={<GameHubScreen />} />
            <Route path="/trivia-lobby" element={<TriviaLobbyScreen />} />
            <Route path="/mappa-lobby" element={<MappaLobbyScreen />} />
            <Route path="/blobjump-lobby" element={<BlobJumpLobbyScreen />} />
            <Route path="/catchblob-lobby" element={<CatchBlobLobbyScreen />} />
            <Route path="/flappyblob-lobby" element={<FlappyBlobLobbyScreen />} />
            <Route path="/emojiquiz-lobby" element={<EmojiQuizLobbyScreen />} />
            <Route path="/scramble-lobby" element={<ScrambleLobbyScreen />} />
            <Route path="/game/:gameId" element={<GameScreen />} />
            <Route path="/round-end" element={<RoundEndScreen />} />
            <Route path="/scoreboard" element={<ScoreboardScreen />} />
            <Route path="/test/mappa" element={<MappaTest />} />
            <Route path="/test/blobjump" element={<BlobJumpTest />} />
            <Route path="/test/catchblob" element={<CatchBlobTest />} />
          </Routes>
        </Suspense>
        <ConnectionLayer />
      </ConnectionContext.Provider>
    </ErrorBoundary>
  )
}

export default App
