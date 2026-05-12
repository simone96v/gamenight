// Entry point del gioco Trivia — modello "pronto democratico".
// Tutti i giocatori (host incluso) vedono la stessa interfaccia.

import { useTrivia } from './useTrivia'
import ClientView from './ClientView'
import Spinner from '../../components/ui/Spinner'

const Trivia = () => {
  const trivia = useTrivia()

  // Mostra spinner se non c'è ancora una domanda (in attesa del sync iniziale)
  if (!trivia.currentQuestion && trivia.currentPhase !== 'final') {
    return (
      <div className="flex items-center justify-center" style={{ flex: 1 }}>
        <Spinner size="lg" />
      </div>
    )
  }

  return <ClientView {...trivia} />
}

export default Trivia
