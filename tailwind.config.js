/** @type {import('tailwindcss').Config} */
// Tailwind v3 — utility-first, mobile-first.
// Mappa i CSS variables definiti in index.css come colori Tailwind:
// così `bg-surface`, `text-muted`, `border-border` ecc. funzionano in JSX
// e rispettano lo stesso design system del CSS.
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:        'var(--bg)',
        surface:   'var(--surface)',
        surface2:  'var(--surface2)',
        accent:    'var(--accent)',
        accent2:   'var(--accent2)',
        success:   'var(--success)',
        danger:    'var(--danger)',
        warning:   'var(--warning)',
        text:      'var(--text)',
        muted:     'var(--muted)',
        border:    'var(--border)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm:      'var(--radius-sm)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
