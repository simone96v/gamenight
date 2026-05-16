// Confetti decorativi per round vinto / game over.
// Solo CSS, nessuna dipendenza. `big={true}` per il finale.

const COLORS = ['#c8ff32', '#ff4d97', '#43e8df', '#ffce3a', '#ff7a3d']

const Confetti = ({ big = false }) => {
  const n = big ? 46 : 26
  const pieces = Array.from({ length: n }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    dur: 1.6 + Math.random() * 1.4,
    color: COLORS[i % COLORS.length],
    size: 7 + Math.random() * 9,
    rot: Math.random() * 360,
  }))
  return (
    <div className="eq-confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.size * 0.62,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  )
}

export default Confetti
