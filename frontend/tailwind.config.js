/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        hindi: ['Noto Sans Devanagari', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#1e1b4b',
        },
        rain: {
          low: '#bfdbfe',
          mid: '#3b82f6',
          high: '#1e3a8a',
        },
        heat: {
          low: '#fef3c7',
          mid: '#f59e0b',
          high: '#7c2d12',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        surface: '#0f172a',
        panel: '#1e293b',
        card: '#1e293b',
        border: '#334155',
        muted: '#64748b',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 40%, #0c1a2e 100%)',
        'panel-gradient': 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        'glow-indigo': 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(99,102,241,0.3)',
        'glow-sm': '0 0 10px rgba(99,102,241,0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
