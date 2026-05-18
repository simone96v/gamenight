// LoginScreen — sign-in con Google OAuth + email/password (con toggle sign-up).
// Punto di ingresso: /login?next=/create (redirect dopo auth).

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Blob from '../components/Blob'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import GradientTitle from '../components/ui/GradientTitle'
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
} from '../lib/auth'

const NEXT_PARAM = 'next'

const LoginScreen = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get(NEXT_PARAM) || '/'

  const [mode, setMode] = useState('signin')   // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [info, setInfo] = useState(null)
  const [resetSent, setResetSent] = useState(false)

  const handleForgotPassword = async () => {
    setErrorMsg(null)
    setInfo(null)
    const target = email.trim()
    if (!target) {
      setErrorMsg('Inserisci la tua email qui sopra e poi clicca di nuovo "Password dimenticata?"')
      return
    }
    setLoading(true)
    const { error } = await sendPasswordReset(target)
    setLoading(false)
    if (error) {
      setErrorMsg(translateError(error.message))
      return
    }
    setResetSent(true)
    setInfo(`Ti abbiamo inviato un'email di reset a ${target}. Clicca il link per impostare una nuova password.`)
  }

  const isSignUp = mode === 'signup'
  const canSubmit = email.trim() && password.length >= 6 && (!isSignUp || displayName.trim()) && !loading

  const handleGoogle = async () => {
    setLoading(true)
    setErrorMsg(null)
    // Passa `next` come query del callback in modo da poter ridirigere dopo lo scambio del code.
    const redirect = `${window.location.origin}/auth/callback?${NEXT_PARAM}=${encodeURIComponent(next)}`
    const { error } = await signInWithGoogle(redirect)
    if (error) {
      setErrorMsg(error.message || 'Login Google fallito')
      setLoading(false)
    }
    // In caso di successo il browser viene ridiretto a Google.
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setErrorMsg(null)
    setInfo(null)

    if (isSignUp) {
      const { session, error } = await signUpWithEmail({ email, password, displayName })
      if (error) {
        setErrorMsg(translateError(error.message))
        setLoading(false)
        return
      }
      if (!session) {
        // L'email confirmation è attiva su Supabase: bisogna confermare l'email.
        setInfo('Ti abbiamo inviato un\'email di conferma. Cliccala per accedere.')
        setLoading(false)
        return
      }
      navigate(next, { replace: true })
    } else {
      const { error } = await signInWithEmail(email, password)
      if (error) {
        setErrorMsg(translateError(error.message))
        setLoading(false)
        return
      }
      navigate(next, { replace: true })
    }
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
        onSubmit={handleEmailSubmit}
        style={{
          gap: 'clamp(10px, 1.6dvh, 18px)',
          paddingTop: 'clamp(12px, 2.5dvh, 28px)',
          paddingBottom: 'clamp(12px, 2dvh, 20px)',
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', flexShrink: 0 }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <Blob
              color="#F59E0B"
              expr="happy"
              id="login-blob"
              size="clamp(80px, 16dvh, 120px)"
              animate={false}
              style={{ position: 'relative' }}
            />
          </div>
          <GradientTitle as="h1" size="lg">
            {isSignUp ? 'Crea il tuo account' : 'Accedi'}
          </GradientTitle>
          <p style={subtitleStyle}>
            {isSignUp
              ? 'Salva il tuo profilo, lo storico e le classifiche.'
              : 'Bentornato! Accedi per creare un party.'}
          </p>
        </motion.div>

        {/* Google */}
        <Button
          type="button"
          variant="secondary"
          width="full"
          disabled={loading}
          onClick={handleGoogle}
          style={{ gap: 10 }}
        >
          <GoogleIcon />
          {isSignUp ? 'Iscriviti con Google' : 'Accedi con Google'}
        </Button>

        <div style={dividerStyle}>
          <span style={dividerLineStyle} />
          <span style={dividerTextStyle}>oppure</span>
          <span style={dividerLineStyle} />
        </div>

        {/* Email / password */}
        <div style={cardStyle}>
          {isSignUp && (
            <>
              <div style={labelStyle}>✍️ Nome visualizzato</div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Es. Marco"
                maxLength={24}
                autoComplete="nickname"
                style={inputStyle}
              />
            </>
          )}

          <div style={{ ...labelStyle, marginTop: isSignUp ? 12 : 0 }}>✉️ Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="mario@example.com"
            autoComplete="email"
            style={inputStyle}
          />

          <div style={{ ...labelStyle, marginTop: 12 }}>🔒 Password</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Almeno 6 caratteri"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            minLength={6}
            style={inputStyle}
          />
        </div>

        {errorMsg && (
          <p role="alert" style={errorTextStyle}>⚠ {errorMsg}</p>
        )}
        {info && (
          <p style={infoTextStyle}>📬 {info}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          width="full"
          disabled={!canSubmit}
          style={
            canSubmit
              ? {
                  background:
                    'linear-gradient(#0F172A, #0F172A) padding-box, linear-gradient(90deg, #8B5CF6, #3B82F6, #10B981, #F59E0B, #F43F5E, #EC4899) border-box',
                  color: '#fff',
                  border: '3px solid transparent',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                }
              : undefined
          }
        >
          {loading ? '...' : isSignUp ? 'Crea account' : 'Accedi'}
        </Button>

        {!isSignUp && (
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading || resetSent}
            style={{ ...switchButtonStyle, opacity: resetSent ? 0.5 : 1 }}
          >
            {resetSent ? '✓ Email inviata' : 'Password dimenticata?'}
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(isSignUp ? 'signin' : 'signup')
            setErrorMsg(null)
            setInfo(null)
            setResetSent(false)
          }}
          style={switchButtonStyle}
        >
          {isSignUp ? 'Hai già un account? Accedi' : 'Non hai un account? Iscriviti'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          style={guestButtonStyle}
        >
          Continua come ospite →
        </button>
      </form>
    </motion.div>
  )
}

const translateError = (msg) => {
  if (!msg) return 'Errore sconosciuto'
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email o password non corretti'
  if (m.includes('user already registered')) return 'Email già registrata. Prova ad accedere.'
  if (m.includes('email not confirmed')) return 'Conferma l\'email prima di accedere.'
  if (m.includes('password should be at least')) return 'La password deve avere almeno 6 caratteri'
  if (m.includes('rate')) return 'Troppi tentativi. Riprova tra qualche secondo.'
  return msg
}

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.604 4.604 0 0 1-1.996 3.022v2.51h3.232c1.891-1.741 2.982-4.305 2.982-7.355z" fill="#4285F4"/>
    <path d="M12 22c2.7 0 4.964-.895 6.618-2.418l-3.232-2.51c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.759-5.595-4.123H3.064v2.59A9.996 9.996 0 0 0 12 22z" fill="#34A853"/>
    <path d="M6.405 13.904A5.998 5.998 0 0 1 6.09 12c0-.66.114-1.302.316-1.904V7.505H3.064A9.997 9.997 0 0 0 2 12c0 1.614.386 3.14 1.064 4.495l3.341-2.59z" fill="#FBBC05"/>
    <path d="M12 5.977c1.468 0 2.786.504 3.823 1.495l2.868-2.868C16.959 2.99 14.695 2 12 2A9.996 9.996 0 0 0 3.064 7.505l3.341 2.591C7.191 7.735 9.395 5.977 12 5.977z" fill="#EA4335"/>
  </svg>
)

// --- Styles (allineati a CreatePartyScreen) ---
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
  flexShrink: 0,
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

const dividerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  margin: '4px 0',
}

const dividerLineStyle = {
  flex: 1,
  height: 1,
  background: 'var(--border)',
}

const dividerTextStyle = {
  color: 'var(--muted)',
  fontSize: 'clamp(11px, 1.4dvh, 13px)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const errorTextStyle = {
  margin: 0,
  color: 'var(--danger)',
  fontSize: 'clamp(12px, 1.5dvh, 14px)',
  fontWeight: 700,
  textAlign: 'center',
}

const infoTextStyle = {
  margin: 0,
  color: 'var(--text)',
  background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
  borderRadius: 'var(--radius-sm)',
  padding: 'clamp(8px, 1.2dvh, 12px)',
  fontSize: 'clamp(12px, 1.5dvh, 14px)',
  fontWeight: 600,
  textAlign: 'center',
}

const switchButtonStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--muted)',
  fontSize: 'clamp(12px, 1.5dvh, 14px)',
  fontWeight: 600,
  cursor: 'pointer',
  padding: 'clamp(6px, 1dvh, 10px) 0',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
}

const guestButtonStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--muted)',
  fontSize: 'clamp(11px, 1.4dvh, 13px)',
  fontWeight: 600,
  cursor: 'pointer',
  opacity: 0.7,
}

export default LoginScreen
