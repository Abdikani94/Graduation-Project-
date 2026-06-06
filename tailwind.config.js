/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'main-bg': '#F5F5F5',
        'card-bg': '#FFFFFF',
        'border-color': '#E5E7EB',
        'primary': '#2D368D',
        'brand-blue': '#2D368D',
        'brand-green': '#00A451',
        'brand-lime': '#11B67A',
        'text-dark': '#182B49',
        'text-muted': '#555555',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        jakarta: ['Poppins', 'sans-serif'],
        serif: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
