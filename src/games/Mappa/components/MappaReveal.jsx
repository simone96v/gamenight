import { useMemo } from 'react'
import { motion } from 'framer-motion'
import AppHeader from '../../../components/AppHeader'
import IconButton from '../../../components/ui/IconButton'
import Button from '../../../components/ui/Button'
import RoundBadge from '../../../components/ui/RoundBadge'
import GameSection from '../../../components/ui/GameSection'
import MiniBlob, { useMiniExpr } from '../../../components/MiniBlob'
import MapView from './MapView'
import { haversine, calcScore } from '../geo'
import { haptic } from '../../../utils/haptic'
import { accentBtnStyle } from '../../../theme/gameColors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'

const MappaReveal = ({
  question,
  questionNumber,
  totalQuestions,
  players,
  localPlayerId,
  isHost,
  isOnline = true,
  pins,
  hasMoreQuestions,
  advancing,
  onAdvance,
  onExit,
}) => {
  const C = usePlayerAccent()
  const expr = useMiniExpr()
  const answer = question?.answer

  const results = useMemo(() => {
    if (!answer) return []
    return players.map((p) => {
      const pin = pins?.[p.id]
      if (!pin || typeof pin.lat !== 'number' || typeof pin.lng !== 'number'
        || (pin.lat === 0 && pin.lng === 0 && pin.auto)) {
        return { ...p, distance: null, roundScore: 0, hasPin: false, auto: false, pin: null }
      }
      const dist = haversine(pin.lat, pin.lng, answer.lat, answer.lng)
      const pts = calcScore(dist)
      if (!isFinite(dist)) {
        return { ...p, distance: null, roundScore: 0, hasPin: false, auto: false, pin: null }
      }
      return { ...p, distance: dist, roundScore: pts, hasPin: true, auto: !!pin.auto, pin }
    }).sort((a, b) => b.roundScore - a.roundScore)
  }, [answer, players, pins])

  const myResult = results.find((r) => r.id === localPlayerId)

  const mapPins = useMemo(() =>
    results
      .filter((r) => r.hasPin && r.pin)
      .map((r) => ({
        lat: r.pin.lat,
        lng: r.pin.lng,
        color: r.color,
        id: r.id,
        auto: r.auto,
      })),
    [results],
  )

  if (!question) return null

  return (
    <div style={S.container}>
      <AppHeader
        accentColor={C.accent}
        leading={isHost && <IconButton ariaLabel="Esci" onClick={onExit}>←</IconButton>}
        actions={<RoundBadge n={questionNumber} total={totalQuestions} accentColor={C.accent} />}
      />

      <div style={S.body}>
        <GameSection emoji="🗺️" title={question.question} delay={0}>
          <div style={S.answerRow}>
            <MiniBlob color="#F43F5E" expr="happy" size={28} id="mappa-answer" />
            <span style={{ ...S.answerName, color: C.accent }}>{answer?.name ?? 'Posizione sconosciuta'}</span>
          </div>
        </GameSection>

        <GameSection noPad delay={0.1} style={{ flex: 1, minHeight: 'clamp(140px, 25dvh, 220px)' }}>
          <MapView
            pins={mapPins}
            revealMode
            realAnswer={answer}
            disabled
            rounded={false}
          />
        </GameSection>

        {myResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            style={S.myScoreCard}
            onAnimationComplete={() => {
              if (myResult.roundScore >= 80) haptic.double()
              else if (myResult.hasPin) haptic.medium()
              else haptic.light()
            }}
          >
            {myResult.hasPin ? (
              <>
                <span style={S.myDistance}>{myResult.distance.toFixed(1)} km</span>
                <span style={{
                  ...S.myPoints,
                  color: myResult.roundScore >= 80 ? 'var(--success)' : 'var(--text)',
                }}>
                  +{myResult.roundScore} {myResult.roundScore >= 100 ? '🎯' : myResult.distance < 10 ? '🔥' : ''}
                </span>
              </>
            ) : (
              <span style={S.myDistance}>Nessun pin — 0 punti</span>
            )}
          </motion.div>
        )}

        <GameSection emoji="🏆" title="Classifica" delay={0.2} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={S.leaderboard}>
            {results.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                style={{
                  ...S.lbRow,
                  borderColor: r.id === localPlayerId ? C.accent : 'transparent',
                  background: r.id === localPlayerId ? `${C.accent}14` : 'var(--bg)',
                }}
              >
                <span style={S.lbRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                <MiniBlob color={r.color} expr={i === 0 ? 'happy' : expr} size={28} id={`mr-${i}`} />
                <span style={S.lbName}>{r.name}</span>
                <span style={S.lbFill} />
                {r.hasPin ? (
                  <>
                    <span style={S.lbDist}>{r.distance.toFixed(0)} km</span>
                    <span style={S.lbScore}>+{r.roundScore}</span>
                  </>
                ) : (
                  <span style={{ ...S.lbDist, color: 'var(--muted)' }}>
                    {r.auto ? '⏰' : '—'}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </GameSection>

        <div style={S.footer}>
          {isHost ? (
            <Button
              variant="primary"
              width="full"
              onClick={onAdvance}
              disabled={advancing}
              style={accentBtnStyle(C.accent)}
            >
              {advancing
                ? '...'
                : hasMoreQuestions
                  ? 'Avanti tutta! →'
                  : (isOnline ? 'Classifica finale 🏆' : 'Scopri il tuo risultato 🎯')}
            </Button>
          ) : (
            <p style={S.waitText}>Aspettando il boss... 👑</p>
          )}
        </div>
      </div>
    </div>
  )
}

const S = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    height: '100dvh',
  },
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    padding: 'clamp(8px, 1.2dvh, 12px) clamp(10px, 2.5vw, 16px)',
    gap: 'clamp(6px, 1dvh, 10px)',
    background: 'var(--bg)',
  },
  answerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  answerName: {
    fontWeight: 800,
    fontSize: 'clamp(14px, 1.8dvh, 17px)',
  },
  myScoreCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 'clamp(10px, 1.5dvh, 14px) clamp(14px, 3vw, 20px)',
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    flexShrink: 0,
  },
  myDistance: {
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 700,
    color: 'var(--muted)',
  },
  myPoints: {
    fontSize: 'clamp(18px, 2.5dvh, 24px)',
    fontWeight: 800,
  },
  leaderboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(3px, 0.5dvh, 5px)',
    overflow: 'auto',
    flex: 1,
    minHeight: 0,
    scrollbarWidth: 'none',
  },
  lbRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 'clamp(6px, 1dvh, 10px) clamp(8px, 1.5vw, 12px)',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid transparent',
    flexShrink: 0,
  },
  lbRank: {
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 800,
    minWidth: 24,
    textAlign: 'center',
  },
  lbName: {
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 700,
    color: 'var(--text)',
  },
  lbFill: { flex: 1 },
  lbDist: {
    fontSize: 'clamp(11px, 1.3dvh, 13px)',
    fontWeight: 600,
    color: 'var(--muted)',
    marginRight: 4,
  },
  lbScore: {
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 800,
    color: 'var(--success)',
    minWidth: 36,
    textAlign: 'right',
  },
  footer: {
    flexShrink: 0,
  },
  waitText: {
    color: 'var(--muted)',
    fontSize: 'clamp(13px, 1.6dvh, 16px)',
    fontWeight: 600,
    textAlign: 'center',
    padding: 'clamp(10px, 1.5dvh, 16px) 0',
    margin: 0,
  },
}

export default MappaReveal
