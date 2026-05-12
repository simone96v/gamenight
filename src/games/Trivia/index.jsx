import { useTrivia } from './useTrivia'
import HostView from './HostView'
import ClientView from './ClientView'
import Spinner from '../../components/ui/Spinner'

const Trivia = ({ onEnd, isOnline, canWrite, localPlayerId }) => {
  const trivia = useTrivia({ onEnd, localPlayerId })

  if (!trivia.currentQuestion) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ flex: 1 }}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  return canWrite ? (
    <HostView {...trivia} isOnline={isOnline} localPlayerId={localPlayerId} />
  ) : (
    <ClientView {...trivia} localPlayerId={localPlayerId} />
  )
}

export default Trivia
