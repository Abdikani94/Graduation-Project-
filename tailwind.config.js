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
        'primary': '#16325C',
        'brand-blue': '#16325C',
        'brand-green': '#0F9F6E',
        'brand-lime': '#14B8A6',
        'text-dark': '#10233F',
        'text-muted': '#5E6B7E',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
        jakarta: ['Inter', 'Segoe UI', 'sans-serif'],
        serif: ['Inter', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
