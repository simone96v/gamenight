// GlobalMenu — drawer di navigazione globale.
// Renderizza solo il drawer + backdrop. Lo stato open/close vive in useNavMenu;
// il pulsante hamburger (MenuButton) è ospitato dentro AppHeader (o barre custom).

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSession } from '../stores/useSession'
import { useSettings } from '../stores/useSettings'
import { useNavMenu } from '../stores/useNavMenu'
import { closeRoom } from '../lib/room'

const SPRING = { type: 'spring', stiffness: 320, damping: 26 }

const NAV_ITEMS = [
  { id: 'home',   label: 'Home',             emoji: '🏠', path: '/',       reset: true },
  { id: 'create', label: 'Party',            emoji: '🎉', path: '/create' },
  { id: 'solo',   label: 'Gioca da solo',    emoji: '🎮', path: '/solo' },
  { id: 'join',   label: 'Ho già un codice', emoji: '🔑', path: '/join' },
]

const GlobalMenu = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const open = useNavMenu((s) => s.open)
  const close = useNavMenu((s) => s.close)

  const isHost = useSession((s) => s.isHost)
  const roomCode = useSession((s) => s.roomCode)
  const resetSession = useSession((s) => s.resetSession)

  const theme = useSettings((s) => s.theme)
  const toggleTheme = useSettings((s) => s.toggleTheme)
  const isDark = theme === 'dark'

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const leaveRoomIfNeeded = useCallback(async () => {
    if (isHost && roomCode) {
      try { await closeRoom(roomCode) } catch { /* best-effort */ }
    }
  }, [isHost, roomCode])

  const handleNavigate = useCallback(async (item) => {
    close()
    const leavingRoom = !!roomCode && (item.reset || item.path !== location.pathname)
    if (leavingRoom) {
      await leaveRoomIfNeeded()
      resetSession()
    }
    navigate(item.path, { replace: item.reset === true })
  }, [navigate, location.pathname, roomCode, leaveRoomIfNeeded, resetSession, close])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="gm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
            style={S.backdrop}
            aria-hidden="true"
          />

          <motion.aside
            key="gm-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu di navigazione"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={SPRING}
            style={S.drawer}
          >
            <div style={S.drawerHeader}>
              <span style={S.drawerTitle}>Menu</span>
              <motion.button
                type="button"
                onClick={close}
                aria-label="Chiudi"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                style={S.closeBtn}
              >
                ✕
              </motion.button>
            </div>

            <nav style={S.nav}>
              {NAV_ITEMS.map((item, i) => {
                const active = item.path === location.pathname
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item)}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.04 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 1, scale: 0.97 }}
                    style={{
                      ...S.navItem,
                      ...(active ? S.navItemActive : null),
                    }}
                  >
                    <span style={S.navEmoji}>{item.emoji}</span>
                    <span>{item.label}</span>
                    {active && <span style={S.activeDot} aria-hidden="true" />}
                  </motion.button>
                )
              })}
            </nav>

            <div style={S.footer}>
              <motion.button
                type="button"
                onClick={toggleTheme}
                whileHover={{ y: -2 }}
                whileTap={{ y: 1, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                aria-label={isDark ? 'Passa a modalità chiara' : 'Passa a modalità scura'}
                style={S.themeBtn}
              >
                <span style={S.navEmoji}>{isDark ? '☀️' : '🌙'}</span>
                <span>{isDark ? 'Tema chiaro' : 'Tema scuro'}</span>
              </motion.button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

const S = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 17, 23, 0.45)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 45,
  },
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 'min(86vw, 320px)',
    background: 'var(--surface)',
    borderLeft: '1px solid var(--border)',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex',
    flexDirection: 'column',
    padding: 'max(16px, env(safe-area-inset-top)) 16px 16px',
    zIndex: 46,
    color: 'var(--text)',
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'clamp(14px, 2dvh, 18px)',
  },
  drawerTitle: {
    fontFamily: "'Baloo 2', cursive",
    fontSize: 'clamp(18px, 2.4dvh, 22px)',
    fontWeight: 800,
    letterSpacing: '-0.01em',
  },
  closeBtn: {
    background: 'var(--bg2)',
    border: 'none',
    width: 32,
    height: 32,
    borderRadius: '50%',
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flex: 1,
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 700,
    fontSize: 'clamp(14px, 1.9dvh, 16px)',
    letterSpacing: '-0.01em',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    position: 'relative',
  },
  navItemActive: {
    background: 'color-mix(in srgb, var(--warning) 14%, var(--surface))',
    border: '1px solid color-mix(in srgb, var(--warning) 35%, var(--border-strong))',
  },
  navEmoji: {
    fontSize: 20,
    lineHeight: 1,
    flexShrink: 0,
  },
  activeDot: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--warning)',
    boxShadow: '0 0 0 3px color-mix(in srgb, var(--warning) 25%, transparent)',
  },
  footer: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: '1px solid var(--border)',
  },
  themeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: 'transparent',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    fontFamily: "'Baloo 2', cursive",
    fontWeight: 700,
    fontSize: 'clamp(13px, 1.8dvh, 15px)',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },
}

export default GlobalMenu
