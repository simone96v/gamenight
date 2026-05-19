// BrandRevealCard — mostrato in fase reveal. Nome brand + chip del cluster.

import { motion } from 'framer-motion'
import { clusterLabel } from '../constants'

const BrandRevealCard = ({ brand, cluster }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    style={wrapStyle}
  >
    <span style={brandStyle}>{brand}</span>
    {cluster && <span style={chipStyle}>{clusterLabel(cluster)}</span>}
  </motion.div>
)

const wrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'clamp(4px, 0.6dvh, 8px)',
  flexShrink: 0,
}
const brandStyle = {
  fontSize: 'clamp(20px, 2.6dvh, 26px)',
  fontWeight: 800,
  color: 'var(--text)',
  letterSpacing: '0.01em',
}
const chipStyle = {
  fontSize: 'clamp(11px, 1.3dvh, 13px)',
  fontWeight: 700,
  padding: '4px 10px',
  borderRadius: 999,
  background: 'rgba(20, 184, 166, 0.12)',
  color: 'var(--text)',
  letterSpacing: '0.02em',
}

export default BrandRevealCard
