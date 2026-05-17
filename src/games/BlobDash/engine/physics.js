// Costanti di gioco per Blob Dash — auto-runner ritmico stile Geometry Dash.
// Il blob è fisso a x = BLOB_SCREEN_X; il mondo scrolla a sinistra a runSpeed px/s.

export const GAME_WIDTH = 400
export const GAME_HEIGHT = 700

export const PHYSICS = {
  GRAVITY: 2400,
  JUMP_VELOCITY: -780,
  RUN_SPEED_BASE: 280,
  RUN_SPEED_MAX: 480,
  RUN_SPEED_RAMP_TIME: 60, // secondi per raggiungere la velocità massima

  BLOB_RADIUS: 16,
  GROUND_Y: 560,           // y della linea di terra
  BLOB_SCREEN_X: 120,      // x fisso del blob (≈ 30% della larghezza)

  PIXELS_PER_METER: 30,    // worldX / questo = score
  JUMP_BUFFER: 0.10,       // s: input salto valido se premuto poco prima di toccare terra
  COYOTE_TIME: 0.06,       // s: salto ancora valido subito dopo aver lasciato il bordo
}

// Beat logico (no audio in fase 1): usato per griglia ostacoli + pulse visivo.
export const BEAT = {
  INTERVAL: 60 / 130,           // BPM 130 → 0.4615s/beat (riferimento)
  DIST: 130,                    // px-mondo per slot (≈ RUN_SPEED_BASE * INTERVAL)
  START_OFFSET: 800,            // i primi ostacoli partono dopo questo worldX
  MIN_GAP_SLOTS: 2,             // almeno 2 slot vuoti tra due ostacoli → 260px (≈0.93s) di respiro a base speed
}

// Dimensioni di ogni ostacolo (in px-mondo). `slots` = quanti slot di beat occupa.
export const OBSTACLE = {
  spike:  { slots: 1, width: 30,  height: 36 },
  spike3: { slots: 2, width: 100, height: 36 },
  block:  { slots: 2, width: 90,  height: 60 },
}
