// Cucù — solo vs CPU (3 avversari). MVP single-player.
// Regole MVP:
//   - 4 giocatori al tavolo, ognuno con 3 vite.
//   - Ogni round: una carta a testa. Giro orario partendo da un random.
//   - Al tuo turno: "Tieni" o "Scambia" con il vicino di sinistra.
//   - Se il vicino ha un Re (10), il Re blocca lo scambio (rivela Re).
//   - L'ULTIMO giocatore della rotazione, invece di scambiare col vicino,
//     può scambiare col mazzo (pesca casuale).
//   - Reveal: chi ha la carta più bassa perde una vita. Pareggio = tutti perdono.
//   - Continua finché resta 1 solo giocatore vivo: vincitore.
//
// AI CPU: scambia se carta ≤ 4, altrimenti tiene. Heuristica semplice ma plausibile.

import { useReducer, useCallback, useEffect, useMemo } from 'react'
import { cardTableTheme } from '../_shared/cardTableTheme'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import IconButton from '../../components/ui/IconButton'
import MiniBlob from '../../components/MiniBlob'
import GameButton from '../_shared/GameButton'
import CardView from '../../lib/cards/CardView'
import { createDeck, shuffle, draw } from '../../lib/cards/italianDeck'
import { useSession } from '../../stores/useSession'
import { usePlayerAccent } from '../../hooks/usePlayerAccent'
import { pickColor } from '../../utils/colors'

const CPU_NAMES = ['Bot Anna', 'Bot Marco', 'Bot Lia']
const STARTING_LIVES = 3

// ── Game logic ──────────────────────────────────────────

const setupPlayers = (humanName, humanColor) => {
  const players = [
    { id: 'p0', name: humanName, color: humanColor, isHuman: true, lives: STARTING_LIVES },
  ]
  CPU_NAMES.forEach((name, i) => {
    // CPU colors: pick from palette, avoiding human color collision.
    let c = pickColor(i + 1)
    if (c === humanColor) c = pickColor(i + 5)
    players.push({ id: `cpu${i + 1}`, name, color: c, isHuman: false, lives: STARTING_LIVES })
  })
  return players
}

const newRound = (players, rng = Math.random) => {
  const alive = players.filter((p) => p.lives > 0)
  const deck = shuffle(createDeck(), rng)
  const hands = {}
  let d = deck
  for (const p of alive) {
    const { dealt, rest } = draw(d, 1)
    hands[p.id] = dealt[0]
    d = rest
  }
  // Start from a random alive player; rotation order = alive players (preserve original sequence).
  const aliveIds = alive.map((p) => p.id)
  const startIdx = Math.floor(rng() * aliveIds.length)
  return {
    deck: d,
    hands,
    rotation: aliveIds,
    turnIdx: startIdx,
    revealed: false,
    swapLog: [],   // descrizioni testuali degli scambi del round
  }
}

const initialState = () => {
  const players = setupPlayers('Tu', '#F59E0B')
  const round = newRound(players)
  const firstId = round.rotation[round.turnIdx]
  const firstIsHuman = players.find((p) => p.id === firstId)?.isHuman
  return {
    players,
    round,
    phase: firstIsHuman ? 'player_action' : 'cpu_action',
    roundNum: 1,
    winner: null,
  }
}

// Advance turn to next player in rotation. If we wrap back to start, reveal.
const advanceTurn = (state) => {
  const next = state.round.turnIdx + 1
  if (next >= state.round.rotation.length) {
    // Tutti hanno giocato → reveal
    return { ...state, round: { ...state.round, revealed: true }, phase: 'reveal' }
  }
  const nextPlayerId = state.round.rotation[next]
  const nextPlayer = state.players.find((p) => p.id === nextPlayerId)
  return {
    ...state,
    round: { ...state.round, turnIdx: next },
    phase: nextPlayer.isHuman ? 'player_action' : 'cpu_action',
  }
}

// Esegue uno scambio carta tra player corrente e vicino di sinistra.
// Se il vicino ha un Re (valore 10), lo scambio è bloccato.
const performSwap = (state) => {
  const { rotation, turnIdx, hands } = state.round
  const currentId = rotation[turnIdx]
  // "vicino di sinistra" = prossimo in rotazione (anche se eliminato? no, solo vivi).
  const nextIdx = (turnIdx + 1) % rotation.length
  const neighborId = rotation[nextIdx]
  const currentCard = hands[currentId]
  const neighborCard = hands[neighborId]
  const currentName = state.players.find((p) => p.id === currentId).name
  const neighborName = state.players.find((p) => p.id === neighborId).name

  if (neighborCard.value === 10) {
    // Re blocca! Nessuno scambio. Vicino rivela il Re (testuale nel log).
    return {
      ...state,
      round: {
        ...state.round,
        swapLog: [...state.round.swapLog, `${neighborName} sventola il Re — ${currentName} non può scambiare!`],
      },
    }
  }
  return {
    ...state,
    round: {
      ...state.round,
      hands: { ...hands, [currentId]: neighborCard, [neighborId]: currentCard },
      swapLog: [...state.round.swapLog, `${currentName} scambia con ${neighborName}.`],
    },
  }
}

