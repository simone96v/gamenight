// Wrapper Leaflet per la mappa d'Italia.
// Props:
//   onPinDrop(lat, lng) — callback su tap mappa (solo in question mode)
//   pins: [{ lat, lng, color, name, id, auto }] — pin da renderizzare
//   revealMode: bool — disabilita interazione, mostra linee distanza
//   realAnswer: { lat, lng, name } — pin risposta reale (solo in reveal)
//   disabled: bool — blocca interazione

import { Component, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BLOB_GRADIENTS } from '../../../utils/colors'

if (typeof document !== 'undefined' && !document.getElementById('mappa-pin-anim')) {
  const s = document.createElement('style')
  s.id = 'mappa-pin-anim'
  s.textContent = `
    @keyframes mappa-pin-drop {
      0% { opacity: 0; transform: scale(0.3) translateY(-10px); }
      50% { opacity: 1; transform: scale(1.12); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .mappa-pin-drop { animation: mappa-pin-drop 0.35s ease-out; transform-origin: center; }
    .leaflet-container.mappa-flat {
      background: #aad3df;
    }
    .mappa-flat .leaflet-tile-pane {
      filter: none;
    }
    .mappa-flat .leaflet-control-attribution {
      background: transparent !important;
      color: rgba(0,0,0,0.18) !important;
      font-size: 8px !important;
      padding: 1px 5px !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    .mappa-flat .leaflet-control-attribution a {
      color: rgba(0,0,0,0.22) !important;
      text-decoration: none !important;
    }
  `
  document.head.appendChild(s)
}

const ITALY_BOUNDS = [[35.4, 6.5], [47.1, 18.7]]
const ITALY_CENTER = [41.9, 12.5]

// ── Blob pin SVG generators ──

