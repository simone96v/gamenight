// Hook orchestratore di Scramble — 3 round da 60s, 7 lettere distinte per rack,
// punteggio cumulativo. Modello host-controlled (come BlobJump / EmojiQuiz).
//
// Stato condiviso (gameState):
//   scrambleSession  { roundIdx, totalRounds, roundDuration }
//   scrambleRacks    [string, string, string]     — 3 rack scelti dall'host al boot
//   scrambleWords    { [playerId]: [word,...] }   — parole accettate nel round corrente
//   scrambleScores   { [playerId]: cumulative }
//   scrambleRoundResults { [playerId]: roundPoints } (per la schermata results)
//   scrambleWordCounts { [playerId]: number }     — live counter avversario
//
// Phase machine: scramble_lobby → scramble_countdown → scramble_playing
//                → scramble_results → scramble_playing/... → scramble_final

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '../../stores/useSession'
import { useServerTimer } from '../../hooks/useServerTimer'
import { rpcCastVote } from '../../lib/room'
import { haptic } from '../../utils/haptic'
import { pickRoundRacks, shuffleRack } from './data/racks'
import { isFormable, isInDictionary, loadDictionary, scoreWord } from './data/dictionary'

const TOTAL_ROUNDS = 3
const ROUND_DURATION_S = 60
const RACK_LEN = 7
const MIN_WORD_LEN = 3