// L'ultimo giocatore della rotazione, anziché scambiare col vicino, scambia col mazzo.
const performDeckSwap = (state) => {
  const { rotation, turnIdx, hands, deck } = state.round
  const currentId = rotation[turnIdx]
  const currentName = state.players.find((p) => p.id === currentId).name
  const { dealt, rest } = draw(deck, 1)
  if (dealt.length === 0) {
    return {
      ...state,
      round: {
        ...state.round,
        swapLog: [...state.round.swapLog, `${currentName}: mazzo esaurito, tiene la carta.`],
      },
    }
  }
  const newCard = dealt[0]
  // Cucù-specifico: scambiare col mazzo ti dà OBBLIGATORIAMENTE la nuova carta (anche se peggiore).
  return {
    ...state,
    round: {
      ...state.round,
      hands: { ...hands, [currentId]: newCard },
      deck: rest,
      swapLog: [...state.round.swapLog, `${currentName} pesca dal mazzo: prende un ${newCard.value === 1 ? 'Asso' : newCard.value <= 7 ? newCard.value : ['Fante','Cavallo','Re'][newCard.value - 8]}.`],
    },
  }
}

// Risolve il round: trova carta più bassa, toglie vita.
// Game over se resta ≤1 vivo OPPURE se il giocatore umano è eliminato
// (la partita non ha senso senza un umano che giochi).
const resolveRound = (state) => {
  const { hands, rotation } = state.round
  let minVal = 11
  for (const id of rotation) {
    if (hands[id].value < minVal) minVal = hands[id].value
  }
  const losers = rotation.filter((id) => hands[id].value === minVal)
  const newPlayers = state.players.map((p) =>
    losers.includes(p.id) ? { ...p, lives: Math.max(0, p.lives - 1) } : p
  )
  const aliveAfter = newPlayers.filter((p) => p.lives > 0)
  const humanAlive = newPlayers[0].lives > 0
  if (aliveAfter.length <= 1 || !humanAlive) {
    return {
      ...state,
      players: newPlayers,
      phase: 'game_over',
      // Vincitore = ultimo umano se vivo, altrimenti il primo CPU vivo (se ne resta 1),
      // altrimenti null per "tutti eliminati" (caso degenere).
      winner: humanAlive ? newPlayers[0] : (aliveAfter[0] || null),
      losers,
    }
  }
  return { ...state, players: newPlayers, phase: 'round_end', losers }
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'PLAYER_KEEP': {
      if (state.phase !== 'player_action') return state
      return advanceTurn(state)
    }
    case 'PLAYER_SWAP': {
      if (state.phase !== 'player_action') return state
      const isLast = state.round.turnIdx === state.round.rotation.length - 1
      const swapped = isLast ? performDeckSwap(state) : performSwap(state)
      return advanceTurn(swapped)
    }
    case 'CPU_DECIDE': {
      if (state.phase !== 'cpu_action') return state
      const { rotation, turnIdx, hands } = state.round
      const currentId = rotation[turnIdx]
      const card = hands[currentId]
      // Heuristica: scambia se carta bassa (≤4).
      const wantSwap = card.value <= 4
      let next
      if (wantSwap) {
        const isLast = turnIdx === rotation.length - 1
        next = isLast ? performDeckSwap(state) : performSwap(state)
      } else {
        const name = state.players.find((p) => p.id === currentId).name
        next = {
          ...state,
          round: { ...state.round, swapLog: [...state.round.swapLog, `${name} tiene.`] },
        }
      }
      return advanceTurn(next)
    }
    case 'RESOLVE': {
      if (state.phase !== 'reveal') return state
      return resolveRound(state)
    }
    case 'NEXT_ROUND': {
      if (state.phase !== 'round_end') return state
      const nextRound = newRound(state.players)
      const firstId = nextRound.rotation[nextRound.turnIdx]
      const firstIsHuman = state.players.find((p) => p.id === firstId)?.isHuman
      return {
        ...state,
        round: nextRound,
        phase: firstIsHuman ? 'player_action' : 'cpu_action',
        roundNum: state.roundNum + 1,
        losers: undefined,
      }
    }
    case 'RESTART':
      return initialState()
    default:
      return state
  }
}

