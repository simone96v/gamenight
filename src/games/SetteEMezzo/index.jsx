// Sette e Mezzo — variante italiana del Black Jack. Solo vs banco (MVP).
// Regole MVP:
//   - Carte 1-7: valore facciale. Figure (8 Fante, 9 Cavallo, 10 Re): ½.
//   - Sballo a >7½.
//   - Giocatore: parte con 1 carta, "Carta" pesca, "Sto" passa al banco.
//   - Banco: pesca finché total < player_total. Al pareggio il banco vince
//     (banco prevale, regola classica).
//   - Sette e mezzo "reale" (7½ con 2 carte): vittoria automatica del player.
//
// Architettura: tutta la logica gioco in questo file. Fasi gestite via useReducer.
// Lo state non passa per useSession — il gioco è 100% client-side, solo single-player.

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

// ── Logica di gioco ─────────────────────────────────────

// Valore di una carta in Sette e Mezzo: figure (8/9/10) = 0.5, numeriche = valore.
const cardValue = (c) => (c.value >= 8 ? 0.5 : c.value)

const total = (cards) => cards.reduce((sum, c) => sum + cardValue(c), 0)

const initialState = () => {
  const deck = shuffle(createDeck())
  const { dealt, rest } = draw(deck, 1)
  return {
    deck: rest,
    playerHand: dealt,
    dealerHand: [],
    phase: 'player_turn',  // player_turn | dealer_reveal | result
    result: null,          // 'real' | 'win' | 'lose' | 'tie'
    stats: { wins: 0, losses: 0 },
  }
}

const playDealer = (state) => {
  let deck = state.deck
  let dealerHand = []
  const target = total(state.playerHand)

  // Banco pesca finché il suo totale è strettamente minore del giocatore.
  // Al pareggio il banco si ferma (e vince comunque per la regola "banco prevale").
  while (total(dealerHand) < target) {
    const { dealt, rest } = draw(deck, 1)
    if (dealt.length === 0) break  // mazzo esaurito, edge case
    dealerHand = [...dealerHand, ...dealt]
    deck = rest
  }

  const dealerTot = total(dealerHand)
  let result
  if (dealerTot > 7.5) result = 'win'         // banco sballa
  else if (dealerTot >= target) result = 'lose' // banco pareggia o batte
  else result = 'win'                          // shouldn't happen ma fallback safe

  const stats = result === 'win'
    ? { ...state.stats, wins: state.stats.wins + 1 }
    : { ...state.stats, losses: state.stats.losses + 1 }

  return { ...state, deck, dealerHand, phase: 'result', result, stats }
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'PLAYER_HIT': {
      if (state.phase !== 'player_turn') return state
      const { dealt, rest } = draw(state.deck, 1)
      if (dealt.length === 0) return state
      const newHand = [...state.playerHand, ...dealt]
      const t = total(newHand)

      if (t > 7.5) {
        // Sballo → banco vince senza giocare.
        return {
          ...state,
          deck: rest,
          playerHand: newHand,
          phase: 'result',
          result: 'lose',
          stats: { ...state.stats, losses: state.stats.losses + 1 },
        }
      }

      if (t === 7.5 && newHand.length === 2) {
        // Sette e mezzo reale: vittoria immediata, no banco.
        return {
          ...state,
          deck: rest,
          playerHand: newHand,
          phase: 'result',
          result: 'real',
          stats: { ...state.stats, wins: state.stats.wins + 1 },
        }
      }

      return { ...state, deck: rest, playerHand: newHand }
    }

    case 'PLAYER_STAND': {
      if (state.phase !== 'player_turn') return state
      return playDealer(state)
    }

    case 'NEW_HAND': {
      // Conserva le stats; nuova mano = nuovo mazzo, nuova carta player.
      const deck = shuffle(createDeck())
      const { dealt, rest } = draw(deck, 1)
      return {
        ...state,
        deck: rest,
        playerHand: dealt,
        dealerHand: [],
        phase: 'player_turn',
        result: null,
      }
    }

    case 'RESTART_FULL':
      return initialState()

    default:
      return state
  }
}

// ── Componente ──────────────────────────────────────────

