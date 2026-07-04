/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'main-bg': '#F6F8FB',
        'card-bg': '#FFFFFF',
        'border-color': '#D9E4EF',
        'primary': '#2D368D',
        'brand-blue': '#2D368D',
        'brand-green': '#00A451',
        'brand-lime': '#FBAB19',
        'text-dark': '#182B49',
        'text-muted': '#6c6a7e',
      },
      fontFamily: {
        sans: ['Urbanist', 'Segoe UI', 'sans-serif'],
        jakarta: ['Urbanist', 'Segoe UI', 'sans-serif'],
        serif: ['Urbanist', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
