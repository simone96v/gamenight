// Hook orchestratore di Emoji Quiz.
// Branch a runtime:
//   - mode === 'local' → single-player vs bot Blobby (client-side)
//   - mode === 'online' → host-client model, sincronizzato via Realtime
//
// In online lo "screen" non è uno stato locale ma deriva da `currentPhase`:
//   emojiquiz_countdown → countdown 3-2-1
//   emojiquiz_playing   → input + emoji
//   emojiquiz_results   → outcome del round
//   emojiquiz_final     → game over

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { useSession } from '../../stores/useSession'
import { pickDeck } from '../../data/emojiQuizPuzzles'
import { isCorrect } from './matching'
import { basePoints, comboMult, computeOppTime, round10 } from './scoring'
import { TOTAL_ROUNDS, ROUND_MS } from './config'
import { makeSound } from './sound'

/* ─────────────────────────────────────────────────────────────────────────
   SINGLE-PLAYER (mode === 'local')
   Reducer + refs + bot. Identico a Fase 2.
   ─────────────────────────────────────────────────────────────────────── */

const SCREENS = {
  HOME: 'home',
  PLAYING: 'playing',
  ROUND_END: 'roundEnd',
  GAME_END: 'gameEnd',
}

const initialLocal = {
  screen: SCREENS.HOME,
  deck: [],
  roundIdx: 0,
  pScore: 0,
  oScore: 0,
  guess: '',
  hint: false,
  timeLeft: ROUND_MS,
  roundResult: null,
  roundLog: [],
  redFlash: false,
  soundOn: true,
}

function localReducer(s, a) {
  switch (a.type) {
    case 'START': return { ...initialLocal, soundOn: s.soundOn, deck: a.deck, screen: SCREENS.PLAYING }
    case 'ENTER_ROUND': return { ...s, guess: '', hint: false, roundResult: null, timeLeft: ROUND_MS, redFlash: false }
    case 'SET_GUESS': return { ...s, guess: a.value }
    case 'WRONG': return { ...s, redFlash: true, guess: '' }
    case 'CLEAR_FLASH': return { ...s, redFlash: false }
    case 'TICK': return { ...s, timeLeft: a.timeLeft }
    case 'USE_HINT': return { ...s, hint: true }
    case 'ROUND_END': return {
      ...s, screen: SCREENS.ROUND_END,
      pScore: a.pScore, oScore: a.oScore,
      roundResult: a.result, roundLog: [...s.roundLog, a.logEntry],
    }
    case 'NEXT_ROUND': return { ...s, screen: SCREENS.PLAYING, roundIdx: s.roundIdx + 1 }
    case 'GAME_END': return { ...s, screen: SCREENS.GAME_END }
    case 'TOGGLE_SOUND': return { ...s, soundOn: !s.soundOn }
    default: return s
  }
}

