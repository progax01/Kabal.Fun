/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D1117',
        card: '#1A1F2B',
        'card-hover': '#1E242F',
      },
      fontFamily: {
        'TestUntitledSans': ['Test Untitled Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
