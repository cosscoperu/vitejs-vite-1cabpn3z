/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // SINTAXIS MODERNA (TAILWIND V3+):
          // Usamos 'rgb(... / <alpha-value>)' para que Tailwind pueda
          // inyectar la opacidad automáticamente en nuestros números RGB.
          gold: 'rgb(var(--color-primary) / <alpha-value>)', 
          
          silver: '#C0C0C0',
          dark: '#1a1a1a',
        }
      }
    },
  },
  plugins: [],
}