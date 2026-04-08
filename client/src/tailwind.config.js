/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // This ensures all your React files are covered
  ],
  theme: {
    extend: {
      colors: {
        // You can add your custom EthioPOS branding here later
        primary: '#4f46e5', // Indigo
      },
    },
  },
  plugins: [],
}