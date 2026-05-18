// Brevi definizioni dei pangram usati come rack di Scramble.
// Mostrate a fine round per insegnare la parola "soluzione massima" del rack.
// Se un rack non ha definizione, getRackDefinition() ritorna null.

export const RACK_DEFINITIONS = {
  AGRESTI: 'Che riguardano la campagna, rustici.',
  ANGURIE: 'Plurale di anguria, il cocomero.',
  BERMUDA: 'Pantaloncini lunghi fino al ginocchio.',
  BORSATE: 'Lavorate a sbuffo, con effetto a borsa.',
  CHELATI: 'Composti chimici a struttura ad artiglio.',
  COLMATI: 'Riempiti fino all\'orlo.',
  CORDAME: 'Insieme di corde, soprattutto in nautica.',
  CREMATI: 'Sottoposti a cremazione.',
  CRESIMA: 'Sacramento cristiano della conferma.',
  CROTALI: 'Serpenti velenosi a sonagli.',
  CULTORE: 'Chi coltiva un\'arte o un sapere con passione.',
  DIVOLTA: 'Forma arcaica/letteraria: rivolta, sconvolta.',
  EPIGONA: 'Femminile di epigono: imitatrice di un maestro.',
  FASCINO: 'Forza di attrazione, charme.',
  FILMERA: 'Forma del verbo filmare al futuro o congiuntivo (filmerà).',
  FORCINA: 'Mollettina a U per fermare i capelli.',
  FORNITE: 'Equipaggiate, dotate del necessario.',
  GLOSARE: 'Annotare, commentare un testo con glosse.',
  INCLUSO: 'Compreso, inserito dentro.',
  INGRATE: 'Donne prive di gratitudine.',
  INTEGRA: 'Completa, intatta, non alterata.',
  INVOLGA: 'Congiuntivo di involgere: avvolgere, coinvolgere.',
  ISOLANE: 'Donne native di un\'isola.',
  LIBERTO: 'Nell\'antica Roma, schiavo affrancato.',
  MAESTRI: 'Insegnanti, persone esperte in un\'arte.',
  MAESTRO: 'Insegnante, esperto in un\'arte o tecnica.',
  MENISCO: 'Cartilagine del ginocchio a forma di mezzaluna.',
  PORCILE: 'Recinto in cui si allevano i maiali.',
  SFACELO: 'Rovina completa, disfacimento.',
  SPEDITA: 'Inviata, mandata; oppure svelta, rapida.',
  TEDIOSA: 'Noiosa, monotona.',
  TRANCHE: 'Porzione, fetta (anche finanziaria).',
  TRONCHE: 'Tagliate, accorciate; parole con accento finale.',
}

export const getRackDefinition = (rack) => {
  if (!rack || typeof rack !== 'string') return null
  return RACK_DEFINITIONS[rack.toUpperCase()] ?? null
}
