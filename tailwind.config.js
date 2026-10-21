/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
      },
      colors: {
        glass: {
          white: 'rgba(255,255,255,0.08)',
          border: 'rgba(255,255,255,0.18)',
          hover: 'rgba(255,255,255,0.15)'
        }
      },
      backdropBlur: {
        glass: '20px'
      }
    }
  },
  plugins: []
}
