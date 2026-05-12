import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import AgeModal from '../components/AgeModal'
import Card from '../components/ui/Card'
import { CATEGORIES } from '../data/categories'
import { useSettings } from '../stores/useSettings'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

const HomeScreen = () => {
  const navigate = useNavigate()
  const [pendingCategory, setPendingCategory] = useState(null)
  const setCategory = useSettings((s) => s.setCategory)
  const ageConfirmed = useSettings((s) => s.ageConfirmed)
  const confirmAge = useSettings((s) => s.confirmAge)

  const handleSelect = (cat) => {
    if (cat.ageWarning && !ageConfirmed) {
      setPendingCategory(cat)
      return
    }
    setCategory(cat.id)
    navigate('/mode')
  }

  const handleAgeConfirm = () => {
    confirmAge()
    if (pendingCategory) {
      setCategory(pendingCategory.id)
      setPendingCategory(null)
      navigate('/mode')
    }
  }

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <AppHeader />
      <ErrorBanner />
      <motion.div
        className="screen-body scrollable-list"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {CATEGORIES.map((cat) => (
          <motion.div key={cat.id} variants={itemVariants}>
            <Card onClick={() => handleSelect(cat)}>
              <div className="flex items-center" style={{ gap: 'clamp(10px, 2vw, 16px)' }}>
                <span style={{ fontSize: 'clamp(28px, 5dvh, 40px)' }}>{cat.emoji}</span>
                <div>
                  <div
                    className="font-bold"
                    style={{ fontSize: 'clamp(16px, 2.5dvh, 22px)', color: cat.color }}
                  >
                    {cat.name}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 'clamp(13px, 1.8dvh, 15px)' }}>
                    {cat.tagline}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
      <div className="screen-footer" />
      <AgeModal
        open={!!pendingCategory}
        onConfirm={handleAgeConfirm}
        onCancel={() => setPendingCategory(null)}
      />
    </motion.div>
  )
}

export default HomeScreen
