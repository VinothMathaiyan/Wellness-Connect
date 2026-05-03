/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  safelist: [
    // Explicitly protect these from JIT purge — used in modal "Go back" buttons
    // across root-level .tsx files which may not always be scanned
    'bg-red-500',
    'bg-red-600',
    'bg-red-700',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00A99D',
        'text-primary': '#1F2937', // gray-800
        'text-secondary': '#6B7280', // gray-500
        'border-light': '#E5E7EB', // gray-200
        border: '#D1D5DB', // gray-300
        'input-bg': '#F8F9FA',
        'blue-light': '#DBEAFE',
        blue: '#3B82F6',
        red: '#EF4444',
        'red-light': '#FEE2E2',
        'red-dark': '#B91C1C',
        'green-light': '#E6F3F0',
        amber: '#F59E0B',
        'amber-light': '#FEF3C7',
        'amber-dark': '#B45309'
      }
    },
  },
  plugins: [],
}

