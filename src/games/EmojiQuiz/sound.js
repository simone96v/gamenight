// Web Audio helper per Emoji Quiz (zero dipendenze).
// `makeSound()` → { ensure, correct, wrong, oppGot, win }.
// `ensure()` va chiamato su un gesture utente (start game) per sbloccare l'audio mobile.

export function makeSound() {
  let ctx = null
  const ensure = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }
  const blip = (freq, dur, type = 'sine', gain = 0.18, delay = 0) => {
    const c = ensure()
    const t = c.currentTime + delay
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(c.destination)
    o.start(t)
    o.stop(t + dur + 0.02)
  }
  return {
    ensure,
    correct: () => {
      ;[523, 659, 784, 1047].forEach((f, i) => blip(f, 0.34, 'triangle', 0.16, i * 0.07))
    },
    wrong: () => {
      blip(180, 0.22, 'sawtooth', 0.13)
      blip(120, 0.3, 'sawtooth', 0.12, 0.08)
    },
    oppGot: () => {
      blip(330, 0.18, 'square', 0.1)
      blip(247, 0.26, 'square', 0.1, 0.1)
    },
    win: () => {
      ;[523, 659, 784, 1047, 1319].forEach((f, i) => blip(f, 0.5, 'triangle', 0.17, i * 0.11))
    },
  }
}
