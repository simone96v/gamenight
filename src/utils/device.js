// Identificatore univoco persistente per questo dispositivo.
// Usato come `host_id` su Supabase e per riconoscere il "proprio" giocatore al reload.
// Stored in localStorage sotto 'gn:deviceId'. Generato la prima volta con crypto.randomUUID().

const DEVICE_ID_KEY = 'gn:deviceId'

// Fallback per ambienti senza crypto.randomUUID (vecchi Safari su HTTP locale).
const fallbackUuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const getDeviceId = () => {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing
    const id = (globalThis.crypto?.randomUUID?.() ?? fallbackUuid())
    localStorage.setItem(DEVICE_ID_KEY, id)
    return id
  } catch {
    // localStorage non disponibile (es. private mode bloccato): id volatile per la sessione.
    return fallbackUuid()
  }
}