export const useScramble = () => {
  const players = useSession((s) => s.players)
  const mode = useSession((s) => s.mode)
  const isHost = useSession((s) => s.isHost)
  const localPlayerId = useSession((s) => s.localPlayerId)
  const currentPhase = useSession((s) => s.currentPhase)
  const gameState = useSession((s) => s.gameState)
  const questionStartedAt = useSession((s) => s.questionStartedAt)
  const roomCode = useSession((s) => s.roomCode)
  const setGameState = useSession((s) => s.setGameState)
  const setPhase = useSession((s) => s.setPhase)
  const setPhaseWithTimer = useSession((s) => s.setPhaseWithTimer)

  const isOnline = mode === 'online'

  const session = gameState?.scrambleSession ?? null
  const roundIdx = session?.roundIdx ?? 0
  const totalRounds = session?.totalRounds ?? TOTAL_ROUNDS
  const roundDuration = session?.roundDuration ?? ROUND_DURATION_S
  const hasMoreRounds = roundIdx + 1 < totalRounds

  const racks = useMemo(() => gameState?.scrambleRacks ?? [], [gameState?.scrambleRacks])
  const rack = racks[roundIdx] ?? ''

  const scrambleWords = useMemo(() => gameState?.scrambleWords ?? {}, [gameState?.scrambleWords])
  const scrambleScores = useMemo(() => gameState?.scrambleScores ?? {}, [gameState?.scrambleScores])
  const scrambleRoundResults = useMemo(
    () => gameState?.scrambleRoundResults ?? {},
    [gameState?.scrambleRoundResults],
  )
  const scrambleWordCounts = useMemo(
    () => gameState?.scrambleWordCounts ?? {},
    [gameState?.scrambleWordCounts],
  )

  const myWords = useMemo(
    () => scrambleWords[localPlayerId] ?? [],
    [scrambleWords, localPlayerId],
  )

  // Timer server-derived attivo solo durante playing.
  const timerActive = currentPhase === 'scramble_playing'
  const { timeLeft, isExpired } = useServerTimer(
    timerActive ? questionStartedAt : null,
    roundDuration,
  )

  // ── Dizionario IT (lazy load) ──
  const [dict, setDict] = useState(null)
  const [dictError, setDictError] = useState(null)
  useEffect(() => {
    let cancelled = false
    loadDictionary()
      .then((d) => { if (!cancelled) setDict(d) })
      .catch((e) => { if (!cancelled) setDictError(e) })
    return () => { cancelled = true }
  }, [])

  // ── UI locale ──
  const [tray, setTray] = useState([])              // indici delle tessere selezionate
  const [shuffledRack, setShuffledRack] = useState('')
  const [errorFlash, setErrorFlash] = useState(null) // 'duplicate' | 'invalid' | 'too_short'

  // Quando cambia il rack del round, resetta tray + shuffle iniziale.
  useEffect(() => {
    if (!rack) return
    setTray([])
    setShuffledRack(shuffleRack(rack))
  }, [rack, roundIdx])

  // Quando si entra in playing, mescola.
  useEffect(() => {
    if (currentPhase === 'scramble_playing' && rack) {
      setShuffledRack((prev) => prev || shuffleRack(rack))
      setTray([])
    }
  }, [currentPhase, rack])

  // Parola corrente formata dalle tessere selezionate (in ordine di tap).
  const currentWord = useMemo(
    () => tray.map((i) => shuffledRack[i] || '').join(''),
    [tray, shuffledRack],
  )

  const usedSet = useMemo(() => new Set(tray), [tray])

  // ── Azioni: tessere ──
  const tapTile = useCallback((idx) => {
    if (currentPhase !== 'scramble_playing') return
    if (isExpired) return
    if (usedSet.has(idx)) return
    if (tray.length >= RACK_LEN) return
    haptic.tick()
    setTray((t) => [...t, idx])
  }, [currentPhase, isExpired, usedSet, tray.length])

  const backspace = useCallback(() => {
    if (currentPhase !== 'scramble_playing') return
    if (tray.length === 0) return
    haptic.tick()
    setTray((t) => t.slice(0, -1))
  }, [currentPhase, tray.length])

  const clearTray = useCallback(() => {
    if (tray.length === 0) return
    haptic.tick()
    setTray([])
  }, [tray.length])

  const reshuffle = useCallback(() => {
    if (currentPhase !== 'scramble_playing') return
    if (isExpired) return
    haptic.tick()
    setShuffledRack((r) => shuffleRack(r || rack))
    setTray([])
  }, [currentPhase, isExpired, rack])

  // ── Submit parola ──
  const submitWord = useCallback(() => {
    if (currentPhase !== 'scramble_playing') return
    if (isExpired) return
    const word = currentWord.toUpperCase()
    const rejectWith = (kind) => {
      setErrorFlash(kind)
      setTimeout(() => setErrorFlash(null), 380)
      setTray([])
      setShuffledRack((r) => shuffleRack(r || rack))
    }
    if (word.length < MIN_WORD_LEN) {
      rejectWith('too_short')
      return
    }
    // Anti-doppione per giocatore.
    if (myWords.includes(word)) {
      rejectWith('duplicate')
      return
    }
    if (!isFormable(word, rack)) {
      rejectWith('invalid')
      return
    }
    if (!dict) {
      // Dizionario non ancora caricato — rifiuta con avviso.
      rejectWith('invalid')
      return
    }
    if (!isInDictionary(word, dict)) {
      rejectWith('invalid')
      return
    }

    // Accettata.
    const isPangram = word.length === RACK_LEN
    if (isPangram) haptic.heavy()
    else haptic.medium()

    const nextWords = [...myWords, word]
    if (isOnline) {
      rpcCastVote(roomCode, 'scrambleWords', localPlayerId, nextWords)
        .catch((e) => console.error('[Scramble] cast scrambleWords', e))
      rpcCastVote(roomCode, 'scrambleWordCounts', localPlayerId, nextWords.length)
        .catch(() => {})
    } else {
      const prev = useSession.getState().gameState?.scrambleWords ?? {}
      setGameState({
        scrambleWords: { ...prev, [localPlayerId]: nextWords },
      })
    }
    setTray([])
  }, [
    currentPhase, isExpired, currentWord, myWords, rack, dict,
    isOnline, roomCode, localPlayerId, setGameState,
  ])

  // ── Host: countdown → playing ──
  const countdownFiredRef = useRef(false)
  useEffect(() => {
    if (currentPhase !== 'scramble_countdown') {
      countdownFiredRef.current = false
      return
    }
    if (!isHost || countdownFiredRef.current) return
    const startMs = questionStartedAt ? new Date(questionStartedAt).getTime() : Date.now()
    const elapsed = (Date.now() - startMs) / 1000
    const delay = Math.max(0, 4 - elapsed) * 1000
    const t = setTimeout(() => {
      if (countdownFiredRef.current) return
      countdownFiredRef.current = true
      setPhaseWithTimer('scramble_playing')
    }, delay)
    return () => clearTimeout(t)
  }, [currentPhase, isHost, questionStartedAt, setPhaseWithTimer])

  // ── Host: timer scaduto → calcola punteggi del round → results ──
  const resultsFiredRef = useRef(false)
  const resultsTimeoutRef = useRef(null)
  useEffect(() => {
    if (currentPhase !== 'scramble_playing') {
      resultsFiredRef.current = false
      if (resultsTimeoutRef.current) {
        clearTimeout(resultsTimeoutRef.current)
        resultsTimeoutRef.current = null
      }
      return
    }
    if (!isHost || !isExpired || resultsFiredRef.current) return
    if (!dict) return // serve il dizionario per riconvalidare
    resultsFiredRef.current = true

    // Lascia 800ms per ultime parole in volo dai client.
    resultsTimeoutRef.current = setTimeout(() => {
      resultsTimeoutRef.current = null
      const s = useSession.getState()
      const remoteWords = s.gameState?.scrambleWords ?? {}
      const cumulative = { ...(s.gameState?.scrambleScores ?? {}) }
      const roundResults = {}
      const trustedWords = {}
      s.players.forEach((p) => {
        const list = Array.isArray(remoteWords[p.id]) ? remoteWords[p.id] : []
        const seen = new Set()
        const trusted = []
        let roundPts = 0
        for (const raw of list) {
          if (typeof raw !== 'string') continue
          const w = raw.toUpperCase()
          if (w.length < MIN_WORD_LEN) continue
          if (seen.has(w)) continue
          if (!isFormable(w, rack)) continue
          if (!dict.has(w)) continue
          seen.add(w)
          trusted.push(w)
          roundPts += scoreWord(w, RACK_LEN)
        }
        trustedWords[p.id] = trusted
        roundResults[p.id] = roundPts
        cumulative[p.id] = (cumulative[p.id] ?? 0) + roundPts
      })

      // Aggiorna players[].score per la classifica.
      const updatedPlayers = s.players.map((p) => ({
        ...p,
        score: cumulative[p.id] ?? 0,
      }))
      useSession.setState({ players: updatedPlayers })

      setGameState({
        scrambleWords: trustedWords,
        scrambleScores: cumulative,
        scrambleRoundResults: roundResults,
      })
      setPhase('scramble_results')
    }, 800)
  }, [currentPhase, isHost, isExpired, dict, rack, setGameState, setPhase])

  // Cleanup unmount.
  useEffect(() => () => {
    if (resultsTimeoutRef.current) clearTimeout(resultsTimeoutRef.current)
  }, [])

  // ── Host: avanza a prossimo round o final ──
  const [advancing, setAdvancing] = useState(false)
  useEffect(() => { setAdvancing(false) }, [currentPhase])

  const hostAdvance = useCallback(() => {
    if (!isHost || advancing) return
    if (currentPhase !== 'scramble_results') return
    setAdvancing(true)
    const s = useSession.getState()
    const sess = s.gameState?.scrambleSession ?? { roundIdx: 0, totalRounds: TOTAL_ROUNDS, roundDuration: ROUND_DURATION_S }
    const nextIdx = (sess.roundIdx ?? 0) + 1
    if (nextIdx >= (sess.totalRounds ?? TOTAL_ROUNDS)) {
      setGameState({ scrambleSession: { ...sess, roundIdx: nextIdx } })
      setPhase('scramble_final')
    } else {
      setGameState({
        scrambleSession: { ...sess, roundIdx: nextIdx },
        scrambleWords: {},
        scrambleWordCounts: {},
        scrambleRoundResults: {},
      })
      setPhaseWithTimer('scramble_countdown')
    }
  }, [isHost, advancing, currentPhase, setGameState, setPhase, setPhaseWithTimer])

  return {
    // sync
    isOnline,
    isHost,
    localPlayerId,
    players,
    currentPhase,
    questionStartedAt,

    // session / round
    roundIdx,
    totalRounds,
    roundDuration,
    hasMoreRounds,

    // gameplay data
    rack,
    shuffledRack,
    tray,
    currentWord,
    usedSet,
    myWords,
    scrambleWords,
    scrambleScores,
    scrambleRoundResults,
    scrambleWordCounts,

    // timer
    timeLeft,
    isExpired,

    // dict
    dictLoading: !dict && !dictError,
    dictError,

    // ui state
    errorFlash,
    advancing,

    // actions
    tapTile,
    backspace,
    clearTray,
    reshuffle,
    submitWord,
    hostAdvance,
  }
}

export const SCRAMBLE_CONSTANTS = {
  TOTAL_ROUNDS,
  ROUND_DURATION_S,
  RACK_LEN,
  MIN_WORD_LEN,
}
