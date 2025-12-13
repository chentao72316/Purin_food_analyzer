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
        'high-purine': '#FF0000',
        'medium-purine': '#FFD700',
        'low-purine': '#00FF00',
        'high-purine-bg': '#FFF5F5',
        'medium-purine-bg': '#FFF0F0',
        'low-purine-bg': '#F0FFF0',
      },
    },
  },
  plugins: [],
}

