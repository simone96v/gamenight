import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useRoomSync } from './hooks/useRoomSync'
import { useHostCleanup } from './hooks/useHostCleanup'
import { ConnectionContext } from './contexts/connection'

import ErrorBoundary from './components/ErrorBoundary'
import LiquidBackground from './components/LiquidBackground'
import HomeScreen from './screens/HomeScreen'
import ModeScreen from './screens/ModeScreen'
import JoinScreen from './screens/JoinScreen'
import WaitingScreen from './screens/WaitingScreen'
import LobbyScreen from './screens/LobbyScreen'
import CategoryScreen from './screens/CategoryScreen'
import GamesScreen from './screens/GamesScreen'
import GameHubScreen from './screens/GameHubScreen'
import GameScreen from './screens/GameScreen'
import TriviaLobbyScreen from './screens/TriviaLobbyScreen'
import MappaLobbyScreen from './screens/MappaLobbyScreen'
import SentenzaLobbyScreen from './screens/SentenzaLobbyScreen'
import RoundEndScreen from './screens/RoundEndScreen'
import ScoreboardScreen from './screens/ScoreboardScreen'

const MappaTest = lazy(() => import('./games/Mappa/MappaTest'))
const SentenzaTest = lazy(() => import('./games/Sentenza/SentenzaTest'))

function App() {
  useHostCleanup()
  const { status } = useRoomSync()

  return (
    <ErrorBoundary>
      <ConnectionContext.Provider value={status}>
        <LiquidBackground />
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/mode" element={<ModeScreen />} />
          <Route path="/join" element={<JoinScreen />} />
          <Route path="/waiting" element={<WaitingScreen />} />
          <Route path="/lobby" element={<LobbyScreen />} />
          <Route path="/category" element={<CategoryScreen />} />
          <Route path="/games" element={<GamesScreen />} />
          <Route path="/hub" element={<GameHubScreen />} />
          <Route path="/trivia-lobby" element={<TriviaLobbyScreen />} />
          <Route path="/mappa-lobby" element={<MappaLobbyScreen />} />
          <Route path="/sentenza-lobby" element={<SentenzaLobbyScreen />} />
          <Route path="/game/:gameId" element={<GameScreen />} />
          <Route path="/round-end" element={<RoundEndScreen />} />
          <Route path="/scoreboard" element={<ScoreboardScreen />} />
          <Route path="/test/mappa" element={<Suspense><MappaTest /></Suspense>} />
          <Route path="/test/sentenza" element={<Suspense><SentenzaTest /></Suspense>} />
        </Routes>
      </ConnectionContext.Provider>
    </ErrorBoundary>
  )
}

export default App
