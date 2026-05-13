// Card della domanda — altezza FISSA identica in entrambe le fasi (question/reveal)
// così i box risposta non si spostano mai.

import { motion } from 'framer-motion'
import { DIFFICULTY_STARS } from '../constants'

const QuestionCard = ({ question, compact = false }) => {
  if (!question) return null
  const stars = DIFFICULTY_STARS[question.difficulty] ?? 2
  const diffColor =
    question.difficulty === 'hard' ? 'var(--danger)' :
    question.difficulty === 'easy' ? 'var(--success)' : 'var(--warning)'

  return (
    <motion.div
      key={question.question}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: 'clamp(12px, 1.8dvh, 18px) clamp(14px, 3vw, 20px)',
        gap: 6,
        // Altezza fissa — identica in question e reveal
        height: 'clamp(130px, 18dvh, 200px)',
        boxSizing: 'border-box',
      }}
    >
      {/* Difficulty dots (top-right) */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 2,
        flexShrink: 0,
      }} aria-label={`Difficoltà ${question.difficulty}`}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            fontSize: 12,
            color: i < stars ? diffColor : 'var(--border-strong)',
            lineHeight: 1,
          }}>
            ●
          </span>
        ))}
      </div>

      {/* Question text — centered in remaining space */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 0,
        overflow: 'auto',
      }}>
        <h2 style={{
          margin: 0,
          fontWeight: 800,
          fontSize: 'clamp(15px, 2.2dvh, 20px)',
          lineHeight: 1.35,
          textAlign: 'center',
          letterSpacing: '-0.01em',
          color: 'var(--text)',
        }}>
          {question.question}
        </h2>
      </div>
    </motion.div>
  )
}

export default QuestionCard
