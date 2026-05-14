// Modale QR code per condividere la stanza: QR grande + codice + copia link.

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Modal from './ui/Modal'
import Button from './ui/Button'

const QRModal = ({ open = false, onClose, joinUrl, roomCode }) => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invita gli amici"
      titleEmoji="🎯"
      ariaLabelledBy="qr-modal-title"
      maxWidth={380}
    >
      <p style={{ color: 'var(--muted)', fontSize: 'clamp(13px, 1.6dvh, 15px)', textAlign: 'center', marginTop: -8, marginBottom: 'clamp(14px, 2dvh, 18px)' }}>
        Scansiona il QR o copia il link
      </p>

      <div style={{
        background: '#fff',
        padding: 'clamp(14px, 2dvh, 18px)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        justifyContent: 'center',
        border: '1px solid var(--border)',
        marginBottom: 'clamp(14px, 2dvh, 18px)',
      }}>
        <QRCodeSVG value={joinUrl} size={220} bgColor="#FFFFFF" fgColor="#1F2937" level="M" />
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

      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="secondary" width="full" onClick={onClose}>
          Chiudi
        </Button>
        <Button variant="primary" width="full" onClick={handleCopy}>
          {copied ? '✓ Copiato!' : '🔗 Copia link'}
        </Button>
      </div>
    </Modal>
  )
}

export default QRModal
