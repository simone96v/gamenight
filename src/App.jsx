import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useRoomSync } from './hooks/useRoomSync'
import { ConnectionContext } from './contexts/connection'

import HomeScreen from './screens/HomeScreen'
import ModeScreen from './screens/ModeScreen'
import JoinScreen from './screens/JoinScreen'
import WaitingScreen from './screens/WaitingScreen'
import LobbyScreen from './screens/LobbyScreen'
import GameHubScreen from './screens/GameHubScreen'
import GameScreen from './screens/GameScreen'
import RoundEndScreen from './screens/RoundEndScreen'
import ScoreboardScreen from './screens/ScoreboardScreen'

function App() {
  const { status } = useRoomSync()
  const location = useLocation()

  return (
    <ConnectionContext.Provider value={status}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/mode" element={<ModeScreen />} />
          <Route path="/join" element={<JoinScreen />} />
          <Route path="/waiting" element={<WaitingScreen />} />
          <Route path="/lobby" element={<LobbyScreen />} />
          <Route path="/hub" element={<GameHubScreen />} />
          <Route path="/game/:gameId" element={<GameScreen />} />
          <Route path="/round-end" element={<RoundEndScreen />} />
          <Route path="/scoreboard" element={<ScoreboardScreen />} />
        </Routes>
      </AnimatePresence>
    </ConnectionContext.Provider>
  )
}

export default App
