/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'core-bg': '#03070D',
        'core-navy': '#071525',
        'core-blue': '#0B2B4A',
        'electric-cyan': '#00D9FF',
        'bright-cyan': '#73EEFF',
        'soft-white': '#EAFBFF',
        'energy-amber': '#FFB84D',
        'alert-red': '#FF3355'
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['"Inter"', '"Orbitron"', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
        'spin-reverse-slow': 'spin-reverse 25s linear infinite',
        'scanline': 'scanline 8s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'spin-reverse': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg)' }
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' }
        },
        'glowPulse': {
          '0%': { opacity: '0.4', filter: 'drop-shadow(0 0 5px rgba(0, 217, 255, 0.4))' },
          '100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(0, 217, 255, 0.9))' }
        }
      }
    },
  },
  plugins: [],
}
