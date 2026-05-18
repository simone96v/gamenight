// AuthCallbackScreen — landing dopo redirect OAuth.
// supabase-js (detectSessionInUrl: true) ha già scambiato il `?code=...` con una sessione
// quando arriviamo qui. Aspettiamo che `useAuth` esca da 'loading' e poi ridirigiamo a `next`.

import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../stores/useAuth'
import GradientTitle from '../components/ui/GradientTitle'
import Blob from '../components/Blob'

const AuthCallbackScreen = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const status = useAuth((s) => s.status)

  // Supabase passa eventuali errori OAuth come hash (#error=...) o query.
  const oauthError = useMemo(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const err = params.get('error') || hashParams.get('error_description') || hashParams.get('error')
    return err ? decodeURIComponent(err) : null
  }, [params])

  useEffect(() => {
    if (oauthError) return
    if (status === 'authenticated') {
      const next = params.get('next') || '/'
      navigate(next, { replace: true })
    } else if (status === 'guest') {
      // Lo scambio del code è fallito (es. il code era scaduto): torna a /login.
      navigate('/login', { replace: true })
    }
  }, [status, oauthError, navigate, params])

  return (
    <div
      className="screen"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 24,
      }}
    >
      <Blob color="#F59E0B" expr="happy" id="auth-cb" size={120} animate />
      <GradientTitle as="h2" size="md">
        {oauthError ? 'Login fallito' : 'Accesso in corso...'}
      </GradientTitle>
      {oauthError && (
        <>
          <p style={{ color: 'var(--danger)', fontWeight: 600, textAlign: 'center', margin: 0 }}>
            {oauthError}
          </p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text)',
              fontSize: 14,
              fontWeight: 600,
              padding: '10px 20px',
              cursor: 'pointer',
            }}
          >
            Torna al login
          </button>
        </>
      )}
    </div>
  )
}

export default AuthCallbackScreen
