// Error boundary di alto livello: cattura qualunque render crash e mostra una
// fallback UI invece della pagina bianca. Visualizza anche l'errore (utile per
// debug remoto: ce lo mandano in screenshot) + bottone "Resetta tutto" che pulisce
// localStorage/sessionStorage e ricarica.
//
// Montato in App.jsx sopra <Routes>.

import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
    this.setState({ info })
  }

  handleReset = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch { /* ignore */ }
    window.location.href = '/'
  }

  handleRetry = () => {
    this.setState({ error: null, info: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    const msg = this.state.error?.message ?? String(this.state.error)
    const stack = this.state.info?.componentStack ?? this.state.error?.stack ?? ''

    return (
      <div style={S.wrap}>
        <div style={S.card}>
          <div style={S.emoji}>😵‍💫</div>
          <h1 style={S.title}>Oops, qualcosa è andato storto</h1>
          <p style={S.msg}>{msg}</p>

          <div style={S.actions}>
            <button type="button" onClick={this.handleRetry} style={S.btnSecondary}>
              Riprova
            </button>
            <button type="button" onClick={this.handleReset} style={S.btnPrimary}>
              Resetta tutto
            </button>
          </div>

          {stack && (
            <details style={S.details}>
              <summary style={S.summary}>Dettagli tecnici</summary>
              <pre style={S.pre}>{stack}</pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}

const S = {
  wrap: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'var(--bg, #F5F3FF)',
    color: 'var(--text, #1F2937)',
  },
  card: {
    maxWidth: 480,
    width: '100%',
    background: 'var(--surface, #FFF)',
    borderRadius: 22,
    padding: '28px 24px',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.18)',
    textAlign: 'center',
  },
  emoji: { fontSize: 48, lineHeight: 1, marginBottom: 12 },
  title: { margin: '0 0 8px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' },
  msg: {
    margin: '0 0 20px',
    fontSize: 14,
    color: 'var(--muted, #6B7280)',
    wordBreak: 'break-word',
  },
  actions: { display: 'flex', gap: 10, justifyContent: 'center' },
  btnPrimary: {
    background: 'var(--accent, #111827)',
    color: 'var(--bg, #fff)',
    border: 'none',
    padding: '12px 22px',
    borderRadius: 14,
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
  },
  btnSecondary: {
    background: 'transparent',
    color: 'var(--text, #1F2937)',
    border: '1.5px solid var(--border-strong, rgba(31,41,55,0.16))',
    padding: '12px 22px',
    borderRadius: 14,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  },
  details: { marginTop: 20, textAlign: 'left' },
  summary: {
    cursor: 'pointer',
    fontSize: 12,
    color: 'var(--muted, #6B7280)',
    fontWeight: 600,
  },
  pre: {
    fontSize: 11,
    background: 'rgba(31,41,55,0.04)',
    padding: 12,
    borderRadius: 8,
    overflow: 'auto',
    maxHeight: 200,
    marginTop: 8,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
}

export default ErrorBoundary
