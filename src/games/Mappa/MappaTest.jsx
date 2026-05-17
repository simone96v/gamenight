import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import MappaQuestion from './components/MappaQuestion'
import MappaReveal from './components/MappaReveal'
import GameLeaderboard from '../../components/GameLeaderboard'
import { haversine, calcScore } from './geo'
import questions from './data/mappa.json'

const TIMER = 30
const pool = questions.questions

const MappaTest = () => {
  const [qIdx, setQIdx] = useState(0)
  const pinRef = useRef(null)
  const [pin, _setPin] = useState(null)
  const setPin = (p) => { pinRef.current = p; _setPin(p) }
  const [confirmed, setConfirmed] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [final, setFinal] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TIMER)
  const [expired, setExpired] = useState(false)
  const [score, setScore] = useState(0)
  const timerKeyRef = useRef(0)

  const q = pool[qIdx]

  useEffect(() => {
    window.__testPlacePin = (lat, lng) => setPin({ lat, lng })
    window.__testConfirm = () => {
      const p = pinRef.current
      if (p) handleConfirm()
    }
    window.__testFinal = () => { setScore(842); setFinal(true) }
    return () => { delete window.__testPlacePin; delete window.__testConfirm; delete window.__testFinal }
  })

  useEffect(() => {
    if (confirmed || reveal || final) return
    const start = Date.now()
    let raf
    const tick = () => {
      const rem = Math.max(0, TIMER - (Date.now() - start) / 1000)
      setTimeLeft(Math.ceil(rem))
      if (rem <= 0) {
        setExpired(true)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [timerKeyRef.current]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!expired || reveal || confirmed) return
    setConfirmed(true)
  }, [expired, reveal, confirmed])

  useEffect(() => {
    if (!confirmed || reveal || final) return
    const t = setTimeout(() => setReveal(true), 800)
    return () => clearTimeout(t)
  }, [confirmed, reveal, final])

  const handlePinDrop = useCallback((lat, lng) => {
    if (confirmed || expired) return
    setPin({ lat, lng })
  }, [confirmed, expired])

  const handleConfirm = useCallback(() => {
    if (!pin || confirmed) return
    setConfirmed(true)
    const dist = haversine(pin.lat, pin.lng, q.answer.lat, q.answer.lng)
    setScore((s) => s + calcScore(dist))
  }, [pin, confirmed, q])

  const next = () => {
    const nextIdx = qIdx + 1
    if (nextIdx >= pool.length) {
      setFinal(true)
      return
    }
    setQIdx(nextIdx)
    setPin(null)
    setConfirmed(false)
    setReveal(false)
    setExpired(false)
    setTimeLeft(TIMER)
    timerKeyRef.current += 1
  }

  const replay = () => {
    setQIdx(0)
    setPin(null)
    setConfirmed(false)
    setReveal(false)
    setFinal(false)
    setExpired(false)
    setScore(0)
    setTimeLeft(TIMER)
    timerKeyRef.current += 1
  }

  const dist = pin ? haversine(pin.lat, pin.lng, q.answer.lat, q.answer.lng) : null
  const roundScore = dist !== null ? calcScore(dist) : 0

  const fakePlayers = useMemo(() => [
    { id: 'test', name: 'Tester', color: '#059669', score },
    { id: 'bot1', name: 'Bot A', color: '#7C3AED', score: Math.round(score * 0.7) },
    { id: 'bot2', name: 'Bot B', color: '#EC4899', score: Math.round(score * 0.4) },
  ], [score])

  const fakePins = useMemo(() => {
    if (!pin) return {}
    return {
      test: { lat: pin.lat, lng: pin.lng },
      bot1: { lat: pin.lat + 0.8, lng: pin.lng - 0.6 },
      bot2: { lat: pin.lat - 1.5, lng: pin.lng + 1.2 },
    }
  }, [pin])

  if (final) {
    return (
      <GameLeaderboard
        players={fakePlayers}
        localPlayerId="test"
        gameName="Indovina Dove"
        subtitle={`${pool.length} luoghi indovinati`}
        canControl
        onReplay={replay}
        onChangeGame={() => {}}
      />
    )
  }

  if (reveal) {
    return (
      <MappaReveal
        question={q}
        questionNumber={qIdx + 1}
        totalQuestions={pool.length}
        players={fakePlayers}
        localPlayerId="test"
        isHost={true}
        pins={fakePins}
        hasMoreQuestions={qIdx + 1 < pool.length}
        advancing={false}
        onAdvance={next}
        onExit={() => {}}
      />
    )
  }

  return (
    <MappaQuestion
      question={q}
      questionNumber={qIdx + 1}
      totalQuestions={pool.length}
      timeLeft={timeLeft}
      timerDuration={TIMER}
      players={fakePlayers}
      localPlayerId="test"
      isHost={true}
      localPin={pin}
      confirmed={confirmed}
      isExpired={expired}
      onPinDrop={handlePinDrop}
      onConfirm={handleConfirm}
      onExit={() => {}}
    />
  )
}

export default MappaTest
