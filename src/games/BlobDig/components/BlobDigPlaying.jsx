// BlobDigPlaying — canvas + 2 tap zones (sinistra / destra).
// Si avvia il GameEngine al mount; tap → engine.tap('left'|'right').
// onSubmitScore chiamato una sola volta on death.

import { useEffect, useRef } from 'react'
import { GameEngine } from '../engine/GameEngine'

const BlobDigPlaying = ({ seed, blobColor, scoreSubmitted, onSubmitScore }) => {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const engine = new GameEngine({
      seed,
      canvas: canvasRef.current,
      blobColor,
      callbacks: {
        onDeath: (score) => onSubmitScore?.(score),
      },
    })
    engineRef.current = engine
    engine.start()
    return () => engine.stop()
  }, [seed, blobColor, onSubmitScore])

  const handleTap = (side) => () => {
    if (scoreSubmitted) return
    engineRef.current?.tap(side)
  }

  return (
    <div style={S.container}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
      />
      {/* Tap zones invisibili — coprono la metà sinistra / destra del viewport */}
      <button
        type="button"
        onClick={handleTap('left')}
        aria-label="Scava a sinistra"
        style={{ ...S.tapZone, left: 0 }}
      />
      <button
        type="button"
        onClick={handleTap('right')}
        aria-label="Scava a destra"
        style={{ ...S.tapZone, right: 0 }}
      />
    </div>
  )
}

const S = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0,
    background: '#0A0402',
    overflow: 'hidden',
  },
  tapZone: {
    position: 'absolute',
    top: 0,
    width: '50%',
    height: '100%',
    background: 'transparent',
    border: 'none',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    zIndex: 5,
  },
}

export default BlobDigPlaying
