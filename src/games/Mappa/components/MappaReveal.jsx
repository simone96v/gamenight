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

const MappaReveal = ({
  question,
  questionNumber,
  totalQuestions,
  players,
  localPlayerId,
  isHost,
  pins,
  hasMoreQuestions,
  advancing,
  onAdvance,
  onExit,
}) => {
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
        accentColor="#059669"
        leading={isHost && <IconButton ariaLabel="Esci" onClick={onExit}>â†</IconButton>}
        actions={<RoundBadge n={questionNumber} total={totalQuestions} game="mappa" />}
      />

      <div style={S.body}>
        <GameSection emoji="ðŸ—ºï¸" title={question.question} delay={0}>
          <div style={S.answerRow}>
            <span style={S.answerPin}>ðŸ“</span>
            <span style={S.answerName}>{answer?.name ?? 'Posizione sconosciuta'}</span>
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
                  +{myResult.roundScore} {myResult.roundScore >= 100 ? 'ðŸŽ¯' : myResult.distance < 10 ? 'ðŸ”¥' : ''}
                </span>
              </>
            ) : (
              <span style={S.myDistance}>Nessun pin â€” 0 punti</span>
            )}
          </motion.div>
        )}

        <GameSection emoji="ðŸ†" title="Classifica" delay={0.2} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={S.leaderboard}>
            {results.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                style={{
                  ...S.lbRow,
                  borderColor: r.id === localPlayerId ? '#059669' : 'transparent',
                  background: r.id === localPlayerId ? 'rgba(5, 150, 105, 0.08)' : 'var(--bg)',
                }}
              >
                <span style={S.lbRank}>{i === 0 ? 'ðŸ¥‡' : i === 1 ? 'ðŸ¥ˆ' : i === 2 ? 'ðŸ¥‰' : `${i + 1}.`}</span>
                <MiniBlob color={r.color} expr={i === 0 ? 'happy' : expr} accessory={r.accessory} size={28} id={`mr-${i}`} />
                <span style={S.lbName}>{r.name}</span>
                <span style={S.lbFill} />
                {r.hasPin ? (
                  <>
                    <span style={S.lbDist}>{r.distance.toFixed(0)} km</span>
                    <span style={S.lbScore}>+{r.roundScore}</span>
                  </>
                ) : (
                  <span style={{ ...S.lbDist, color: 'var(--muted)' }}>
                    {r.auto ? 'â°' : 'â€”'}
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
              style={accentBtnStyle('mappa')}
            >
              {advancing
                ? '...'
                : hasMoreQuestions
                  ? 'Avanti tutta! â†’'
                  : 'Classifica finale ðŸ†'}
            </Button>
          ) : (
            <p style={S.waitText}>Aspettando il boss... ðŸ‘‘</p>
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
  answerPin: {
    fontSize: 'clamp(16px, 2dvh, 20px)',
    flexShrink: 0,
  },
  answerName: {
    fontWeight: 800,
    fontSize: 'clamp(14px, 1.8dvh, 17px)',
    color: '#059669',
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

