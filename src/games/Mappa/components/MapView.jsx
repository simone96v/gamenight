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

if (typeof document !== 'undefined' && !document.getElementById('mappa-pin-anim')) {
  const s = document.createElement('style')
  s.id = 'mappa-pin-anim'
  s.textContent = `
    @keyframes mappa-pin-drop {
      0% { opacity: 0; transform: scale(0.3) translateY(-10px); }
      50% { opacity: 1; transform: scale(1.12); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .mappa-pin-drop { animation: mappa-pin-drop 0.35s ease-out; transform-origin: bottom center; }
  `
  document.head.appendChild(s)
}

const ITALY_BOUNDS = [[35.4, 6.5], [47.1, 18.7]]
const ITALY_CENTER = [41.9, 12.5]

const pinSvg = (color, opts = {}) => {
  const { inner = false, animated = false } = opts
  const svg = `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
  <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
  <circle cx="14" cy="14" r="6" fill="#fff" opacity="0.9"/>
  ${inner ? `<circle cx="14" cy="14" r="3" fill="${color}"/>` : ''}
</svg>`
  return animated ? `<div class="mappa-pin-drop">${svg}</div>` : svg
}

const realPinSvg = (color) => `
<svg width="36" height="50" viewBox="0 0 36 50" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 32 18 32s18-18.5 18-32C36 8.059 27.941 0 18 0z" fill="${color}" stroke="#fff" stroke-width="2.5"/>
  <circle cx="18" cy="18" r="8" fill="#fff" opacity="0.95"/>
  <circle cx="18" cy="18" r="4" fill="${color}"/>
</svg>`

const createPinIcon = (color, animated = false) => L.divIcon({
  className: '',
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -40],
  html: pinSvg(color, { animated }),
})

const createRealIcon = () => L.divIcon({
  className: '',
  iconSize: [36, 50],
  iconAnchor: [18, 50],
  popupAnchor: [0, -50],
  html: realPinSvg('#10B981'),
})

const createAutoIcon = () => L.divIcon({
  className: '',
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  html: pinSvg('#9CA3AF'),
})

const MapReady = ({ pins, realAnswer }) => {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize()
      const points = [...pins.map((p) => [p.lat, p.lng])]
      if (realAnswer) points.push([realAnswer.lat, realAnswer.lng])
      if (points.length >= 2) {
        map.fitBounds(points, { padding: [30, 30], maxZoom: 9 })
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
      maxZoom={9}
      maxBounds={ITALY_BOUNDS}
      maxBoundsViscosity={1.0}
      style={{ width: '100%', height: '100%', borderRadius: rounded ? 16 : 0, zIndex: 0 }}
      zoomControl={false}
      attributionControl={true}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      />

      {revealMode && <MapReady pins={safePins} realAnswer={safeAnswer} />}

      {!revealMode && onPinDrop && (
        <ClickHandler onPinDrop={onPinDrop} disabled={disabled} />
      )}

      {safePins.map((pin, i) => (
        <Marker
          key={pin.id ?? `pin-${i}`}
          position={[pin.lat, pin.lng]}
          icon={pin.auto ? createAutoIcon() : createPinIcon(pin.color ?? '#7C3AED', pin.animated)}
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
            color: pin.auto ? '#9CA3AF' : (pin.color ?? '#7C3AED'),
            weight: 2,
            dashArray: '6 4',
            opacity: 0.6,
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
