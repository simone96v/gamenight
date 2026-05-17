// One-shot: converte SVG → PNG per app icons (PWA + apple-touch).
// Eseguire con: node scripts/generate-icons.mjs

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const iconsDir = path.join(root, 'public', 'icons')

const TARGETS = [
  { src: 'public/icons/icon.svg',          out: 'public/icons/icon-192.png',          size: 192 },
  { src: 'public/icons/icon.svg',          out: 'public/icons/icon-512.png',          size: 512 },
  { src: 'public/icons/icon.svg',          out: 'public/icons/apple-touch-icon.png',  size: 180 },
  { src: 'public/icons/icon-maskable.svg', out: 'public/icons/icon-512-maskable.png', size: 512 },
]

for (const t of TARGETS) {
  const inPath = path.join(root, t.src)
  const outPath = path.join(root, t.out)
  const svgBuf = await readFile(inPath)
  await sharp(svgBuf, { density: 384 })
    .resize(t.size, t.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath)
  console.log(`✓ ${t.out} (${t.size}×${t.size})`)
}

console.log('\nDone. Generated', TARGETS.length, 'icons.')