const useLocalEmojiQuiz = () => {
  const [state, dispatch] = useReducer(localReducer, initialLocal)

  const pScoreRef = useRef(0)
  const oScoreRef = useRef(0)
  const pStreakRef = useRef(0)
  const oStreakRef = useRef(0)
  const startRef = useRef(0)
  const oppTimeRef = useRef(Infinity)
  const roundOverRef = useRef(false)
  const hintRef = useRef(false)
  const ivRef = useRef(null)
  const puzzleRef = useRef(null)
  const inputRef = useRef(null)
  const inputWrapRef = useRef(null)
  const sndRef = useRef(null)
  const soundOnRef = useRef(true)

  useEffect(() => { soundOnRef.current = state.soundOn }, [state.soundOn])

  const snd = useCallback(() => {
    if (!sndRef.current) sndRef.current = makeSound()
    return sndRef.current
  }, [])
  const play = useCallback((name) => {
    if (!soundOnRef.current) return
    try { snd()[name]() } catch { /* noop */ }
  }, [snd])

  const finishRound = useCallback((outcome) => {
    if (roundOverRef.current) return
    roundOverRef.current = true
    if (ivRef.current) { clearInterval(ivRef.current); ivRef.current = null }
    const puzzle = puzzleRef.current
    let res, logEntry
    if (outcome === 'win') {
      const elapsed = performance.now() - startRef.current
      const streak = pStreakRef.current + 1
      const mult = comboMult(streak)
      const pts = round10(basePoints(elapsed, hintRef.current) * mult)
      pScoreRef.current += pts
      pStreakRef.current = streak
      oStreakRef.current = 0
      res = { outcome, puzzle, pPts: pts, oPts: 0, combo: streak >= 2 ? mult : null }
      logEntry = 'win'
      play('correct')
    } else if (outcome === 'lose') {
      const streak = oStreakRef.current + 1
      const mult = comboMult(streak)
      const pts = round10(basePoints(oppTimeRef.current, false) * mult)
      oScoreRef.current += pts
      oStreakRef.current = streak
      pStreakRef.current = 0
      res = { outcome, puzzle, pPts: 0, oPts: pts, oCombo: streak >= 2 ? mult : null }
      logEntry = 'lose'
      play('oppGot')
    } else {
      pStreakRef.current = 0
      oStreakRef.current = 0
      res = { outcome: 'timeout', puzzle, pPts: 0, oPts: 0 }
      logEntry = 'tie'
    }
    dispatch({ type: 'ROUND_END', pScore: pScoreRef.current, oScore: oScoreRef.current, result: res, logEntry })
  }, [play])

  useEffect(() => {
    if (state.screen !== SCREENS.PLAYING) return
    const puzzle = state.deck[state.roundIdx]
    if (!puzzle) return
    puzzleRef.current = puzzle
    roundOverRef.current = false
    hintRef.current = false
    startRef.current = performance.now()
    oppTimeRef.current = computeOppTime(puzzle, state.roundIdx)
    dispatch({ type: 'ENTER_ROUND' })
    const focusT = setTimeout(() => inputRef.current?.focus(), 60)
    const iv = setInterval(() => {
      const el = performance.now() - startRef.current
      dispatch({ type: 'TICK', timeLeft: Math.max(0, ROUND_MS - el) })
      if (roundOverRef.current) return
      if (el >= oppTimeRef.current) finishRound('lose')
      else if (el >= ROUND_MS) finishRound('timeout')
    }, 60)
    ivRef.current = iv
    return () => { clearInterval(iv); clearTimeout(focusT) }
  }, [state.screen, state.roundIdx, state.deck, finishRound])

  const advance = useCallback(() => {
    if (state.roundIdx >= TOTAL_ROUNDS - 1) {
      if (pScoreRef.current > oScoreRef.current) play('win')
      dispatch({ type: 'GAME_END' })
    } else {
      dispatch({ type: 'NEXT_ROUND' })
    }
  }, [state.roundIdx, play])

  useEffect(() => {
    if (state.screen !== SCREENS.ROUND_END) return
    const t = setTimeout(() => advance(), 3200)
    return () => clearTimeout(t)
  }, [state.screen, advance])

  useEffect(() => {
    if (!state.redFlash) return
    const t = setTimeout(() => dispatch({ type: 'CLEAR_FLASH' }), 380)
    return () => clearTimeout(t)
  }, [state.redFlash])

  const startGame = useCallback(() => {
    pScoreRef.current = 0; oScoreRef.current = 0
    pStreakRef.current = 0; oStreakRef.current = 0
    const deck = pickDeck(TOTAL_ROUNDS)
    snd().ensure()
    dispatch({ type: 'START', deck })
  }, [snd])

  const submitGuess = useCallback(() => {
    if (roundOverRef.current || !state.guess.trim()) return
    if (isCorrect(state.guess, puzzleRef.current)) {
      finishRound('win')
    } else {
      play('wrong')
      dispatch({ type: 'WRONG' })
      inputWrapRef.current?.animate?.(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
        { duration: 380, easing: 'ease-in-out' },
      )
      inputRef.current?.focus()
    }
  }, [state.guess, finishRound, play])

  const useHint = useCallback(() => {
    if (roundOverRef.current || state.hint) return
    hintRef.current = true
    dispatch({ type: 'USE_HINT' })
  }, [state.hint])

  const toggleSound = useCallback(() => dispatch({ type: 'TOGGLE_SOUND' }), [])
  const setGuess = useCallback((value) => dispatch({ type: 'SET_GUESS', value }), [])

  const puzzle = state.deck[state.roundIdx]
  const timePct = Math.max(0, Math.min(100, (state.timeLeft / ROUND_MS) * 100))

  return {
    isOnline: false,
    screen: state.screen,
    puzzle,
    roundIdx: state.roundIdx,
    pScore: state.pScore, oScore: state.oScore,
    playerCombo: pStreakRef.current >= 2,
    oppCombo: oStreakRef.current >= 2,
    timePct, timeLeft: state.timeLeft,
    guess: state.guess, hint: state.hint, redFlash: state.redFlash,
    roundResult: state.roundResult, roundLog: state.roundLog,
    soundOn: state.soundOn,
    inputRef, inputWrapRef,
    startGame, submitGuess, setGuess, useHint, advance, toggleSound,
    handleCountdownComplete: () => {}, // no-op in local mode
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   ONLINE (mode === 'online') — host-client model.
   - Host orchestra: pubblica eqDeck (con answers), gestisce le transizioni
     di fase, valida i guess dei client, sceglie il winner per timeMs.
   - Client: valida il guess localmente (ha eqDeck nel gameState), su correct
     fa castVote('eqGuesses', { round, timeMs }). Riceve risultato via Realtime.
   ─────────────────────────────────────────────────────────────────────── */

const REVEAL_DELAY_MS = 3200

const useOnlineEmojiQuiz = () => {
  const players = useSession((s) => s.players)
  const isHost = useSession((s) => s.isHost)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const currentPhase = useSession((s) => s.currentPhase)
  const gameState = useSession((s) => s.gameState)
  const questionStartedAt = useSession((s) => s.questionStartedAt)
  const setGameState = useSession((s) => s.setGameState)
  const setPhase = useSession((s) => s.setPhase)
  const setPhaseWithTimer = useSession((s) => s.setPhaseWithTimer)
  const castVote = useSession((s) => s.castVote)

  const eqDeck = useMemo(() => gameState?.eqDeck ?? [], [gameState?.eqDeck])
  const roundIdx = gameState?.eqRoundIdx ?? 0
  const eqGuesses = useMemo(() => gameState?.eqGuesses ?? {}, [gameState?.eqGuesses])
  const eqHintUsed = useMemo(() => gameState?.eqHintUsed ?? {}, [gameState?.eqHintUsed])
  const eqRoundResult = gameState?.eqRoundResult ?? null
  const eqScores = useMemo(() => gameState?.eqScores ?? {}, [gameState?.eqScores])
  const eqStreaks = useMemo(() => gameState?.eqStreaks ?? {}, [gameState?.eqStreaks])
  const eqRoundLog = useMemo(() => gameState?.eqRoundLog ?? [], [gameState?.eqRoundLog])

  const puzzle = eqDeck[roundIdx]

  // ── Timer locale derivato da questionStartedAt (round start) ──
  const [, forceTick] = useReducer((x) => x + 1, 0)
  useEffect(() => {
    if (currentPhase !== 'emojiquiz_playing') return
    const iv = setInterval(forceTick, 80)
    return () => clearInterval(iv)
  }, [currentPhase, questionStartedAt])

  const startMs = questionStartedAt ? new Date(questionStartedAt).getTime() : 0
  const elapsed = startMs ? Math.max(0, Date.now() - startMs) : 0
  const timeLeft = Math.max(0, ROUND_MS - elapsed)
  const timePct = Math.max(0, Math.min(100, (timeLeft / ROUND_MS) * 100))

  // ── Stato locale UI per il giocatore corrente ──
  const [uiState, uiDispatch] = useReducer(
    (s, a) => {
      switch (a.type) {
        case 'RESET_ROUND': return { guess: '', hint: false, redFlash: false, submitted: false }
        case 'SET_GUESS': return { ...s, guess: a.value }
        case 'WRONG': return { ...s, redFlash: true, guess: '' }
        case 'CLEAR_FLASH': return { ...s, redFlash: false }
        case 'USE_HINT': return { ...s, hint: true }
        case 'SUBMITTED': return { ...s, submitted: true }
        case 'TOGGLE_SOUND': return { ...s, soundOn: !s.soundOn }
        default: return s
      }
    },
    { guess: '', hint: false, redFlash: false, submitted: false, soundOn: true },
  )

  const inputRef = useRef(null)
  const inputWrapRef = useRef(null)
  const sndRef = useRef(null)
  const soundOnRef = useRef(true)
  useEffect(() => { soundOnRef.current = uiState.soundOn }, [uiState.soundOn])

  const snd = useCallback(() => {
    if (!sndRef.current) sndRef.current = makeSound()
    return sndRef.current
  }, [])
  const play = useCallback((name) => {
    if (!soundOnRef.current) return
    try { snd()[name]() } catch { /* noop */ }
  }, [snd])

  // Reset UI quando entriamo in playing
  useEffect(() => {
    if (currentPhase === 'emojiquiz_playing') {
      uiDispatch({ type: 'RESET_ROUND' })
      const t = setTimeout(() => inputRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [currentPhase, roundIdx])

  // Flash rosso auto-clear
  useEffect(() => {
    if (!uiState.redFlash) return
    const t = setTimeout(() => uiDispatch({ type: 'CLEAR_FLASH' }), 380)
    return () => clearTimeout(t)
  }, [uiState.redFlash])

  // ── Actions ──
  const setGuess = useCallback((value) => uiDispatch({ type: 'SET_GUESS', value }), [])
  const toggleSound = useCallback(() => uiDispatch({ type: 'TOGGLE_SOUND' }), [])

  const useHint = useCallback(() => {
    if (uiState.hint || uiState.submitted) return
    uiDispatch({ type: 'USE_HINT' })
    // notifica all'host (per scoring)
    castVote('eqHintUsed', { round: roundIdx, used: true })
  }, [uiState.hint, uiState.submitted, roundIdx, castVote])

  const submitGuess = useCallback(() => {
    if (uiState.submitted || !uiState.guess.trim() || !puzzle) return
    if (currentPhase !== 'emojiquiz_playing') return
    if (isCorrect(uiState.guess, puzzle)) {
      // Correct! Comunica all'host (ultimo guess vince con timeMs minore).
      const timeMs = Math.round(elapsed)
      uiDispatch({ type: 'SUBMITTED' })
      play('correct')
      castVote('eqGuesses', { round: roundIdx, timeMs })
    } else {
      play('wrong')
      uiDispatch({ type: 'WRONG' })
      inputWrapRef.current?.animate?.(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
        { duration: 380, easing: 'ease-in-out' },
      )
      inputRef.current?.focus()
    }
  }, [uiState.submitted, uiState.guess, puzzle, currentPhase, elapsed, roundIdx, castVote, play])

  // ── HOST: orchestrazione ──
  // 1) Countdown → playing è guidato dall'onComplete di CountdownOverlay
  //    (chiamato dal componente quando i 3-2-1-VIA! finiscono visivamente).
  //    Lo expose come callback in `handleCountdownComplete` sotto.
  const countdownFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'emojiquiz_countdown') {
      countdownFiredRef.current = false
    }
  }, [currentPhase])

  const handleCountdownComplete = useCallback(() => {
    if (!isHost || countdownFiredRef.current) return
    if (currentPhase !== 'emojiquiz_countdown') return
    countdownFiredRef.current = true
    setPhaseWithTimer('emojiquiz_playing')
  }, [isHost, currentPhase, setPhaseWithTimer])

  // 2) Durante playing: l'host monitora eqGuesses + timer.
  //    Quando tutti hanno risposto correttamente, O il timer scade, chiude il round.
  const roundClosedRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'emojiquiz_playing') {
      roundClosedRef.current = false
      return
    }
    if (!isHost || roundClosedRef.current || !puzzle) return

    // Guess validi per questo round (per evitare di leggere guess vecchi).
    const validGuesses = Object.entries(eqGuesses).filter(
      ([, g]) => g && g.round === roundIdx,
    )
    const totalPlayers = players.length
    const allAnswered = totalPlayers > 0 && validGuesses.length >= totalPlayers
    const timedOut = elapsed >= ROUND_MS

    if (!allAnswered && !timedOut) return

    roundClosedRef.current = true

    // Winner = guess corretto con timeMs minore. Tie → random.
    let winnerId = null
    if (validGuesses.length > 0) {
      const sorted = validGuesses.sort(([, a], [, b]) => a.timeMs - b.timeMs)
      const minTime = sorted[0][1].timeMs
      const tied = sorted.filter(([, g]) => g.timeMs === minTime)
      winnerId = tied[Math.floor(Math.random() * tied.length)][0]
    }

    // Calcola punti.
    const hintUsedThisRound = eqHintUsed[winnerId]?.round === roundIdx && eqHintUsed[winnerId]?.used
    const prevStreaks = { ...eqStreaks }
    const newStreaks = { ...eqStreaks }
    const points = {}
    if (winnerId) {
      const winTime = eqGuesses[winnerId].timeMs
      const streak = (prevStreaks[winnerId] ?? 0) + 1
      const mult = comboMult(streak)
      const pts = round10(basePoints(winTime, hintUsedThisRound) * mult)
      points[winnerId] = pts
      newStreaks[winnerId] = streak
      // Reset streak degli altri.
      players.forEach((p) => {
        if (p.id !== winnerId) newStreaks[p.id] = 0
      })
    } else {
      // Timeout senza winner → reset streak di tutti.
      players.forEach((p) => { newStreaks[p.id] = 0 })
    }

    // Accumula score totali.
    const newScores = { ...eqScores }
    Object.entries(points).forEach(([pid, pts]) => {
      newScores[pid] = (newScores[pid] ?? 0) + pts
    })

    // Round log entry (dal punto di vista del local player).
    const logEntry = winnerId ? (winnerId === localPlayerId ? 'win' : 'lose') : 'tie'

    const result = {
      round: roundIdx,
      winnerId,
      winnerName: winnerId ? players.find((p) => p.id === winnerId)?.name : null,
      points,
      answerTitle: puzzle.title,
      answerEmoji: puzzle.emoji,
      answerCategory: puzzle.category,
      mult: winnerId ? (comboMult(newStreaks[winnerId]) >= 1.2 ? comboMult(newStreaks[winnerId]) : null) : null,
    }

    setGameState({
      eqRoundResult: result,
      eqScores: newScores,
      eqStreaks: newStreaks,
      eqRoundLog: [...eqRoundLog, logEntry],
    })
    setPhase('emojiquiz_results')
  }, [
    currentPhase, isHost, puzzle, eqGuesses, eqHintUsed, eqScores, eqStreaks, eqRoundLog,
    players, roundIdx, elapsed, localPlayerId, setGameState, setPhase,
  ])

  // 3) Su results: dopo REVEAL_DELAY_MS l'host avanza.
  const advanceFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'emojiquiz_results') {
      advanceFiredRef.current = false
      return
    }
    if (!isHost || advanceFiredRef.current) return
    advanceFiredRef.current = true
    const t = setTimeout(() => hostAdvance(), REVEAL_DELAY_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, isHost])

  const hostAdvance = useCallback(() => {
    const s = useSession.getState()
    const curIdx = s.gameState?.eqRoundIdx ?? 0
    const deck = s.gameState?.eqDeck ?? []
    const nextIdx = curIdx + 1
    if (nextIdx >= deck.length) {
      // Aggiorna anche players[].score per coerenza con altri giochi.
      const totals = s.gameState?.eqScores ?? {}
      const updatedPlayers = (s.players || []).map((p) => ({ ...p, score: totals[p.id] ?? 0 }))
      useSession.setState({ players: updatedPlayers })
      setPhase('emojiquiz_final')
    } else {
      setGameState({
        eqRoundIdx: nextIdx,
        eqGuesses: {},
        eqRoundResult: null,
      })
      setPhaseWithTimer('emojiquiz_playing')
    }
  }, [setGameState, setPhase, setPhaseWithTimer])

  // ── Outputs ──
  const localPlayer = players.find((p) => p.id === localPlayerId)
  const localScore = eqScores[localPlayerId] ?? 0
  // "Opponent" = player con score più alto fra gli altri (per la barra Tu vs Leader).
  const otherPlayers = players.filter((p) => p.id !== localPlayerId)
  const leader = otherPlayers
    .map((p) => ({ ...p, score: eqScores[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score)[0] ?? null

  // Round result mappato al formato che si aspetta RoundEnd (compatibile col local).
  const roundResultForLocal = eqRoundResult ? {
    outcome: eqRoundResult.winnerId === localPlayerId ? 'win' : eqRoundResult.winnerId ? 'lose' : 'timeout',
    puzzle: {
      title: eqRoundResult.answerTitle,
      emoji: eqRoundResult.answerEmoji,
      category: eqRoundResult.answerCategory,
    },
    pPts: eqRoundResult.points?.[localPlayerId] ?? 0,
    oPts: eqRoundResult.winnerId && eqRoundResult.winnerId !== localPlayerId
      ? (eqRoundResult.points?.[eqRoundResult.winnerId] ?? 0)
      : 0,
    winnerName: eqRoundResult.winnerName,
    combo: eqRoundResult.winnerId === localPlayerId ? eqRoundResult.mult : null,
    oCombo: eqRoundResult.winnerId && eqRoundResult.winnerId !== localPlayerId ? eqRoundResult.mult : null,
  } : null

  // Mappa currentPhase → screen per coerenza col local API.
  const screen = (() => {
    switch (currentPhase) {
      case 'emojiquiz_countdown': return 'countdown'
      case 'emojiquiz_playing': return SCREENS.PLAYING
      case 'emojiquiz_results': return SCREENS.ROUND_END
      case 'emojiquiz_final': return SCREENS.GAME_END
      default: return 'loading'
    }
  })()

  return {
    isOnline: true,
    isHost,
    screen,
    puzzle,
    roundIdx,
    deckLen: eqDeck.length,
    pScore: localScore,
    oScore: leader?.score ?? 0,
    pName: localPlayer?.name ?? 'Tu',
    oName: leader?.name ?? '...',
    pColor: localPlayer?.color ?? 'var(--eq-lime)',
    oColor: leader?.color ?? 'var(--eq-pink)',
    playerCombo: (eqStreaks[localPlayerId] ?? 0) >= 2,
    oppCombo: leader ? (eqStreaks[leader.id] ?? 0) >= 2 : false,
    players,
    eqScores,
    eqRoundLog,
    timePct, timeLeft,
    guess: uiState.guess, hint: uiState.hint, redFlash: uiState.redFlash,
    submitted: uiState.submitted,
    roundResult: roundResultForLocal,
    eqRoundResult,
    roundLog: eqRoundLog,
    soundOn: uiState.soundOn,
    inputRef, inputWrapRef,
    submitGuess, setGuess, useHint, toggleSound,
    // Callback per il CountdownOverlay: host transiziona a playing.
    handleCountdownComplete,
    // Le actions di lifecycle (start, advance) sono solo per local;
    // in online vengono fatte dalla lobby (start) e dall'host effect (advance).
    advance: () => {}, // no-op (auto-advance via host effect)
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Public hook — sceglie il branch.
   ─────────────────────────────────────────────────────────────────────── */

export const useEmojiQuiz = () => {
  const mode = useSession((st) => st.mode)
  const isOnline = mode === 'online'
  // Hook condizionali: useLocal*** è chiamato solo se NON online, e viceversa.
  // React vuole sempre lo stesso ordine — quindi chiamo entrambi e ignoro l'altro?
  // No: meglio chiamare solo quello giusto. Per farlo, ramifico il componente
  // a livello superiore (richiama solo uno dei due dentro un componente wrapper).
  // Qui: chiamo entrambi e ritorno quello attivo, lasciando l'altro come dead state.
  // Va bene perché entrambi sono hooks pure (nessun side-effect costoso quando inattivi).
  const local = useLocalEmojiQuiz()
  const online = useOnlineEmojiQuiz()
  return isOnline ? online : local
}

export { SCREENS }
