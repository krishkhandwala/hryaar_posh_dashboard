/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#061122',
          900: '#0A192F',
          850: '#0D2140',
          800: '#0D2345',
        },
        brand: {
          blue: '#2A62FF',
          darkBlue: '#1D4ED8',
          accent: '#3B82F6',
        }
      },
    },
  },
  plugins: [],
}
