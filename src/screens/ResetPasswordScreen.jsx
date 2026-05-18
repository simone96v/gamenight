// ResetPasswordScreen — atterraggio dal link "reset password" via email.
// supabase-js (detectSessionInUrl: true) ha già scambiato il token nel router prima
// di arrivare qui: l'utente ha quindi una sessione temporanea valida solo per
// updateUser({ password }). Dopo il save reindirizza alla home.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Blob from '../components/Blob'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import GradientTitle from '../components/ui/GradientTitle'
import { useAuth } from '../stores/useAuth'
import { updatePassword } from '../lib/auth'

const ResetPasswordScreen = () => {
  const navigate = useNavigate()
  const status = useAuth((s) => s.status)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [done, setDone] = useState(false)

  // Se non c'è sessione (link scaduto / utente già loggato altrove) torna al login.
  useEffect(() => {
    if (status === 'guest') {
      const t = setTimeout(() => navigate('/login', { replace: true }), 2000)
      return () => clearTimeout(t)
    }
  }, [status, navigate])

  const canSubmit = password.length >= 6 && password === confirmPassword && !loading

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setErrorMsg(null)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) {
      setErrorMsg(translateError(error.message))
      return
    }
    setDone(true)
    setTimeout(() => navigate('/', { replace: true }), 1500)
  }

  if (status === 'guest') {
    return (
      <div style={centerStyle}>
        <Blob color="#F43F5E" expr="sad" id="reset-error" size={100} animate />
        <h2 style={{ margin: 0 }}>Link scaduto</h2>
        <p style={{ color: 'var(--muted)' }}>Ti riportiamo al login...</p>
      </div>
    )
  }

  return (
    <motion.div
      className="screen screen-narrow"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <AppHeader
        leading={
          <IconButton ariaLabel="Indietro" onClick={() => navigate('/', { replace: true })}>
            ←
          </IconButton>
        }
      />
      <ErrorBanner />

      <form
        className="screen-body"
        onSubmit={handleSubmit}
        style={{
          gap: 'clamp(10px, 1.6dvh, 18px)',
          paddingTop: 'clamp(12px, 2.5dvh, 28px)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <Blob color="#10B981" expr="happy" id="reset-blob" size={100} animate={false} />
          </div>
          <GradientTitle as="h1" size="lg">
            Nuova password
          </GradientTitle>
          <p style={subtitleStyle}>Scegli una nuova password di almeno 6 caratteri.</p>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>🔒 Nuova password</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Almeno 6 caratteri"
            autoComplete="new-password"
            minLength={6}
            style={inputStyle}
          />
          <div style={{ ...labelStyle, marginTop: 12 }}>🔒 Conferma password</div>
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            placeholder="Ripeti password"
            autoComplete="new-password"
            minLength={6}
            style={{
              ...inputStyle,
              borderColor: confirmPassword && password !== confirmPassword ? 'var(--danger)' : 'var(--border)',
            }}
          />
          {confirmPassword && password !== confirmPassword && (
            <p style={{ margin: '6px 0 0', color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}>
              ⚠ Le password non corrispondono
            </p>
          )}
        </div>

        {errorMsg && <p role="alert" style={errorTextStyle}>⚠ {errorMsg}</p>}
        {done && <p style={savedTextStyle}>✓ Password aggiornata, ti riportiamo alla home...</p>}

        <Button type="submit" variant="primary" width="full" disabled={!canSubmit}>
          {loading ? '...' : 'Salva nuova password'}
        </Button>
      </form>
    </motion.div>
  )
}

const translateError = (msg) => {
  if (!msg) return 'Errore sconosciuto'
  const m = msg.toLowerCase()
  if (m.includes('same') || m.includes('different')) return 'La nuova password deve essere diversa da quella attuale'
  if (m.includes('password should be at least')) return 'La password deve avere almeno 6 caratteri'
  if (m.includes('weak')) return 'Password troppo debole — usa almeno 8 caratteri o aggiungi numeri'
  return msg
}

const centerStyle = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  padding: 24,
}

const subtitleStyle = {
  margin: '4px 0 0',
  color: 'var(--muted)',
  fontSize: 'clamp(11px, 1.4dvh, 14px)',
  fontWeight: 600,
}

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: 'clamp(10px, 1.6dvh, 16px)',
  boxShadow: 'var(--shadow-sm)',
}

const labelStyle = {
  fontSize: 'clamp(11px, 1.3dvh, 13px)',
  color: 'var(--muted)',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 'clamp(4px, 0.8dvh, 8px)',
}

const inputStyle = {
  width: '100%',
  minWidth: 0,
  height: 'clamp(40px, 5.5dvh, 52px)',
  background: 'var(--surface)',
  border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontSize: 'clamp(14px, 1.8dvh, 18px)',
  padding: '0 clamp(12px, 2vw, 16px)',
  outline: 'none',
  boxSizing: 'border-box',
}

const errorTextStyle = {
  margin: 0,
  color: 'var(--danger)',
  fontSize: 'clamp(12px, 1.5dvh, 14px)',
  fontWeight: 700,
  textAlign: 'center',
}

const savedTextStyle = {
  margin: 0,
  color: 'var(--success, #10B981)',
  fontSize: 'clamp(12px, 1.5dvh, 14px)',
  fontWeight: 700,
  textAlign: 'center',
}

export default ResetPasswordScreen
