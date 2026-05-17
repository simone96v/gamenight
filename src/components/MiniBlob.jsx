// MiniBlob — sistema canonico per il blob.
// Riferimento visivo: docs/blob-states (idle, bounce, squish, ooze, attack, jump, walk, mini).
//
// Props:
//   color — hex player color, mappato a BLOB_GRADIENTS
//   expr  — espressione facciale ('normal'|'happy'|'blink'|'look-left'|'look-right')
//   pose  — forma del corpo ('idle'|'bounce'|'squish'|'ooze'|'attack'|'jump'|'walk')
//   size  — px di lato (svg square)
//   id    — id univoco per i defs gradient (richiesto se più blob nella stessa pagina)
//   facing — 'left'|'right' (solo per 'attack'/'walk', specchia la posa)

import { BLOB_GRADIENTS } from '../utils/colors'

// Re-export degli hook per retrocompatibilità con import esistenti.
// Definizioni canoniche in `src/hooks/useBlob.js`.
// eslint-disable-next-line react-refresh/only-export-components
export { useMiniExpr, useWalkFrame, useBlobGaze, useColorCycle } from '../hooks/useBlob'

const OUTLINE = '#1F2937'

// ─── Pose definitions ───────────────────────────────────────────────
// Ogni pose espone:
//   bodyPath  — d-path SVG che disegna il corpo
//   highlight — { cx, cy, rx, ry, rotate } posizione del riflesso
//   eyeOffset — { x, y } shift degli occhi per riallineare al corpo
//   svg       — { viewBox?, extras? } eventuali extras specifici della pose

const POSES = {
  // BLOB standard — rotondo con leggera squish e peso che siede in basso.
  // Reference: la posa "BLOB" centrale dell'asset di riferimento.
  idle: {
    bodyPath: 'M150,24 C220,24 282,80 282,148 C282,232 224,284 150,284 C76,284 18,232 18,148 C18,80 80,24 150,24 Z',
    highlight: { cx: 100, cy: 90, rx: 24, ry: 15, rotate: -30 },
    eyeOffset: { x: 0, y: 0 },
  },
  // Stretch verticale forte — usato durante eventi attivi (winning, hover).
  bounce: {
    bodyPath: 'M150,2 C214,2 268,52 268,140 C268,232 218,295 150,295 C82,295 32,232 32,140 C32,52 86,2 150,2 Z',
    highlight: { cx: 100, cy: 82, rx: 22, ry: 14, rotate: -30 },
    eyeOffset: { x: 0, y: -10 },
  },
  // Schiacciato — più largo, meno alto. Sensazione "rilassato" o "atterrato".
  squish: {
    bodyPath: 'M150,40 C228,40 288,90 288,165 C288,235 230,278 150,278 C70,278 12,235 12,165 C12,90 72,40 150,40 Z',
    highlight: { cx: 105, cy: 115, rx: 22, ry: 14, rotate: -30 },
    eyeOffset: { x: 0, y: 22 },
  },
  // Sciolto / fuso — testa rotonda con base che si allarga in pozza.
  ooze: {
    bodyPath: 'M150,30 C218,30 270,80 270,150 C270,200 260,230 240,250 C212,278 180,280 150,278 C120,280 88,278 60,250 C40,230 30,200 30,150 C30,80 82,30 150,30 Z',
    highlight: { cx: 100, cy: 90, rx: 20, ry: 13, rotate: -30 },
    eyeOffset: { x: 0, y: 14 },
  },
  // Inclinato a destra — punta avanzata, sensazione di attacco/spinta/movimento.
  // facing='left' specchia automaticamente.
  attack: {
    bodyPath: 'M70,160 C70,80 130,40 180,50 C240,60 280,110 280,160 C280,220 230,250 180,250 C130,260 70,230 70,160 Z',
    highlight: { cx: 110, cy: 90, rx: 22, ry: 14, rotate: -25 },
    eyeOffset: { x: 20, y: 0 },
  },
  // Salto: corpo allungato verso l'alto con coda/scia in basso.
  jump: {
    bodyPath: 'M150,8 C212,8 262,58 262,128 C262,180 232,220 200,240 C180,255 162,272 150,290 C138,272 120,255 100,240 C68,220 38,180 38,128 C38,58 88,8 150,8 Z',
    highlight: { cx: 102, cy: 70, rx: 22, ry: 14, rotate: -30 },
    eyeOffset: { x: 0, y: -16 },
  },
  // Camminata — corpo rotondo, le gambe sono renderizzate separatamente in base a walkFrame.
  walk: {
    bodyPath: 'M150,28 C220,28 278,86 278,150 C278,214 220,260 150,260 C80,260 22,214 22,150 C22,86 80,28 150,28 Z',
    highlight: { cx: 102, cy: 100, rx: 22, ry: 14, rotate: -30 },
    eyeOffset: { x: 0, y: 4 },
  },
}

// ─── Eyes ───────────────────────────────────────────────────────────

