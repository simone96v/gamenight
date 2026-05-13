import { motion, AnimatePresence } from 'framer-motion'

const PromptCard = ({ text, revealMode = false, winnerAnswer = '', compact = false }) => {
  const parts = text ? text.split('___') : ['']
  const hasBlank = parts.length > 1

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        ...S.card,
        padding: compact ? 'clamp(14px, 2dvh, 18px) clamp(16px, 3vw, 22px)' : 'clamp(20px, 3dvh, 28px) clamp(18px, 4vw, 26px)',
      }}
    >
      <p style={{
        ...S.text,
        fontSize: compact
          ? 'clamp(15px, 1.9dvh, 19px)'
          : 'clamp(18px, 2.4dvh, 24px)',
      }}>
        {hasBlank ? (
          <>
            {parts[0]}
            <AnimatePresence mode="wait">
              {revealMode && winnerAnswer ? (
                <motion.span
                  key="answer"
                  initial={{ opacity: 0, scale: 0.8, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={S.answer}
                >
                  {winnerAnswer}
                </motion.span>
              ) : (
                <motion.span
                  key="blank"
                  style={S.blank}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ___
                </motion.span>
              )}
            </AnimatePresence>
            {parts[1]}
          </>
        ) : (
          text
        )}
      </p>
    </motion.div>
  )
}

const S = {
  card: {
    background: 'linear-gradient(145deg, #1E1B4B 0%, #312E81 50%, #3730A3 100%)',
    borderRadius: 'var(--radius)',
    boxShadow: '0 12px 32px rgba(49, 46, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  text: {
    color: '#fff',
    fontWeight: 700,
    lineHeight: 1.45,
    margin: 0,
    letterSpacing: '-0.01em',
  },
  blank: {
    display: 'inline',
    background: 'linear-gradient(90deg, #818CF8, #A78BFA, #C084FC)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 900,
    letterSpacing: '0.05em',
    padding: '0 2px',
  },
  answer: {
    display: 'inline',
    background: 'linear-gradient(90deg, #818CF8, #C084FC, #F0ABFC)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 900,
    textDecoration: 'underline',
    textDecorationColor: 'rgba(192, 132, 252, 0.4)',
    textUnderlineOffset: '3px',
    textDecorationThickness: '2px',
    padding: '0 2px',
  },
}

export default PromptCard
