/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#060913', // Deep obsidian matrix base
          900: '#0b1120', // Card surface
          850: '#0f172a', // Elevated surface
          800: '#141e34', // Interactive elements
          750: '#1a2642', // Hovered elements
          700: '#223254', // Secondary borders
          border: 'rgba(56, 189, 248, 0.12)',
        },
        cyber: {
          cyan: '#00f2fe',
          blue: '#38bdf8',
          teal: '#2dd4bf',
          emerald: '#00f5a0',
          rose: '#ff3366',
          purple: '#a855f7',
          violet: '#818cf8',
          amber: '#f59e0b',
        },
        slate: {
          850: '#111827',
          950: '#060913',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -4px rgba(6, 182, 212, 0.35)',
        'glow-violet': '0 0 25px -4px rgba(139, 92, 246, 0.35)',
        'glow-emerald': '0 0 25px -4px rgba(16, 185, 129, 0.35)',
        'glow-rose': '0 0 25px -4px rgba(244, 63, 94, 0.35)',
        'glow-amber': '0 0 25px -4px rgba(245, 158, 11, 0.35)',
        'cyber-card': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'shimmer': 'shimmer 2.5s linear infinite',
        'laser-scan': 'laserScan 3s ease-in-out infinite',
        'pulse-slow': 'pulseGlow 3s ease-in-out infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
        'float': 'floatSlow 4s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        laserScan: {
          '0%, 100%': { top: '0%', opacity: '0.2' },
          '50%': { top: '96%', opacity: '0.8' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
