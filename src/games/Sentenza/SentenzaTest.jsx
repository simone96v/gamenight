import { useState } from 'react'
import GradientTitle from '../../components/ui/GradientTitle'
import PromptCard from './components/PromptCard'
import SentenzaSelection from './components/SentenzaSelection'
import SentenzaSelectionWaiting from './components/SentenzaSelectionWaiting'
import JudgingSetup from './components/JudgingSetup'
import SentenzaJudging from './components/SentenzaJudging'
import SentenzaJudgingWaiting from './components/SentenzaJudgingWaiting'
import SentenzaReveal from './components/SentenzaReveal'
import SentenzaFinal from './components/SentenzaFinal'

const SAMPLE_PROMPT = "Il mio terapeuta ha mollato dopo che gli ho parlato di ___"
const SAMPLE_ANSWER = "tre Spritz, due tequila e un crollo emotivo"

const MOCK_ANSWERS = [
  { id: 'a1', text: 'tre Spritz, due tequila e un crollo emotivo' },
  { id: 'a2', text: 'la mia ex che ora è su Tinder' },
  { id: 'a3', text: 'il mio capo che mi manda vocali di 4 minuti' },
  { id: 'a4', text: 'un piatto di carbonara fatta con la panna' },
]

const MOCK_PLAYERS = [
  { id: 'p1', name: 'Giulia', color: '#EC4899' },
  { id: 'p2', name: 'Marco', color: '#3B82F6' },
  { id: 'p3', name: 'Luca', color: '#22C55E' },
  { id: 'p4', name: 'Sara', color: '#F59E0B' },
]

const MOCK_SCORED = [
  { id: 'p1', name: 'Giulia', color: '#EC4899', score: 4, roundsWon: 4 },
  { id: 'p2', name: 'Marco', color: '#3B82F6', score: 2, roundsWon: 2 },
  { id: 'p3', name: 'Luca', color: '#22C55E', score: 3, roundsWon: 3 },
  { id: 'p4', name: 'Sara', color: '#F59E0B', score: 1, roundsWon: 1 },
]

const MOCK_OTHER_PROOFS = [
  { id: 'op1', answer: 'la mia ex che ora è su Tinder', playerName: 'Luca' },
  { id: 'op2', answer: 'un piatto di carbonara fatta con la panna', playerName: 'Sara' },
]

const MOCK_PROOFS = [
  { id: 'pr1', text: 'tre Spritz, due tequila e un crollo emotivo' },
  { id: 'pr2', text: 'la mia ex che ora è su Tinder' },
  { id: 'pr3', text: 'un piatto di carbonara fatta con la panna' },
]

const PHASES = ['promptcard', 'selection', 'selection_judge', 'judging_setup', 'judging', 'judging_wait', 'reveal', 'final']

const SentenzaTest = () => {
  const [phase, setPhase] = useState('selection')
  const [revealed, setRevealed] = useState(false)
  const [submittedIds, setSubmittedIds] = useState([])

  return (
    <div className="screen screen-narrow">
      <div className="screen-body" style={{ gap: 14, overflowY: 'auto', scrollbarWidth: 'none' }}>
        <GradientTitle
          as="h1"
          size="lg"
          gradient="linear-gradient(135deg, #818CF8 0%, #6366F1 50%, #4F46E5 100%)"
        >
          Test Sentenza
        </GradientTitle>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PHASES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPhase(p)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: phase === p ? '2px solid #6366F1' : '1px solid var(--border)',
                background: phase === p ? '#6366F1' : 'var(--surface)',
                color: phase === p ? '#fff' : 'var(--text)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {phase === 'promptcard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600, margin: 0 }}>
              Normal mode (blank pulsante):
            </p>
            <PromptCard text={SAMPLE_PROMPT} />

            <p style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600, margin: 0 }}>
              Compact mode:
            </p>
            <PromptCard text={SAMPLE_PROMPT} compact />

            <p style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600, margin: 0 }}>
              Reveal mode (clicca per toggle):
            </p>
            <div onClick={() => setRevealed(!revealed)} style={{ cursor: 'pointer' }}>
              <PromptCard
                text={SAMPLE_PROMPT}
                revealMode={revealed}
                winnerAnswer={SAMPLE_ANSWER}
              />
            </div>

            <p style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 500, margin: 0, textAlign: 'center' }}>
              {revealed ? 'Clicca per nascondere' : 'Clicca per rivelare'}
            </p>
          </div>
        )}

        {phase === 'selection' && (
          <SentenzaSelection
            prompt={SAMPLE_PROMPT}
            answers={MOCK_ANSWERS}
            timeLeft={22}
            total={30}
            onSubmit={(id) => console.log('submitted:', id)}
          />
        )}

        {phase === 'selection_judge' && (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MOCK_PLAYERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSubmittedIds((prev) =>
                    prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                  )}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    border: submittedIds.includes(p.id) ? '2px solid var(--success)' : '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {submittedIds.includes(p.id) ? '✓' : '○'} {p.name}
                </button>
              ))}
            </div>
            <SentenzaSelectionWaiting
              prompt={SAMPLE_PROMPT}
              players={MOCK_PLAYERS}
              submittedIds={submittedIds}
              timeLeft={18}
              total={30}
            />
          </>
        )}

        {phase === 'judging_setup' && (
          <JudgingSetup
            judgeName="Marco"
            judgeColor="#3B82F6"
            round={3}
            prompt={SAMPLE_PROMPT}
          />
        )}

        {phase === 'judging' && (
          <SentenzaJudging
            prompt={SAMPLE_PROMPT}
            proofs={MOCK_PROOFS}
            timeLeft={25}
            total={30}
            onVerdict={(id) => console.log('verdict:', id)}
          />
        )}

        {phase === 'judging_wait' && (
          <SentenzaJudgingWaiting
            prompt={SAMPLE_PROMPT}
            myAnswer="la mia ex che ora è su Tinder"
            judgeName="Marco"
            timeLeft={20}
            total={30}
          />
        )}

        {phase === 'reveal' && (
          <SentenzaReveal
            prompt={SAMPLE_PROMPT}
            winnerAnswer={SAMPLE_ANSWER}
            winnerName="Giulia"
            winnerColor="#EC4899"
            otherProofs={MOCK_OTHER_PROOFS}
            isHost
            onNext={() => console.log('next round')}
          />
        )}

        {phase === 'final' && (
          <SentenzaFinal
            players={MOCK_SCORED}
            localPlayerId="p1"
            isHost
            onReplay={() => console.log('replay')}
            onChangeGame={() => console.log('change game')}
          />
        )}
      </div>
    </div>
  )
}

export default SentenzaTest
