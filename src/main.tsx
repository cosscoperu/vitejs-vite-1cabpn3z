// fuente/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // Importamos nuestro App.jsx
import './index.css'
import './firebase/config.js'
import { Toaster } from 'react-hot-toast' // <-- 1. IMPORTAMOS EL TOASTER

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* --- 2. AÑADIMOS EL COMPONENTE TOASTER AQUÍ --- */}
    <Toaster
      position="top-center"
      reverseOrder={false}
      toastOptions={{
        duration: 3000,
        style: {
          background: '#333',
          color: '#fff',
        },
      }}
    />
    <App />
  </React.StrictMode>,
)