const blobPinSvg = (color, size = 38, animated = false) => {
  const [c1, c2, c3] = BLOB_GRADIENTS[color] || ['#E5E7EB', '#D1D5DB', '#9CA3AF']
  const uid = Math.random().toString(36).slice(2, 8)
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-${uid}" x1="0%" y1="0%" x2="100%" y2="80%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="40%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c3}"/>
      </linearGradient>
      <radialGradient id="eg-${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff"/>
        <stop offset="100%" stop-color="#F0ECF9"/>
      </radialGradient>
    </defs>
    <circle cx="150" cy="150" r="145" fill="url(#bg-${uid})" stroke="#fff" stroke-width="10"/>
    <ellipse cx="115" cy="140" rx="26" ry="28" fill="url(#eg-${uid})"/>
    <circle cx="118" cy="144" r="12" fill="#6D28D9"/>
    <circle cx="120" cy="141" r="4.5" fill="#1E1B4B"/>
    <circle cx="124" cy="137" r="2.8" fill="rgba(255,255,255,0.9)"/>
    <ellipse cx="185" cy="140" rx="26" ry="28" fill="url(#eg-${uid})"/>
    <circle cx="188" cy="144" r="12" fill="#6D28D9"/>
    <circle cx="190" cy="141" r="4.5" fill="#1E1B4B"/>
    <circle cx="194" cy="137" r="2.8" fill="rgba(255,255,255,0.9)"/>
  </svg>`
  return animated ? `<div class="mappa-pin-drop">${svg}</div>` : svg
}

const realBlobSvg = (size = 46) => {
  const uid = Math.random().toString(36).slice(2, 8)
  return `<svg width="${size}" height="${size}" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-${uid}" x1="0%" y1="0%" x2="100%" y2="80%">
        <stop offset="0%" stop-color="#FDA4AF"/>
        <stop offset="40%" stop-color="#FB7185"/>
        <stop offset="100%" stop-color="#F43F5E"/>
      </linearGradient>
    </defs>
    <circle cx="150" cy="150" r="145" fill="url(#bg-${uid})" stroke="#fff" stroke-width="10"/>
    <path d="M93 143 Q115 118, 137 143" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
    <path d="M163 143 Q185 118, 207 143" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
  </svg>`
}

const autoBlobSvg = (size = 34) => {
  const uid = Math.random().toString(36).slice(2, 8)
  return `<svg width="${size}" height="${size}" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-${uid}" x1="0%" y1="0%" x2="100%" y2="80%">
        <stop offset="0%" stop-color="#E5E7EB"/>
        <stop offset="40%" stop-color="#D1D5DB"/>
        <stop offset="100%" stop-color="#9CA3AF"/>
      </linearGradient>
    </defs>
    <circle cx="150" cy="150" r="145" fill="url(#bg-${uid})" stroke="#fff" stroke-width="10"/>
    <ellipse cx="115" cy="145" rx="24" ry="4" fill="#fff" opacity="0.7"/>
    <ellipse cx="185" cy="145" rx="24" ry="4" fill="#fff" opacity="0.7"/>
  </svg>`
}

const createBlobIcon = (color, animated = false) => L.divIcon({
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  html: blobPinSvg(color, 38, animated),
})

const createRealIcon = () => L.divIcon({
  className: '',
  iconSize: [46, 46],
  iconAnchor: [23, 23],
  html: realBlobSvg(46),
})

const createAutoIcon = () => L.divIcon({
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  html: autoBlobSvg(34),
})

const MapReady = ({ pins, realAnswer }) => {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize()
      const points = [...pins.map((p) => [p.lat, p.lng])]
      if (realAnswer) points.push([realAnswer.lat, realAnswer.lng])
      if (points.length >= 2) {
        map.fitBounds(points, { padding: [40, 40], maxZoom: 13 })
      }
    }, 150)
    return () => clearTimeout(t)
  }, [map, pins, realAnswer])
  return null
}

const ClickHandler = ({ onPinDrop, disabled }) => {
  useMapEvents({
    click: (e) => {
      if (disabled) return
      onPinDrop?.(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

const validCoord = (v) => typeof v === 'number' && isFinite(v)
const validPin = (p) => p && validCoord(p.lat) && validCoord(p.lng)

const MapView = ({
  onPinDrop,
  pins = [],
  revealMode = false,
  realAnswer = null,
  disabled = false,
  rounded = true,
}) => {
  const safePins = pins.filter(validPin)
  const safeAnswer = validPin(realAnswer) ? realAnswer : null

  return (
    <MapContainer
      center={ITALY_CENTER}
      zoom={6}
      minZoom={5}
      maxZoom={18}
      maxBounds={ITALY_BOUNDS}
      maxBoundsViscosity={1.0}
      className="mappa-flat"
      style={{ width: '100%', height: '100%', borderRadius: rounded ? 16 : 0, zIndex: 0 }}
      zoomControl={false}
      attributionControl={true}
      attributionPrefix={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        subdomains="abcd"
        maxZoom={20}
      />

      {revealMode && <MapReady pins={safePins} realAnswer={safeAnswer} />}

      {!revealMode && onPinDrop && (
        <ClickHandler onPinDrop={onPinDrop} disabled={disabled} />
      )}

      {safePins.map((pin, i) => (
        <Marker
          key={pin.id ?? `pin-${i}`}
          position={[pin.lat, pin.lng]}
          icon={pin.auto ? createAutoIcon() : createBlobIcon(pin.color ?? '#8B5CF6', pin.animated)}
        />
      ))}

      {revealMode && safeAnswer && (
        <Marker
          position={[safeAnswer.lat, safeAnswer.lng]}
          icon={createRealIcon()}
        />
      )}

      {revealMode && safeAnswer && safePins.map((pin, i) => (
        <Polyline
          key={`line-${pin.id ?? i}`}
          positions={[[pin.lat, pin.lng], [safeAnswer.lat, safeAnswer.lng]]}
          pathOptions={{
            color: pin.auto ? '#9CA3AF' : (pin.color ?? '#8B5CF6'),
            weight: 2.5,
            dashArray: '6 4',
            opacity: 0.7,
          }}
        />
      ))}
    </MapContainer>
  )
}

class MapErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', color: 'var(--muted)', fontSize: 14 }}>Mappa non disponibile</div>
    }
    return this.props.children
  }
}

const SafeMapView = (props) => (
  <MapErrorBoundary>
    <MapView {...props} />
  </MapErrorBoundary>
)

export default SafeMapView
