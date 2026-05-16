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
    setShuffledRack(rack)
  }, [rack, roundIdx])

  // Quando si entra in playing, mescola.
  useEffect(() => {
    if (currentPhase === 'scramble_playing' && rack) {
      setShuffledRack((prev) => prev || rack)
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
    if (word.length < MIN_WORD_LEN) {
      setErrorFlash('too_short')
      setTimeout(() => setErrorFlash(null), 380)
      return
    }
    // Anti-doppione per giocatore.
    if (myWords.includes(word)) {
      setErrorFlash('duplicate')
      setTimeout(() => setErrorFlash(null), 380)
      return
    }
    if (!isFormable(word, rack)) {
      setErrorFlash('invalid')
      setTimeout(() => setErrorFlash(null), 380)
      return
    }
    if (!dict) {
      // Dizionario non ancora caricato — rifiuta con avviso.
      setErrorFlash('invalid')
      setTimeout(() => setErrorFlash(null), 380)
      return
    }
    if (!isInDictionary(word, dict)) {
      setErrorFlash('invalid')
      setTimeout(() => setErrorFlash(null), 380)
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

  // ── Blobby bot (solo mode) ──
  // All'inizio del round (mode=local, gioco in playing, blobby presente) precomputa
  // le parole valide dal rack e le sottomette a intervalli crescenti durante i 60s.
  const blobbyTimersRef = useRef([])
  useEffect(() => {
    // Clean previous schedule on phase/round change.
    blobbyTimersRef.current.forEach((t) => clearTimeout(t))
    blobbyTimersRef.current = []

    if (mode !== 'local') return
    if (currentPhase !== 'scramble_playing') return
    if (!dict || !rack) return
    if (!players.some((p) => p.id === 'blobby')) return

    // Precomputa tutte le parole formabili dal rack che sono nel dizionario,
    // ordinate per (lunghezza desc poi alfabetico) per scegliere le migliori.
    const candidates = []
    for (const w of dict) {
      if (w.length < MIN_WORD_LEN) continue
      if (isFormable(w, rack)) candidates.push(w)
    }
    candidates.sort((a, b) => b.length - a.length || a.localeCompare(b))

    // Difficoltà: ~70% delle parole disponibili tra le top-30, max 12 a round.
    const pool = candidates.slice(0, Math.min(40, candidates.length))
    // Shuffle leggera per non essere deterministico.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    const targetCount = Math.min(pool.length, 6 + Math.floor(Math.random() * 5)) // 6-10
    const picks = pool.slice(0, targetCount)

    // Distribuiscili nell'arco del round (lascia i primi 3s di "pensata" iniziale).
    const startMs = questionStartedAt ? new Date(questionStartedAt).getTime() : Date.now()
    const windowMs = (roundDuration - 3) * 1000
    const cumulative = []
    let lastAcceptedWords = useSession.getState().gameState?.scrambleWords?.blobby ?? []
    picks.forEach((w, i) => {
      const delay = 3000 + Math.floor((i + 0.5) * (windowMs / picks.length))
        + Math.floor((Math.random() - 0.5) * 1500)
      const elapsed = Date.now() - startMs
      const t = setTimeout(() => {
        const s = useSession.getState()
        if (s.currentPhase !== 'scramble_playing') return
        const prev = s.gameState?.scrambleWords ?? {}
        const cur = Array.isArray(prev.blobby) ? prev.blobby : []
        if (cur.includes(w)) return
        cumulative.push(w)
        const next = { ...prev, blobby: [...cur, w] }
        setGameState({ scrambleWords: next })
        lastAcceptedWords = next.blobby
      }, Math.max(0, delay - elapsed))
      blobbyTimersRef.current.push(t)
    })

    return () => {
      blobbyTimersRef.current.forEach((t) => clearTimeout(t))
      blobbyTimersRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentPhase, dict, rack, roundDuration, questionStartedAt])

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
