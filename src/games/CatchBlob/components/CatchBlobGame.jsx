import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { GAME_WIDTH, GAME_HEIGHT } from '../engine/physics'
import { GameEngine } from '../engine/GameEngine'

const CatchBlobGame = forwardRef(({ seed, blobColor, onScoreUpdate, onDeath }, ref) => {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)

  useImperativeHandle(ref, () => ({
    getEngine: () => engineRef.current,
  }), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = GAME_WIDTH * dpr
    canvas.height = GAME_HEIGHT * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const engine = new GameEngine(canvas, seed, blobColor, onScoreUpdate, onDeath)
    engineRef.current = engine
    engine.start()

    return () => engine.stop()
  }, [seed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Responsive sizing — fit canvas to parent while preserving aspect ratio
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const pw = parent.clientWidth
      const ph = parent.clientHeight
      const scale = Math.min(pw / GAME_WIDTH, ph / GAME_HEIGHT)
      canvas.style.width = `${GAME_WIDTH * scale}px`
      canvas.style.height = `${GAME_HEIGHT * scale}px`
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    />
  )
})

CatchBlobGame.displayName = 'CatchBlobGame'
export default CatchBlobGame
