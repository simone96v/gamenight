// ModeScreen — secondo step del flow: scelta della modalità.
// Visibile solo dopo aver scelto una categoria in HomeScreen.
// 3 opzioni: Single device / Multiplayer / Ho un codice.

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import GradientTitle from '../components/ui/GradientTitle'
import OptionCard from '../components/ui/OptionCard'
import LinkCta from '../components/ui/LinkCta'
import Spinner from '../components/ui/Spinner'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { getCategory } from '../data/categories'
import { createRoom } from '../lib/room'

const MODES = [
  {
    id: 'local',
    emoji: '📱',
    title: 'Single device',
    description: 'Tutti sullo stesso telefono. Passa e gioca.',
    bg: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    shadow: 'rgba(6, 182, 212, 0.35)',
  },
  {
    id: 'online',
    emoji: '🌐',
    title: 'Multiplayer',
    description: 'Crea una stanza e invita gli amici online.',
    bg: '#111827',
    shadow: 'rgba(0, 0, 0, 0.40)',
  },
  {
    id: 'join',
    emoji: '🔑',
    title: 'Ho un codice',
    description: 'Entra in una stanza già creata da un amico.',
    bg: 'linear-gradient(135deg, #FB923C 0%, #F97316 100%)',
    shadow: 'rgba(249, 115, 22, 0.35)',
  },
]

const ModeScreen = () => {
  const navigate = useNavigate()
  const category = useSettings((s) => s.category)
  const setOnlineMode = useSession((s) => s.setOnlineMode)
  const showError = useSession((s) => s.showError)
  const [creating, setCreating] = useState(false)

  const cat = getCategory(category)

  // Se l'utente arriva qui senza aver scelto categoria, rimandalo alla home.
  useEffect(() => {
    if (!cat) navigate('/', { replace: true })
  }, [cat, navigate])

  const handleSelect = async (modeId) => {
    if (creating) return
    if (modeId === 'local') {
      navigate('/games')
      return
    }
    if (modeId === 'join') {
      navigate('/join')
      return
    }
    setCreating(true)
    const { code, error } = await createRoom({
      players: [],
      selectedCategory: category,
      categoryVotes: {},
      gameVotes: {},
      selectedGame: null,
    })
    if (error || !code) {
      showError('generic')
      setCreating(false)
      return
    }
    setOnlineMode(code, true, null)
    setCreating(false)
    navigate('/lobby')
  }

  if (!cat) return null

  return (
    <motion.div
      className="screen screen-narrow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <AppHeader />
      <ErrorBanner />
      <div
        className="screen-body"
        style={{ justifyContent: 'center', gap: 'clamp(12px, 1.8dvh, 18px)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: 'clamp(4px, 1dvh, 10px)' }}
        >
          <GradientTitle as="h1" size="lg">Come vuoi giocare?</GradientTitle>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 'clamp(13px, 1.7dvh, 15px)' }}>
            {cat.emoji} {cat.label}
          </p>
        </motion.div>

        {MODES.map((mode, i) => (
          <OptionCard
            key={mode.id}
            option={mode}
            index={i}
            onClick={() => handleSelect(mode.id)}
            disabled={creating && mode.id === 'online'}
            badge={creating && mode.id === 'online' ? <Spinner size="sm" /> : null}
          />
        ))}
      </div>
      <div className="screen-footer" style={{ justifyContent: 'center' }}>
        <LinkCta onClick={() => navigate('/', { replace: true })}>
          ← Cambia categoria
        </LinkCta>
      </div>
    </motion.div>
  )
}

export default ModeScreen
