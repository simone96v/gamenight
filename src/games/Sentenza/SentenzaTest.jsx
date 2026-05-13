import { useState } from 'react'
import GradientTitle from '../../components/ui/GradientTitle'
import PromptCard from './components/PromptCard'

const SAMPLE_PROMPT = "Il mio terapeuta ha mollato dopo che gli ho parlato di ___"
const SAMPLE_ANSWER = "tre Spritz, due tequila e un crollo emotivo"

const PHASES = ['promptcard', 'selection', 'judging_setup', 'judging', 'reveal', 'final']

const SentenzaTest = () => {
  const [phase, setPhase] = useState('promptcard')
  const [revealed, setRevealed] = useState(false)

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

        {phase !== 'promptcard' && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
          }}>
            <p style={{ color: 'var(--muted)', fontWeight: 600 }}>
              Phase: <strong style={{ color: '#6366F1' }}>{phase}</strong> — in arrivo
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SentenzaTest
