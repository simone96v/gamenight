// Genera le icone PNG per la PWA dal SVG blob.
import { Resvg } from '@resvg/resvg-js'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = join(__dirname, '../public/icons')
mkdirSync(out, { recursive: true })

// SVG dell'icona: blob viola con occhi — 512x512
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="80%">
      <stop offset="0%" stop-color="#C4B5FD"/>
      <stop offset="40%" stop-color="#A78BFA"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <radialGradient id="el" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff"/>
      <stop offset="100%" stop-color="#F0ECF9"/>
    </radialGradient>
  </defs>
  <!-- Sfondo arrotondato -->
  <rect width="512" height="512" rx="112" fill="#F5F3FF"/>
  <!-- Blob corpo — shape organica, ~r230 centrata a 256,256 -->
  <path d="M256,42 C381,36 474,132 470,256 C474,382 378,474 256,470 C130,474 36,378 42,256 C36,130 132,36 256,42Z" fill="url(#g)"/>
  <!-- Occhio sinistro -->
  <ellipse cx="196" cy="236" rx="42" ry="46" fill="url(#el)"/>
  <circle cx="201" cy="243" r="20" fill="#6D28D9"/>
  <circle cx="204" cy="238" r="7.5" fill="#1E1B4B"/>
  <circle cx="210" cy="233" r="4.5" fill="rgba(255,255,255,0.9)"/>
  <!-- Occhio destro -->
  <ellipse cx="316" cy="236" rx="42" ry="46" fill="url(#el)"/>
  <circle cx="321" cy="243" r="20" fill="#6D28D9"/>
  <circle cx="324" cy="238" r="7.5" fill="#1E1B4B"/>
  <circle cx="330" cy="233" r="4.5" fill="rgba(255,255,255,0.9)"/>
</svg>`

// Versione maskable: blob che riempie tutto il riquadro (safe zone 80%)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="80%">
      <stop offset="0%" stop-color="#C4B5FD"/>
      <stop offset="40%" stop-color="#A78BFA"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <radialGradient id="el" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff"/>
      <stop offset="100%" stop-color="#F0ECF9"/>
    </radialGradient>
  </defs>
  <!-- Sfondo pieno -->
  <rect width="512" height="512" fill="#8B5CF6"/>
  <!-- Blob più grande -->
  <path d="M256,10 C400,4 506,112 502,256 C506,402 398,506 256,502 C110,506 4,398 10,256 C4,110 112,4 256,10Z" fill="url(#g)"/>
  <!-- Occhio sinistro -->
  <ellipse cx="196" cy="236" rx="42" ry="46" fill="url(#el)"/>
  <circle cx="201" cy="243" r="20" fill="#6D28D9"/>
  <circle cx="204" cy="238" r="7.5" fill="#1E1B4B"/>
  <circle cx="210" cy="233" r="4.5" fill="rgba(255,255,255,0.9)"/>
  <!-- Occhio destro -->
  <ellipse cx="316" cy="236" rx="42" ry="46" fill="url(#el)"/>
  <circle cx="321" cy="243" r="20" fill="#6D28D9"/>
  <circle cx="324" cy="238" r="7.5" fill="#1E1B4B"/>
  <circle cx="330" cy="233" r="4.5" fill="rgba(255,255,255,0.9)"/>
</svg>`

const sizes = [192, 512]

for (const size of sizes) {
  const svg = size <= 192 ? iconSvg : iconSvg
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
  const png = resvg.render().asPng()
  writeFileSync(join(out, `icon-${size}.png`), png)
  console.log(`✓ icon-${size}.png`)
}

// Maskable 512
const resvgMask = new Resvg(maskableSvg, { fitTo: { mode: 'width', value: 512 } })
const pngMask = resvgMask.render().asPng()
writeFileSync(join(out, 'icon-512-maskable.png'), pngMask)
console.log('✓ icon-512-maskable.png')

// Apple touch icon 180x180
const resvgApple = new Resvg(iconSvg, { fitTo: { mode: 'width', value: 180 } })
const pngApple = resvgApple.render().asPng()
writeFileSync(join(out, 'apple-touch-icon.png'), pngApple)
console.log('✓ apple-touch-icon.png')

console.log('Icone generate in public/icons/')