const SetteEMezzo = () => {
  const navigate = useNavigate()
  const C = usePlayerAccent()
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const players = useSession((s) => s.players)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const me = useMemo(
    () => players.find((p) => p.id === localPlayerId) ?? players[0],
    [players, localPlayerId]
  )

  const playerTotal = useMemo(() => total(state.playerHand), [state.playerHand])
  const dealerTotal = useMemo(() => total(state.dealerHand), [state.dealerHand])

  const handleHit = useCallback(() => dispatch({ type: 'PLAYER_HIT' }), [])
  const handleStand = useCallback(() => dispatch({ type: 'PLAYER_STAND' }), [])
  const handleNewHand = useCallback(() => dispatch({ type: 'NEW_HAND' }), [])
  const handleExit = useCallback(() => navigate('/solo/games', { replace: true }), [navigate])

  // Hotkey: Space = Carta, S = Sto, N = Nuova mano. Solo PC.
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return
      if (state.phase === 'player_turn') {
        if (e.code === 'Space') { e.preventDefault(); handleHit() }
        else if (e.key.toLowerCase() === 's') { e.preventDefault(); handleStand() }
      } else if (state.phase === 'result') {
        if (e.code === 'Space' || e.key.toLowerCase() === 'n') {
          e.preventDefault()
          handleNewHand()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.phase, handleHit, handleStand, handleNewHand])

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>}
      />

      <div style={S.body}>
        {/* Stats banner */}
        <div style={S.statsRow}>
          <span style={S.statChip}>
            <span style={S.statLabel}>Vittorie</span>
            <span style={{ ...S.statValue, color: '#10B981' }}>{state.stats.wins}</span>
          </span>
          <span style={S.statChip}>
            <span style={S.statLabel}>Sconfitte</span>
            <span style={{ ...S.statValue, color: '#EF4444' }}>{state.stats.losses}</span>
          </span>
        </div>

        {/* Banco — top */}
        <div style={S.playerArea}>
          <div style={S.areaHeader}>
            <span style={S.areaLabel}>🎩 Banco</span>
            <span style={{
              ...S.totalBadge,
              background: state.phase === 'result' || state.phase === 'dealer_reveal'
                ? (dealerTotal > 7.5 ? '#EF4444' : 'var(--text)')
                : 'transparent',
              color: state.phase === 'result' || state.phase === 'dealer_reveal' ? '#fff' : 'transparent',
            }}>
              {state.dealerHand.length > 0 ? formatTotal(dealerTotal) : '—'}
            </span>
          </div>
          <div style={S.handRow}>
            <AnimatePresence>
              {state.dealerHand.length === 0 && state.phase === 'player_turn' && (
                <CardView faceDown size="lg" />
              )}
              {state.dealerHand.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: -20, rotate: -8 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <CardView card={card} size="lg" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Risultato (centrale, sopra l'area player) */}
        <AnimatePresence>
          {state.phase === 'result' && (
            <motion.div
              key={state.result}
              initial={{ scale: 0.6, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              style={{
                ...S.resultBanner,
                background: resultBg(state.result),
                color: '#fff',
              }}
            >
              {resultText(state.result, playerTotal, dealerTotal)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Giocatore — bottom */}
        <div style={S.playerArea}>
          <div style={S.areaHeader}>
            <span style={S.areaLabel}>
              {me && <MiniBlob color={me.color} size={20} id="sm-player-mini" />}
              <span style={{ marginLeft: 6 }}>{me?.name || 'Tu'}</span>
            </span>
            <span style={{
              ...S.totalBadge,
              background: playerTotal > 7.5 ? '#EF4444' : C.accent,
              color: '#fff',
            }}>
              {formatTotal(playerTotal)}
            </span>
          </div>
          <div style={S.handRow}>
            {state.playerHand.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20, rotate: 8 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <CardView card={card} size="lg" highlight={state.phase === 'result' && state.result === 'real' && i < 2} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={S.footer}>
        {state.phase === 'player_turn' && (
          <div style={S.ctaRow}>
            <GameButton variant="secondary" icon="✋" hotkey="S" onClick={handleStand}>
              Sto
            </GameButton>
            <GameButton variant="primary" accent={C.accent} icon="🃏" hotkey="Space" onClick={handleHit}>
              Carta
            </GameButton>
          </div>
        )}
        {state.phase === 'result' && (
          <GameButton variant="primary" accent={C.accent} icon="🔁" hotkey="Space" onClick={handleNewHand}>
            Nuova mano
          </GameButton>
        )}
      </div>
    </div>
  )
}

// ── Helpers UI ──────────────────────────────────────────

const formatTotal = (n) => {
  if (n === Math.floor(n)) return String(n)
  // 0.5 → "½" se totale è semi
  if (n === 0.5) return '½'
  return `${Math.floor(n)}½`
}

const resultBg = (r) => ({
  real: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
  win: 'linear-gradient(90deg, #10B981, #34D399)',
  lose: 'linear-gradient(90deg, #EF4444, #F87171)',
  tie: 'linear-gradient(90deg, #6B7280, #9CA3AF)',
}[r] || '#6B7280')

const resultText = (r, p, d) => {
  if (r === 'real') return '✨ Sette e Mezzo REALE! Vittoria!'
  if (r === 'win') return `🏆 Hai vinto! ${formatTotal(p)} contro ${formatTotal(d)}`
  if (r === 'lose' && p > 7.5) return `💥 Sballato a ${formatTotal(p)} — banco vince`
  if (r === 'lose') return `😬 Banco vince ${formatTotal(d)} contro ${formatTotal(p)}`
  return 'Pareggio'
}


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
    padding: 'clamp(12px, 2dvh, 20px) clamp(12px, 3vw, 20px)',
    gap: 'clamp(10px, 1.5dvh, 16px)',
    overflow: 'hidden',
    color: 'var(--text)',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    flexShrink: 0,
  },
  statChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 999,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--muted)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
  },
  playerArea: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  areaHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: 'var(--text)',
  },
  areaLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 800,
    fontSize: 'clamp(14px, 1.8dvh, 17px)',
    color: 'var(--text)',
  },
  totalBadge: {
    padding: '3px 12px',
    borderRadius: 999,
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 900,
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    minWidth: 36,
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
    transition: 'background 0.2s ease',
  },
  handRow: {
    display: 'flex',
    gap: 'clamp(-30px, -6vw, -10px)',  // sovrapposizione carte
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    minHeight: 140,
  },
  resultBanner: {
    flexShrink: 0,
    padding: '10px 18px',
    borderRadius: 14,
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 800,
    fontSize: 'clamp(14px, 1.9dvh, 17px)',
    textAlign: 'center',
    boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
    alignSelf: 'center',
    maxWidth: 320,
  },
  footer: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 'clamp(12px, 2dvh, 18px) clamp(16px, 4vw, 24px) clamp(16px, 3dvh, 22px)',
    background: 'rgba(0,0,0,0.30)',
    borderTop: '1px solid rgba(255,255,255,0.10)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  ctaRow: {
    display: 'flex',
    gap: 10,
  },
}

export default SetteEMezzo
