// TappableMiniBlob — wrapper di MiniBlob con tap → shockwave + cambio expr.
// Riusabile in liste (es. players strip) dove ogni blob ha il proprio
// hook tap-shockwave indipendente.

import MiniBlob from './MiniBlob'
import TapShockwaves from './TapShockwaves'
import { useTapShockwave } from '../hooks/useTapShockwave'

const TappableMiniBlob = ({ color, expr, pose, size = 32, id, facing }) => {
  const { tapExpr, waves, onTap, removeWave } = useTapShockwave()

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onTap() }}
      role="button"
      aria-label="Tocca il blob"
      style={{
        position: 'relative',
        display: 'inline-block',
        width: size,
        height: size,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <TapShockwaves waves={waves} removeWave={removeWave} color={color || '#9CA3AF'} strokeWidth={2} />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <MiniBlob
          color={color}
          expr={tapExpr || expr}
          pose={pose}
          size={size}
          id={id}
          facing={facing}
        />
      </div>
    </div>
  )
}

export default TappableMiniBlob
