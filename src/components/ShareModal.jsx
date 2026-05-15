import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import Modal from './ui/Modal'

const spring = { type: 'spring', stiffness: 400, damping: 22 }

const ShareModal = ({ open = false, onClose, joinUrl, roomCode }) => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  const shareText = `Entra nel mio party su Blob Party! Codice: ${roomCode}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const handleWhatsApp = () => {
    const text = `${shareText}\n${joinUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  const handleTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(joinUrl)}&text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invita gli amici"
      titleEmoji="🎯"
      ariaLabelledBy="share-modal-title"
      maxWidth={380}
    >
      <p style={{
        color: 'var(--muted)',
        fontSize: 'clamp(13px, 1.6dvh, 15px)',
        textAlign: 'center',
        marginTop: -8,
        marginBottom: 'clamp(14px, 2dvh, 18px)',
      }}>
        Scansiona il QR o condividi su un'app
      </p>

      <div style={{
        background: 'var(--surface)',
        padding: 'clamp(14px, 2dvh, 18px)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        justifyContent: 'center',
        border: '1px solid var(--border)',
        marginBottom: 'clamp(14px, 2dvh, 18px)',
      }}>
        <QRCodeSVG value={joinUrl} size={200} bgColor="#FFFFFF" fgColor="#1F2937" level="M" />
      </div>

      <div style={{ textAlign: 'center', marginBottom: 'clamp(14px, 2dvh, 18px)' }}>
        <div style={{
          fontSize: 'clamp(10px, 1.3dvh, 12px)',
          color: 'var(--muted)',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          Codice party
        </div>
        <div style={{
          fontSize: 'clamp(28px, 4.5dvh, 38px)',
          fontWeight: 900,
          letterSpacing: '0.15em',
          color: 'var(--text)',
        }}>
          {roomCode}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <ShareAction
          label={copied ? 'Copiato!' : 'Copia link'}
          color={copied ? '#22C55E' : 'var(--accent)'}
          onClick={handleCopy}
        >
          {copied ? (
            <span style={{ fontSize: 20, fontWeight: 900 }}>&#10003;</span>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          )}
        </ShareAction>

        <ShareAction
          label="WhatsApp"
          color="#25D366"
          onClick={handleWhatsApp}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.885 3.488" />
          </svg>
        </ShareAction>

        <ShareAction
          label="Telegram"
          color="#229ED9"
          onClick={handleTelegram}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </ShareAction>
      </div>
    </Modal>
  )
}

const ShareAction = ({ label, color, onClick, children }) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileHover={{
      y: -3,
      boxShadow: `0 8px 20px ${color}40`,
    }}
    whileTap={{
      y: 0,
      scale: 0.96,
      boxShadow: `0 2px 6px ${color}20`,
    }}
    transition={spring}
    style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '14px 6px 10px',
      background: 'var(--surface)',
      border: '1.5px solid var(--border-strong)',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      minWidth: 0,
      transition: 'border-color 0.15s ease',
    }}
  >
    <div style={{
      width: 44,
      height: 44,
      borderRadius: '50%',
      background: color,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `0 4px 10px ${color}55`,
      flexShrink: 0,
    }}>
      {children}
    </div>
    <span style={{
      fontSize: 11,
      fontWeight: 800,
      color: 'var(--text)',
      letterSpacing: '-0.01em',
    }}>
      {label}
    </span>
  </motion.button>
)

export default ShareModal
