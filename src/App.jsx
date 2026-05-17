import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useRoomSync } from './hooks/useRoomSync'
import { useHostCleanup } from './hooks/useHostCleanup'
import { useThemeSync } from './hooks/useThemeSync'
import { ConnectionContext } from './contexts/connection'

import ErrorBoundary from './components/ErrorBoundary'
import HomeScreen from './screens/HomeScreen'
import IosPwaPrompt from './components/IosPwaPrompt'

const ModeScreen = lazy(() => import('./screens/ModeScreen'))
const CreatePartyScreen = lazy(() => import('./screens/CreatePartyScreen'))
const JoinScreen = lazy(() => import('./screens/JoinScreen'))
const WaitingScreen = lazy(() => import('./screens/WaitingScreen'))
const LobbyScreen = lazy(() => import('./screens/LobbyScreen'))
const CategoryScreen = lazy(() => import('./screens/CategoryScreen'))
const GamesScreen = lazy(() => import('./screens/GamesScreen'))
const GameHubScreen = lazy(() => import('./screens/GameHubScreen'))
const GameScreen = lazy(() => import('./screens/GameScreen'))
const TriviaLobbyScreen = lazy(() => import('./screens/TriviaLobbyScreen'))
const MappaLobbyScreen = lazy(() => import('./screens/MappaLobbyScreen'))
const SentenzaLobbyScreen = lazy(() => import('./screens/SentenzaLobbyScreen'))
const BlobJumpLobbyScreen = lazy(() => import('./screens/BlobJumpLobbyScreen'))
const EmojiQuizLobbyScreen = lazy(() => import('./screens/EmojiQuizLobbyScreen'))
const ScrambleLobbyScreen = lazy(() => import('./screens/ScrambleLobbyScreen'))
const RoundEndScreen = lazy(() => import('./screens/RoundEndScreen'))
const ScoreboardScreen = lazy(() => import('./screens/ScoreboardScreen'))
const SoloSetupScreen = lazy(() => import('./screens/SoloSetupScreen'))
const SoloGamesScreen = lazy(() => import('./screens/SoloGamesScreen'))
const MappaTest = lazy(() => import('./games/Mappa/MappaTest'))
const SentenzaTest = lazy(() => import('./games/Sentenza/SentenzaTest'))
const BlobJumpTest = lazy(() => import('./games/BlobJump/BlobJumpTest'))

function App() {
  useHostCleanup()
  useThemeSync()
  const { status } = useRoomSync()

  return (
    <ErrorBoundary>
      <ConnectionContext.Provider value={status}>
        <IosPwaPrompt />
        <Suspense>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/create" element={<CreatePartyScreen />} />
            <Route path="/mode" element={<ModeScreen />} />
            <Route path="/join" element={<JoinScreen />} />
            <Route path="/waiting" element={<WaitingScreen />} />
            <Route path="/lobby" element={<LobbyScreen />} />
            <Route path="/category" element={<CategoryScreen />} />
            <Route path="/games" element={<GamesScreen />} />
            <Route path="/solo" element={<SoloSetupScreen />} />
            <Route path="/solo/games" element={<SoloGamesScreen />} />
            <Route path="/hub" element={<GameHubScreen />} />
            <Route path="/trivia-lobby" element={<TriviaLobbyScreen />} />
            <Route path="/mappa-lobby" element={<MappaLobbyScreen />} />
            <Route path="/sentenza-lobby" element={<SentenzaLobbyScreen />} />
            <Route path="/blobjump-lobby" element={<BlobJumpLobbyScreen />} />
            <Route path="/emojiquiz-lobby" element={<EmojiQuizLobbyScreen />} />
            <Route path="/scramble-lobby" element={<ScrambleLobbyScreen />} />
            <Route path="/game/:gameId" element={<GameScreen />} />
            <Route path="/round-end" element={<RoundEndScreen />} />
            <Route path="/scoreboard" element={<ScoreboardScreen />} />
            <Route path="/test/mappa" element={<MappaTest />} />
            <Route path="/test/sentenza" element={<SentenzaTest />} />
            <Route path="/test/blobjump" element={<BlobJumpTest />} />
          </Routes>
        </Suspense>
      </ConnectionContext.Provider>
    </ErrorBoundary>
  )
}

export default App
