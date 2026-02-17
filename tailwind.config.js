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
        primary: '#364132',
        secondary: '#343733',
        sage: '#B3B5A6',
        cream: {
          DEFAULT: '#FEFBEE',
          light: '#FDFCF4',
        },
        lavender: '#AAA9C4',
      },
      fontSize: {
        'xs': '0.7rem',
        'sm': '0.8rem',
        'base': '0.9rem',
        'lg': '1rem',
        'xl': '1.15rem',
        '2xl': '1.4rem',
        '3xl': '1.75rem',
      },
      spacing: {
        '18': '4.5rem',
      },
    },
  },
  plugins: [],
}