const MiniBlobEyes = ({ expr, offset = { x: 0, y: 0 }, gaze = null }) => {
  // Geometria faccia canonica — occhioni grandi alti, leggermente dentro
  // il corpo (giusto sotto il bordo superiore), bocca subito sotto.
  const lx = 100 + offset.x
  const rx = 200 + offset.x
  const ey = 115 + offset.y
  const my = 160 + offset.y
  const gazeDx = gaze ? gaze.x * 8 : 0
  const gazeDy = gaze ? gaze.y * 5 : 0
  const lookDx = (expr === 'look-left' ? -11 : expr === 'look-right' ? 11 : 0) + gazeDx
  const lookDy = (expr === 'look-left' || expr === 'look-right' ? -5 : 0) + gazeDy
  const cx = (lx + rx) / 2

  if (expr === 'blink') {
    return (
      <>
        <path d={`M${lx - 30} ${ey} Q${lx} ${ey + 11}, ${lx + 30} ${ey}`}
          fill="none" stroke={OUTLINE} strokeWidth="7" strokeLinecap="round" />
        <path d={`M${rx - 30} ${ey} Q${rx} ${ey + 11}, ${rx + 30} ${ey}`}
          fill="none" stroke={OUTLINE} strokeWidth="7" strokeLinecap="round" />
        <path d={`M${cx - 28} ${my} Q${cx} ${my + 14}, ${cx + 28} ${my}`}
          fill="none" stroke={OUTLINE} strokeWidth="7" strokeLinecap="round" />
      </>
    )
  }
  if (expr === 'happy') {
    return (
      <>
        <path d={`M${lx - 30} ${ey + 10} Q${lx} ${ey - 26}, ${lx + 30} ${ey + 10}`}
          fill="none" stroke={OUTLINE} strokeWidth="8" strokeLinecap="round" />
        <path d={`M${rx - 30} ${ey + 10} Q${rx} ${ey - 26}, ${rx + 30} ${ey + 10}`}
          fill="none" stroke={OUTLINE} strokeWidth="8" strokeLinecap="round" />
        <path d={`M${cx - 32} ${my - 4} Q${cx} ${my + 28}, ${cx + 32} ${my - 4}`}
          fill="none" stroke={OUTLINE} strokeWidth="8" strokeLinecap="round" />
      </>
    )
  }
  return (
    <>
      <ellipse cx={lx} cy={ey} rx="34" ry="40" fill={OUTLINE} />
      <circle cx={lx + 11 + lookDx} cy={ey - 13 + lookDy} r="9" fill="#fff" />
      <circle cx={lx - 9 + lookDx} cy={ey + 15 + lookDy} r="3.5" fill="rgba(255,255,255,0.6)" />
      <ellipse cx={rx} cy={ey} rx="34" ry="40" fill={OUTLINE} />
      <circle cx={rx + 11 + lookDx} cy={ey - 13 + lookDy} r="9" fill="#fff" />
      <circle cx={rx - 9 + lookDx} cy={ey + 15 + lookDy} r="3.5" fill="rgba(255,255,255,0.6)" />
      <path d={`M${cx - 28} ${my} Q${cx} ${my + 14}, ${cx + 28} ${my}`}
        fill="none" stroke={OUTLINE} strokeWidth="7" strokeLinecap="round" />
    </>
  )
}

// ─── Walk legs (3 frames) ───────────────────────────────────────────

const WalkLegs = ({ frame = 0, c3 }) => {
  // Frame 0: gambe simmetriche piegate. Frame 1: gamba sx avanti. Frame 2: gamba dx avanti.
  const positions = [
    { lx: 110, ly: 268, rx: 190, ry: 268 },
    { lx: 100, ly: 260, rx: 195, ry: 275 },
    { lx: 105, ly: 275, rx: 200, ry: 260 },
  ]
  const p = positions[frame] || positions[0]
  return (
    <>
      <ellipse cx={p.lx} cy={p.ly} rx="22" ry="14" fill={c3} stroke={OUTLINE} strokeWidth="3" />
      <ellipse cx={p.rx} cy={p.ry} rx="22" ry="14" fill={c3} stroke={OUTLINE} strokeWidth="3" />
    </>
  )
}

// ─── Jump trail ─────────────────────────────────────────────────────

const JumpTrail = ({ c3 }) => (
  <g opacity="0.55">
    <ellipse cx="150" cy="296" rx="48" ry="6" fill={c3} />
    <ellipse cx="150" cy="288" rx="32" ry="4" fill={c3} opacity="0.7" />
  </g>
)

// ─── Main component ─────────────────────────────────────────────────

const MiniBlob = ({
  color,
  expr = 'normal',
  pose = 'idle',
  size = 42,
  id = 'mb',
  facing = 'right',
  walkFrame = 0,
  gaze = null,
}) => {
  const [c1, c2, c3] = BLOB_GRADIENTS[color] || ['#E5E7EB', '#D1D5DB', '#9CA3AF']
  const def = POSES[pose] || POSES.idle
  const mirror = (pose === 'attack' || pose === 'walk') && facing === 'left'

  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      style={{ flexShrink: 0, overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={`${id}-g`} cx="40%" cy="36%" r="72%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="60%" stopColor={c2} />
          <stop offset="100%" stopColor={c3} />
        </radialGradient>
      </defs>

      <g transform={mirror ? 'translate(300,0) scale(-1,1)' : undefined}>
        {pose === 'jump' && <JumpTrail c3={c3} />}
        {pose === 'walk' && <WalkLegs frame={walkFrame} c3={c3} />}

        <path d={def.bodyPath} fill={`url(#${id}-g)`} />

        <ellipse
          cx={def.highlight.cx}
          cy={def.highlight.cy}
          rx={def.highlight.rx}
          ry={def.highlight.ry}
          fill={c1}
          opacity="0.85"
          transform={`rotate(${def.highlight.rotate} ${def.highlight.cx} ${def.highlight.cy})`}
        />
      </g>

      {/* Occhi NON specchiati — restano sempre rivolti al lettore */}
      <MiniBlobEyes
        expr={expr}
        offset={mirror ? { x: -def.eyeOffset.x, y: def.eyeOffset.y } : def.eyeOffset}
        gaze={mirror && gaze ? { x: -gaze.x, y: gaze.y } : gaze}
      />
    </svg>
  )
}

export default MiniBlob
