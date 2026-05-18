// Audio low-level: gestisce AudioContext + AudioBuffer per SFX low-latency.
// Si attiva alla prima interazione utente (browser autoplay policy) e
// preload-a in background tutti gli sfx registrati.
// Le decisioni di "se" riprodurre (mute/volume) vivono nei consumer via
// useSettings — questo modulo è un layer trasporto, non di policy.

const SFX = {
  tap:     '/audio/sfx/tap.ogg',
  pop:     '/audio/sfx/pop.ogg',
  whoosh:  '/audio/sfx/whoosh.ogg',
  confirm: '/audio/sfx/confirm.ogg',
  correct: '/audio/sfx/correct.ogg',
  wrong:   '/audio/sfx/wrong.ogg',
  // Fase 2: jingle 1° posto, fail game over, tick per wheel/countdown loop.
  fanfare: '/audio/sfx/fanfare.ogg',
  fail:    '/audio/sfx/fail.ogg',
  tick:    '/audio/sfx/tick.ogg',
}

let ctx = null
const buffers = new Map()       // name → AudioBuffer
const pendingLoads = new Map()  // name → Promise<AudioBuffer>
let unlockArmed = false

function ensureContext() {
  if (ctx) return ctx
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  return ctx
}

async function loadOne(name) {
  if (buffers.has(name)) return buffers.get(name)
  if (pendingLoads.has(name)) return pendingLoads.get(name)
  const url = SFX[name]
  if (!url) return null
  const c = ensureContext()
  if (!c) return null
  const p = fetch(url)
    .then((r) => r.arrayBuffer())
    .then((ab) => new Promise((resolve, reject) => {
      // decodeAudioData con callback per compat Safari più vecchio
      c.decodeAudioData(ab, resolve, reject)
    }))
    .then((buf) => {
      buffers.set(name, buf)
      pendingLoads.delete(name)
      return buf
    })
    .catch((err) => {
      pendingLoads.delete(name)
      console.warn(`[audio] failed to load ${name}:`, err)
      return null
    })
  pendingLoads.set(name, p)
  return p
}

/**
 * Pre-carica tutti gli sfx. Chiamabile in background al mount dell'app.
 * Non blocca: se non riesce, playSfx fallisce silenziosamente.
 */
export function preloadSfx() {
  ensureContext()
  Object.keys(SFX).forEach((n) => loadOne(n))
}

/**
 * Sblocca l'AudioContext alla prima interazione utente (autoplay policy
 * di Chrome/Safari richiede gesto utente). Da chiamare una volta al mount.
 */
export function armAudioUnlock() {
  if (unlockArmed) return
  unlockArmed = true
  const unlock = () => {
    const c = ensureContext()
    if (c && c.state === 'suspended') c.resume()
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('touchstart', unlock)
  }
  window.addEventListener('pointerdown', unlock, { once: false, passive: true })
  window.addEventListener('keydown', unlock, { once: false, passive: true })
  window.addEventListener('touchstart', unlock, { once: false, passive: true })
}

/**
 * Riproduce uno sfx by name. volume 0..1.
 * Ritorna true se la sorgente è partita, false altrimenti.
 */
export function playSfx(name, { volume = 1 } = {}) {
  const c = ensureContext()
  if (!c) return false
  if (c.state === 'suspended') c.resume()
  const buf = buffers.get(name)
  if (!buf) {
    // Lazy load se mancante — al successivo trigger funziona.
    loadOne(name)
    return false
  }
  try {
    const src = c.createBufferSource()
    src.buffer = buf
    const gain = c.createGain()
    gain.gain.value = Math.max(0, Math.min(1, volume))
    src.connect(gain).connect(c.destination)
    src.start(0)
    return true
  } catch {
    return false
  }
}

export const SFX_NAMES = Object.keys(SFX)

// ── BGM (background music): un singolo HTMLAudioElement in loop, con fade ──

const BGM = {
  lobby: '/audio/music/lobby.mp3',
}

let bgmEl = null
let bgmCurrent = null     // nome del track attualmente caricato (non necessariamente in play)
let bgmFadeTimer = null

function ensureBgmEl() {
  if (bgmEl) return bgmEl
  bgmEl = new Audio()
  bgmEl.loop = true
  bgmEl.preload = 'auto'
  return bgmEl
}

function clearFade() {
  if (bgmFadeTimer) {
    clearInterval(bgmFadeTimer)
    bgmFadeTimer = null
  }
}

/**
 * Avvia un BGM by name con fade-in. Se è già in play, aggiorna solo il volume.
 * `volume` è il target finale (0..1). Se name diverso dall'attuale, swappa la src.
 */
export function playBgm(name, { volume = 0.3, fadeMs = 600 } = {}) {
  const url = BGM[name]
  if (!url) return
  const el = ensureBgmEl()
  const target = Math.max(0, Math.min(1, volume))
  clearFade()
  if (bgmCurrent !== name) {
    el.src = url
    bgmCurrent = name
    el.volume = 0
  }
  const playPromise = el.play()
  if (playPromise?.catch) {
    // Autoplay potrebbe essere bloccata fino a interazione utente — fallisce silenzioso.
    playPromise.catch(() => {})
  }
  // Fade-in semplice via setInterval (no Web Audio overhead per BGM).
  const startVol = el.volume
  const steps = Math.max(1, Math.round(fadeMs / 50))
  let i = 0
  bgmFadeTimer = setInterval(() => {
    i++
    const t = i / steps
    el.volume = startVol + (target - startVol) * t
    if (i >= steps) {
      el.volume = target
      clearFade()
    }
  }, 50)
}

/** Aggiorna il volume target senza fade (es. dal slider). */
export function setBgmVolume(volume) {
  if (!bgmEl) return
  clearFade()
  bgmEl.volume = Math.max(0, Math.min(1, volume))
}

/**
 * Ferma il BGM con fade-out. Pause + reset src per rilasciare buffer.
 */
export function stopBgm({ fadeMs = 400 } = {}) {
  if (!bgmEl) return
  clearFade()
  const startVol = bgmEl.volume
  const steps = Math.max(1, Math.round(fadeMs / 50))
  let i = 0
  bgmFadeTimer = setInterval(() => {
    i++
    const t = i / steps
    bgmEl.volume = startVol * (1 - t)
    if (i >= steps) {
      bgmEl.pause()
      bgmEl.volume = 0
      clearFade()
    }
  }, 50)
}

