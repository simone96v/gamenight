// ProfileScreen — modifica profilo + stats aggregate + logout.
// Richiede auth (gated dal router).

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import ErrorBanner from '../components/ErrorBanner'
import Blob from '../components/Blob'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import GradientTitle from '../components/ui/GradientTitle'
import ColorPicker from '../components/ColorPicker'
import Modal from '../components/ui/Modal'
import { useAuth } from '../stores/useAuth'
import { updateProfile, signOut, getUserStats, listMatchHistory, deleteMyAccount } from '../lib/auth'

const ProfileScreen = () => {
  const navigate = useNavigate()
  const status = useAuth((s) => s.status)
  const user = useAuth((s) => s.user)
  const profile = useAuth((s) => s.profile)
  const setProfile = useAuth((s) => s.setProfile)

  // Gate: rotta privata. Se guest → /login. Se idle/loading → render placeholder.
  useEffect(() => {
    if (status === 'guest') navigate('/login?next=/profile', { replace: true })
  }, [status, navigate])

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [blobColor, setBlobColor] = useState(profile?.blob_color || '#F59E0B')
  const [avatarEmoji, setAvatarEmoji] = useState(profile?.avatar_emoji || '🟡')
  const [profileSeeded, setProfileSeeded] = useState(!!profile)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [errorMsg, setErrorMsg] = useState(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Sync iniziale da profilo (pattern canonico React: setState durante il render,
  // gated da flag per garantire one-shot). Se profile arriva dopo, popola form.
  if (!profileSeeded && profile) {
    setProfileSeeded(true)
    if (profile.display_name) setDisplayName(profile.display_name)
    if (profile.blob_color) setBlobColor(profile.blob_color)
    if (profile.avatar_emoji) setAvatarEmoji(profile.avatar_emoji)
  }

  useEffect(() => {
    if (!user) return
    let cancel = false
    Promise.all([getUserStats(user.id), listMatchHistory({ limit: 5 })])
      .then(([{ stats: s }, { rows }]) => {
        if (cancel) return
        setStats(s)
        setHistory(rows || [])
      })
    return () => { cancel = true }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setErrorMsg(null)
    const { profile: updated, error } = await updateProfile(user.id, {
      display_name: displayName,
      blob_color: blobColor,
      avatar_emoji: avatarEmoji,
    })
    setSaving(false)
    if (error) {
      setErrorMsg(error.message || 'Salvataggio fallito')
      return
    }
    setProfile({ ...profile, ...(updated || {}) })
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1800)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'ELIMINA') return
    setDeleting(true)
    setErrorMsg(null)
    const { error } = await deleteMyAccount()
    setDeleting(false)
    if (error) {
      setErrorMsg(error.message || 'Eliminazione fallita. Riprova.')
      return
    }
    setDeleteOpen(false)
    navigate('/', { replace: true })
  }

  if (!user) return null

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

      <div
        className="screen-body"
        style={{
          gap: 'clamp(10px, 1.6dvh, 18px)',
          paddingTop: 'clamp(12px, 2.5dvh, 28px)',
          paddingBottom: 'clamp(12px, 2dvh, 20px)',
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <Blob
              color={blobColor}
              expr="happy"
              id="profile-blob"
              size="clamp(100px, 20dvh, 150px)"
              animate={false}
            />
          </div>
          <GradientTitle as="h1" size="lg">
            {profile?.display_name || 'Il tuo profilo'}
          </GradientTitle>
          <p style={subtitleStyle}>{user.email}</p>
        </div>

        {/* Stats */}
        <div style={cardStyle}>
          <div style={labelStyle}>📊 Statistiche</div>
          <div style={statsGridStyle}>
            <StatTile emoji="🎉" label="Party" value={stats?.parties_played ?? 0} />
            <StatTile emoji="🎮" label="Solo" value={stats?.solo_played ?? 0} />
            <StatTile emoji="🏆" label="Vittorie" value={stats?.wins ?? 0} />
            <StatTile emoji="🎯" label="Totali" value={stats?.total_played ?? 0} />
          </div>
          {stats?.best_scores && Object.keys(stats.best_scores).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={subLabelStyle}>Migliori punteggi</div>
              <div style={bestScoresStyle}>
                {Object.entries(stats.best_scores).map(([game, best]) => (
                  <div key={game} style={bestScoreItemStyle}>
                    <span style={{ textTransform: 'capitalize' }}>{gameLabel(game)}</span>
                    <span style={{ fontWeight: 800 }}>{best}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Edit profilo */}
        <div style={cardStyle}>
          <div style={labelStyle}>✍️ Nome visualizzato</div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Es. Marco"
            maxLength={24}
            style={inputStyle}
          />
        </div>

        <ColorPicker
          selected={blobColor}
          onSelect={setBlobColor}
          label="🎨 Colore blob preferito"
        />

        {errorMsg && (
          <p role="alert" style={errorTextStyle}>⚠ {errorMsg}</p>
        )}
        {savedFlash && (
          <p style={savedTextStyle}>✓ Salvato</p>
        )}

        <EmojiPicker selected={avatarEmoji} onSelect={setAvatarEmoji} />

        <Button
          variant="primary"
          width="full"
          disabled={saving || !displayName.trim() || (
            displayName.trim() === profile?.display_name
            && blobColor === profile?.blob_color
            && avatarEmoji === profile?.avatar_emoji
          )}
          onClick={handleSave}
        >
          {saving ? '...' : 'Salva modifiche'}
        </Button>

        {/* Storico recente */}
        {history.length > 0 && (
          <div style={cardStyle}>
            <div style={labelStyle}>📜 Ultime partite</div>
            <div style={historyListStyle}>
              {history.map((m) => (
                <div key={m.id} style={historyRowStyle}>
                  <span style={{ fontWeight: 600 }}>{gameLabel(m.game_id)}</span>
                  <span style={{ color: 'var(--muted)' }}>{m.mode === 'party' ? '🎉' : '🎮'}</span>
                  {m.score != null && <span style={{ fontWeight: 800 }}>{m.score}</span>}
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>{formatDate(m.played_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button variant="secondary" width="full" onClick={handleSignOut}>
          Esci
        </Button>

        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          style={dangerLinkStyle}
        >
          Elimina account
        </button>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="Eliminare l'account?"
        titleEmoji="⚠️"
        ariaLabelledBy="delete-title"
      >
        <p style={{ margin: 0, color: 'var(--text)', fontSize: 14, lineHeight: 1.5 }}>
          Questa azione è <strong>irreversibile</strong>. Verranno cancellati:
        </p>
        <ul style={{ margin: '10px 0', paddingLeft: 20, fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
          <li>Il tuo profilo e l'email</li>
          <li>Lo storico delle partite</li>
        </ul>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }}>
          I tuoi punteggi nelle classifiche restano (sono utili agli altri giocatori) ma vengono <strong>anonimizzati</strong>.
        </p>

        <div style={{ marginTop: 16 }}>
          <div style={labelStyle}>Per confermare, scrivi <strong>ELIMINA</strong></div>
          <input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="ELIMINA"
            autoComplete="off"
            style={{
              ...inputStyle,
              borderColor: deleteConfirmText && deleteConfirmText.trim().toUpperCase() !== 'ELIMINA'
                ? 'var(--danger)' : 'var(--border)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button
            variant="secondary"
            width="full"
            onClick={() => { setDeleteOpen(false); setDeleteConfirmText('') }}
            disabled={deleting}
          >
            Annulla
          </Button>
          <Button
            variant="danger"
            width="full"
            disabled={deleteConfirmText.trim().toUpperCase() !== 'ELIMINA' || deleting}
            onClick={handleDeleteAccount}
            style={{
              background: 'var(--danger, #EF4444)',
              color: '#fff',
            }}
          >
            {deleting ? '...' : 'Elimina'}
          </Button>
        </div>
      </Modal>
    </motion.div>
  )
}

const StatTile = ({ emoji, label, value }) => (
  <div style={statTileStyle}>
    <div style={{ fontSize: 22 }}>{emoji}</div>
    <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
  </div>
)

// Set curato di emoji giocose coerenti col brand. L'utente può anche scrivere
// una propria emoji nel campo testo se vuole qualcosa fuori palette.
const EMOJI_PALETTE = [
  '🟡', '🟣', '🟢', '🔴', '🔵', '🟠', '🩵', '🩷',
  '😀', '😎', '🤩', '🥳', '😈', '🤠', '🤓', '🥸',
  '🦄', '🐙', '🐸', '🦊', '🐵', '🦖', '🦔', '🐲',
  '🍕', '🍔', '🌮', '🍩', '🍦', '🍓', '🥑', '🍿',
  '⚽', '🎮', '🎲', '🎯', '🎸', '🎨', '🚀', '⭐',
]

const EmojiPicker = ({ selected, onSelect }) => (
  <div style={cardStyle}>
    <div style={labelStyle}>😎 Avatar emoji</div>
    <div style={emojiGridStyle}>
      {EMOJI_PALETTE.map((emoji) => {
        const active = selected === emoji
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            aria-label={`Seleziona ${emoji}`}
            style={{
              ...emojiBtnStyle,
              background: active ? 'var(--bg)' : 'transparent',
              border: active ? '2px solid var(--text)' : '2px solid transparent',
              boxShadow: active ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
            }}
          >
            {emoji}
          </button>
        )
      })}
    </div>
  </div>
)

const gameLabel = (g) => ({
  blobjump: 'Blob Jump',
  flappyblob: 'Flappy Blob',
  catchblob: 'Catch Blob',
  snake: 'Blob Snake',
  trivia: 'Trivia',
  emojiquiz: 'Emoji Quiz',
  scramble: 'Scramble',
  mappa: 'Mappa',
}[g] || g)

const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
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
  flexShrink: 0,
}

const labelStyle = {
  fontSize: 'clamp(11px, 1.3dvh, 13px)',
  color: 'var(--muted)',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 'clamp(6px, 1dvh, 10px)',
}

const subLabelStyle = {
  fontSize: 11,
  color: 'var(--muted)',
  fontWeight: 700,
  letterSpacing: '0.04em',
  marginBottom: 6,
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

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 8,
}

const statTileStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  padding: '10px 4px',
  background: 'var(--bg)',
  borderRadius: 'var(--radius-sm)',
}

const bestScoresStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const bestScoreItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 13,
  padding: '4px 0',
  borderBottom: '1px dashed var(--border)',
}

const historyListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const historyRowStyle = {
  display: 'grid',
  gridTemplateColumns: '1.4fr auto auto 1fr',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
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

const emojiGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(8, 1fr)',
  gap: 4,
}

const emojiBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  aspectRatio: '1 / 1',
  fontSize: 'clamp(16px, 3vw, 22px)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  padding: 0,
  transition: 'all 0.15s ease',
}

const dangerLinkStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--danger, #EF4444)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  padding: 8,
  opacity: 0.85,
  marginTop: 4,
}

export default ProfileScreen
