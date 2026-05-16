// Blob accessories — SVG elements rendered on top of the blob circle.
// Each accessory is a function (prefix) => JSX that draws inside a 300×300 viewBox
// where the blob circle is centered at (150, 150) with radius 145.

export const ACCESSORIES = [
  { id: null, label: 'Nessuno', emoji: '🚫' },
  { id: 'crown', label: 'Corona', emoji: '👑' },
  { id: 'party', label: 'Festa', emoji: '🎉' },
  { id: 'cowboy', label: 'Cowboy', emoji: '🤠' },
  { id: 'devil', label: 'Diavolo', emoji: '😈' },
  { id: 'halo', label: 'Angelo', emoji: '😇' },
  { id: 'chef', label: 'Chef', emoji: '👨‍🍳' },
  { id: 'pirate', label: 'Pirata', emoji: '🏴‍☠️' },
  { id: 'wizard', label: 'Mago', emoji: '🧙' },
  { id: 'flower', label: 'Fiore', emoji: '🌸' },
  { id: 'headband', label: 'Fascia', emoji: '🎗️' },
  { id: 'bow', label: 'Fiocco', emoji: '🎀' },
]

// SVG accessory renderers — drawn inside the 300×300 blob viewBox
export const renderAccessory = (id) => {
  switch (id) {
    case 'crown':
      return (
        <g>
          <polygon
            points="90,52 115,20 130,45 150,8 170,45 185,20 210,52 205,62 95,62"
            fill="#FFD700"
            stroke="#DAA520"
            strokeWidth="2"
          />
          <rect x="95" y="55" width="110" height="12" rx="2" fill="#DAA520" />
          <circle cx="115" cy="28" r="5" fill="#FF4444" />
          <circle cx="150" cy="16" r="5" fill="#4488FF" />
          <circle cx="185" cy="28" r="5" fill="#44DD44" />
        </g>
      )
    case 'party':
      return (
        <g>
          <polygon
            points="150,0 120,60 180,60"
            fill="#FF6B6B"
            stroke="#E05555"
            strokeWidth="1.5"
          />
          <polygon
            points="150,0 135,30 165,30"
            fill="#FFE66D"
            opacity="0.6"
          />
          <line x1="130" y1="40" x2="145" y2="15" stroke="#4ECDC4" strokeWidth="3" strokeLinecap="round" />
          <line x1="155" y1="15" x2="170" y2="40" stroke="#FFE66D" strokeWidth="3" strokeLinecap="round" />
          <circle cx="150" cy="2" r="6" fill="#FFE66D" />
          <rect x="118" y="56" width="64" height="8" rx="4" fill="#E05555" />
        </g>
      )
    case 'cowboy':
      return (
        <g>
          <ellipse cx="150" cy="55" rx="90" ry="14" fill="#8B6914" />
          <ellipse cx="150" cy="55" rx="90" ry="14" fill="none" stroke="#6B4F12" strokeWidth="2" />
          <path
            d="M108,55 Q108,18 150,15 Q192,18 192,55"
            fill="#A0782C"
            stroke="#8B6914"
            strokeWidth="2"
          />
          <rect x="108" y="48" width="84" height="10" rx="2" fill="#6B4F12" />
        </g>
      )
    case 'devil':
      return (
        <g>
          <path
            d="M82,65 Q78,15 105,40"
            fill="#CC2222"
            stroke="#AA1111"
            strokeWidth="1.5"
          />
          <path
            d="M218,65 Q222,15 195,40"
            fill="#CC2222"
            stroke="#AA1111"
            strokeWidth="1.5"
          />
        </g>
      )
    case 'halo':
      return (
        <g>
          <ellipse
            cx="150" cy="18"
            rx="52" ry="12"
            fill="none"
            stroke="#FFD700"
            strokeWidth="6"
            opacity="0.85"
          />
          <ellipse
            cx="150" cy="18"
            rx="52" ry="12"
            fill="none"
            stroke="#FFF8DC"
            strokeWidth="2"
            opacity="0.5"
          />
        </g>
      )
    case 'chef':
      return (
        <g>
          <circle cx="130" cy="22" r="22" fill="#FAFAFA" stroke="#E8E8E8" strokeWidth="1" />
          <circle cx="160" cy="16" r="24" fill="#FAFAFA" stroke="#E8E8E8" strokeWidth="1" />
          <circle cx="185" cy="26" r="20" fill="#FAFAFA" stroke="#E8E8E8" strokeWidth="1" />
          <circle cx="150" cy="10" r="20" fill="#FAFAFA" stroke="#E8E8E8" strokeWidth="1" />
          <rect x="110" y="40" width="80" height="22" rx="2" fill="#FAFAFA" stroke="#E8E8E8" strokeWidth="1" />
        </g>
      )
    case 'pirate':
      return (
        <g>
          <path
            d="M95,58 Q95,12 150,8 Q205,12 205,58"
            fill="#222"
            stroke="#111"
            strokeWidth="2"
          />
          <rect x="93" y="52" width="114" height="10" rx="2" fill="#333" />
          <path d="M140,34 L150,22 L160,34 Z" fill="#FAFAFA" />
          <circle cx="150" cy="38" r="3" fill="#FAFAFA" />
        </g>
      )
    case 'wizard':
      return (
        <g>
          <polygon
            points="150,-15 115,65 185,65"
            fill="#4B0082"
            stroke="#3A006B"
            strokeWidth="1.5"
          />
          <rect x="110" y="58" width="80" height="10" rx="3" fill="#3A006B" />
          <circle cx="150" cy="0" r="6" fill="#FFD700" />
          <circle cx="135" cy="35" r="4" fill="#FFD700" opacity="0.7" />
          <circle cx="160" cy="22" r="3" fill="#FFD700" opacity="0.5" />
          <circle cx="145" cy="50" r="3.5" fill="#FFD700" opacity="0.6" />
        </g>
      )
    case 'flower':
      return (
        <g transform="translate(195, 45) rotate(20)">
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse
              key={a}
              cx="0" cy="-14"
              rx="10" ry="14"
              fill="#FF69B4"
              opacity="0.85"
              transform={`rotate(${a})`}
            />
          ))}
          <circle cx="0" cy="0" r="8" fill="#FFD700" />
        </g>
      )
    case 'headband':
      return (
        <g>
          <path
            d="M70,72 Q150,40 230,72"
            fill="none"
            stroke="#FF4444"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M70,72 Q150,40 230,72"
            fill="none"
            stroke="#FF6666"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      )
    case 'bow':
      return (
        <g transform="translate(150, 25)">
          <path d="M0,0 Q-30,-22 -35,5 Q-30,-5 0,0" fill="#FF69B4" stroke="#E0559F" strokeWidth="1" />
          <path d="M0,0 Q30,-22 35,5 Q30,-5 0,0" fill="#FF69B4" stroke="#E0559F" strokeWidth="1" />
          <circle cx="0" cy="0" r="6" fill="#E0559F" />
          <path d="M-3,6 Q-5,20 -2,25" fill="none" stroke="#E0559F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M3,6 Q5,20 2,25" fill="none" stroke="#E0559F" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )
    default:
      return null
  }
}
