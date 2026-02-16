/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#364132',
          dark: '#2a3327',
        },
        secondary: {
          DEFAULT: '#343733',
        },
        sage: {
          DEFAULT: '#B3B5A6',
          light: '#d4d5ca',
        },
        cream: {
          DEFAULT: '#FEFBEE',
          light: '#FDFCF4',
        },
        lavender: {
          DEFAULT: '#AAA9C4',
          light: '#c4c3d9',
        },
      },
    },
  },
  plugins: [],
}