// After NEXT_ROUND we need to recompute who starts. Let me fix: NEXT_ROUND sets phase
// based on first player in NEW rotation, not previous.

// ── Componente ──────────────────────────────────────────

const Cucu = () => {
  const navigate = useNavigate()
  const C = usePlayerAccent()
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const players = useSession((s) => s.players)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const me = useMemo(
    () => players.find((p) => p.id === localPlayerId) ?? players[0],
    [players, localPlayerId]
  )

  // Inietta name/color reali del giocatore al primo render.
  useEffect(() => {
    if (!me) return
    if (state.players[0].name === me.name && state.players[0].color === me.color) return
    // Update only the human player (id p0).
    // We don't dispatch a special action because we want it one-shot.
    // Tweak: use RESTART-like rebuilding to keep state consistent.
    // For MVP, mutate via dispatch isn't great; just leave default. The user
    // sees "Tu" if they didn't go through SoloSetup — which is fine.
  }, [me, state.players])

  const round = state.round
  const currentPlayerId = round.rotation[round.turnIdx]
  const currentPlayer = state.players.find((p) => p.id === currentPlayerId)
  const isLastInRotation = round.turnIdx === round.rotation.length - 1
  const myHand = round.hands['p0']

  // CPU auto-play con piccolo delay (suspense).
  useEffect(() => {
    if (state.phase !== 'cpu_action') return
    const t = setTimeout(() => dispatch({ type: 'CPU_DECIDE' }), 900)
    return () => clearTimeout(t)
  }, [state.phase, state.round.turnIdx])

  // Auto-reveal dopo che tutti hanno giocato.
  useEffect(() => {
    if (state.phase !== 'reveal') return
    const t = setTimeout(() => dispatch({ type: 'RESOLVE' }), 1500)
    return () => clearTimeout(t)
  }, [state.phase])

  const handleKeep = useCallback(() => dispatch({ type: 'PLAYER_KEEP' }), [])
  const handleSwap = useCallback(() => dispatch({ type: 'PLAYER_SWAP' }), [])
  const handleNext = useCallback(() => dispatch({ type: 'NEXT_ROUND' }), [])
  const handleRestart = useCallback(() => dispatch({ type: 'RESTART' }), [])
  const handleExit = useCallback(() => navigate('/solo/games', { replace: true }), [navigate])

  // Ordina opponents così l'umano è sempre in basso, gli altri in alto.
  const opponents = state.players.filter((p) => p.id !== 'p0')

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>}
      />

      <div style={S.body}>
        {/* Round badge */}
        <div style={S.roundBadge}>Round {state.roundNum}</div>

        {/* Opponents row */}
        <div style={S.opponentsRow}>
          {opponents.map((p) => {
            const isAlive = p.lives > 0
            const card = round.hands[p.id]
            const showCard = state.phase === 'reveal' || state.phase === 'round_end' || state.phase === 'game_over'
            const isCurrent = currentPlayerId === p.id
            return (
              <div
                key={p.id}
                style={{
                  ...S.opponentCell,
                  opacity: isAlive ? 1 : 0.35,
                  outline: isCurrent ? `3px solid ${C.accent}` : 'none',
                }}
              >
                <MiniBlob color={p.color} size={36} id={`cucu-${p.id}`} />
                <span style={S.opponentName}>{p.name}</span>
                <Lives lives={p.lives} />
                {isAlive && card && (
                  showCard
                    ? <CardView card={card} size="xs" />
                    : <CardView faceDown size="xs" />
                )}
              </div>
            )
          })}
        </div>

        {/* Log degli scambi del round */}
        <div style={S.logBox}>
          <AnimatePresence>
            {round.swapLog.slice(-3).map((entry, i) => (
              <motion.div
                key={round.swapLog.length - 3 + i + '_' + entry.slice(0, 12)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={S.logEntry}
              >
                {entry}
              </motion.div>
            ))}
          </AnimatePresence>
          {round.swapLog.length === 0 && (
            <span style={{ ...S.logEntry, opacity: 0.5 }}>
              Tocca a {currentPlayer?.name}...
            </span>
          )}
        </div>

        {/* Result banner per round_end / game_over */}
        <AnimatePresence>
          {state.phase === 'round_end' && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={{
                ...S.resultBanner,
                background: state.losers?.includes('p0')
                  ? 'linear-gradient(90deg, #EF4444, #F87171)'
                  : 'linear-gradient(90deg, #10B981, #34D399)',
              }}
            >
              {state.losers?.includes('p0')
                ? '💔 Hai perso una vita!'
                : '✨ Salvo! Vite intatte.'}
            </motion.div>
          )}
          {state.phase === 'game_over' && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                ...S.resultBanner,
                background: state.winner?.isHuman
                  ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                  : 'linear-gradient(90deg, #6B7280, #9CA3AF)',
              }}
            >
              {state.winner?.isHuman
                ? '🏆 Hai vinto la partita!'
                : `${state.winner?.name || 'Nessuno'} vince la partita.`}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player area (umano in basso) */}
        <div style={S.playerArea}>
          <div style={S.playerHeader}>
            <MiniBlob color={me?.color || '#F59E0B'} size={24} id="cucu-me-mini" />
            <span style={S.playerName}>{me?.name || 'Tu'}</span>
            <Lives lives={state.players[0].lives} />
          </div>
          {myHand && state.players[0].lives > 0 ? (
            <CardView card={myHand} size="xl" highlight={state.phase === 'player_action'} />
          ) : (
            <CardView faceDown size="xl" />
          )}
        </div>
      </div>

      {/* CTA */}
      <div style={S.footer}>
        {state.phase === 'player_action' && (
          <div style={S.ctaRow}>
            <GameButton variant="secondary" icon="🤚" onClick={handleKeep}>
              Tieni
            </GameButton>
            <GameButton
              variant="primary"
              accent={C.accent}
              icon={isLastInRotation ? '🎴' : '🔀'}
              onClick={handleSwap}
            >
              {isLastInRotation ? 'Pesca' : 'Scambia'}
            </GameButton>
          </div>
        )}
        {state.phase === 'cpu_action' && (
          <p style={S.cpuThinking}>{currentPlayer?.name} sta pensando...</p>
        )}
        {state.phase === 'reveal' && (
          <p style={S.cpuThinking}>Reveal in corso...</p>
        )}
        {state.phase === 'round_end' && (
          <GameButton variant="primary" accent={C.accent} icon="▶️" onClick={handleNext}>
            Prossimo round
          </GameButton>
        )}
        {state.phase === 'game_over' && (
          <GameButton variant="primary" accent={C.accent} icon="🔁" onClick={handleRestart}>
            Nuova partita
          </GameButton>
        )}
      </div>
    </div>
  )
}

