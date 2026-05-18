import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import CatchBlobGame from './CatchBlobGame'
import AppHeader from '../../../components/AppHeader'
import IconButton from '../../../components/ui/IconButton'
import MiniBlob from '../../../components/MiniBlob'
import { BLOB_GRADIENTS } from '../../../utils/colors'
import { usePlayerAccent } from '../../../hooks/usePlayerAccent'

const HalfZone = ({ side, gameRef, disabled }) => {
  const onStart = useCallback((e) => {
    e.preventDefault()
    if (disabled) return
    gameRef.current?.getEngine()?.input?.setExternalDirection(side)
  }, [side, disabled, gameRef])
  const onEnd = useCallback((e) => {
    e.preventDefault()
    gameRef.current?.getEngine()?.input?.clearExternalDirection()
  }, [gameRef])
  return (
    <div
      onTouchStart={onStart}
      onTouchEnd={onEnd}
      onTouchCancel={onEnd}
      onMouseDown={onStart}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        ...(side < 0 ? { left: 0, right: '50%' } : { left: '50%', right: 0 }),
        zIndex: 5,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: side < 0 ? 'flex-start' : 'flex-end',
        padding: 'clamp(16px, 3dvh, 28px) clamp(20px, 5vw, 32px)',
        cursor: 'pointer',
      }}
    >
      <span style={{
        fontSize: 'clamp(22px, 4dvh, 32px)',
        fontWeight: 900,
        color: 'rgba(0,0,0,0.13)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        {side < 0 ? '←' : '→'}
      </span>
    </div>
  )
}

const CatchBlobPlaying = ({
  seed,
  blobColor,
  scoreSubmitted,
  onSubmitScore,
}) => {
  const C = usePlayerAccent()
  const navigate = useNavigate()
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState({ combo: 0, mult: 1, pulse: 0 })
  const [dead, setDead] = useState(false)
  const [waveBanner, setWaveBanner] = useState(null) // { id, name, key }
  const scoreRef = useRef(0)
  const gameRef = useRef(null)
  const waveBannerTimerRef = useRef(null)

  const handleWaveChange = useCallback((wave) => {
    if (!wave || wave.id <= 1) return // skip the initial wave
    setWaveBanner({ id: wave.id, name: wave.name, key: Date.now() })
    if (waveBannerTimerRef.current) clearTimeout(waveBannerTimerRef.current)
    waveBannerTimerRef.current = setTimeout(() => setWaveBanner(null), 1700)
  }, [])

  useEffect(() => () => {
    if (waveBannerTimerRef.current) clearTimeout(waveBannerTimerRef.current)
  }, [])

  const handleScore = useCallback((s, info) => {
    setScore(s)
    scoreRef.current = s
    if (info) {
      setCombo({ combo: info.combo, mult: info.mult, pulse: Date.now() })
    }
  }, [])

  const handleDeath = useCallback((s) => {
    setScore(s)
    scoreRef.current = s
    setDead(true)
    onSubmitScore(s)
  }, [onSubmitScore])

  useEffect(() => {
    if (dead && !scoreSubmitted) onSubmitScore(scoreRef.current)
  }, [dead, scoreSubmitted, onSubmitScore])

  const handleExit = useCallback(() => {
    navigate('/solo/games', { replace: true })
  }, [navigate])

  const accentLight = useMemo(() => BLOB_GRADIENTS[blobColor]?.[0] || blobColor, [blobColor])
  const ctrlDisabled = dead

  return (
    <div style={S.container}>
      <style>{`
        @keyframes cb-combo-pop {
          0%   { transform: scale(0.6); opacity: 0; }
          40%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes cb-wave-banner {
          0%   { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
          15%  { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
          25%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          85%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.08); opacity: 0; }
        }
      `}</style>
      <AppHeader
        accentColor={C.accent}
        leading={<IconButton ariaLabel="Esci" onClick={handleExit}>←</IconButton>}
      />

      <div style={S.gameArea}>
        <CatchBlobGame
          ref={gameRef}
          seed={seed}
          blobColor={blobColor}
          onScoreUpdate={handleScore}
          onDeath={handleDeath}
          onWaveChange={handleWaveChange}
        />

        <div style={S.hud} aria-live="polite" aria-atomic>
          <div style={S.targetChip} aria-label={`Prendi i blob del colore ${blobColor}`}>
            <span style={S.targetLabel}>Prendi</span>
            <div style={S.targetBlob}>
              <MiniBlob color={blobColor} size={28} expr="happy" id="cb-target" />
            </div>
          </div>
          <div style={S.scoreChip}>
            <span style={{ ...S.scoreArrow, color: accentLight }} aria-hidden="true">●</span>
            <span style={S.scoreValue}>{score}</span>
            <span style={S.scoreUnit}>pt</span>
          </div>
          {combo.mult > 1 && (
            <div
              key={combo.pulse}
              style={{
                ...S.comboChip,
                background: `linear-gradient(135deg, ${accentLight}, ${blobColor})`,
                animation: 'cb-combo-pop 0.45s ease-out',
              }}
            >
              <span style={S.comboMult}>×{combo.mult}</span>
            </div>
          )}
        </div>

        <HalfZone side={-1} gameRef={gameRef} disabled={ctrlDisabled} />
        <HalfZone side={1}  gameRef={gameRef} disabled={ctrlDisabled} />

        {waveBanner && (
          <div key={waveBanner.key} style={S.waveBanner}>
            <div style={{ ...S.waveBannerLabel, color: accentLight }}>WAVE {waveBanner.id}</div>
            <div style={S.waveBannerName}>{waveBanner.name}</div>
          </div>
        )}
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
    background: '#F8F6F0',
  },
  gameArea: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 0,
  },
  hud: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    pointerEvents: 'none',
    zIndex: 10,
  },
  targetChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(0,0,0,0.68)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    padding: '4px 10px 4px 14px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 1,
  },
  targetBlob: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreChip: {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 4,
    background: 'rgba(0,0,0,0.68)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    padding: '5px 16px 5px 11px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
  },
  scoreArrow: {
    fontSize: 14,
    fontWeight: 900,
    lineHeight: 1,
    marginRight: 2,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
  },
  scoreUnit: {
    fontSize: 14,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.48)',
  },
  comboChip: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.22)',
    boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
    minWidth: 42,
  },
  comboMult: {
    fontSize: 17,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
    textShadow: '0 1px 2px rgba(0,0,0,0.25)',
  },
  waveBanner: {
    position: 'absolute',
    top: '38%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '18px 36px',
    background: 'rgba(0,0,0,0.72)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 20,
    border: '1.5px solid rgba(255,255,255,0.14)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
    pointerEvents: 'none',
    zIndex: 15,
    animation: 'cb-wave-banner 1.7s ease-out forwards',
  },
  waveBannerLabel: {
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    lineHeight: 1,
  },
  waveBannerName: {
    fontFamily: "'Baloo 2', cursive",
    fontSize: 34,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.02em',
    lineHeight: 1.05,
    textAlign: 'center',
  },
}

export default CatchBlobPlaying