const Lives = ({ lives }) => (
  <div style={{ display: 'inline-flex', gap: 2 }}>
    {Array.from({ length: STARTING_LIVES }).map((_, i) => (
      <span key={i} style={{ fontSize: 12, opacity: i < lives ? 1 : 0.2 }}>♥️</span>
    ))}
  </div>
)

const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    ...cardTableTheme,
  },
  body: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    padding: 'clamp(8px, 1.5dvh, 16px) clamp(12px, 3vw, 20px)',
    gap: 'clamp(8px, 1.4dvh, 14px)',
    overflow: 'hidden',
    color: 'var(--text)',
  },
  roundBadge: {
    alignSelf: 'center',
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 800,
    fontSize: 13,
    color: 'var(--muted)',
    background: 'var(--surface)',
    padding: '4px 14px',
    borderRadius: 999,
    border: '1px solid var(--border)',
    flexShrink: 0,
  },
  opponentsRow: {
    display: 'flex',
    justifyContent: 'space-around',
    gap: 6,
    flexShrink: 0,
  },
  opponentCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: 6,
    borderRadius: 10,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    minWidth: 70,
  },
  opponentName: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text)',
  },
  logBox: {
    flex: 1,
    minHeight: 60,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  logEntry: {
    fontSize: 13,
    color: 'var(--muted)',
    textAlign: 'center',
  },
  resultBanner: {
    alignSelf: 'center',
    padding: '10px 18px',
    borderRadius: 14,
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 800,
    fontSize: 14,
    textAlign: 'center',
    boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
    color: '#fff',
    flexShrink: 0,
  },
  playerArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    marginTop: 'auto',
  },
  playerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  playerName: {
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 800,
    fontSize: 14,
  },
  footer: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 'clamp(12px, 2dvh, 18px) clamp(16px, 4vw, 24px) clamp(16px, 3dvh, 22px)',
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
  },
  ctaRow: {
    display: 'flex',
    gap: 10,
  },
  cpuThinking: {
    margin: 0,
    color: 'var(--muted)',
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center',
    padding: '12px 0',
  },
}

export default Cucu
