// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Tus estilos globales
// --- 1. Importamos el Toaster ---
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* --- 2. Colocamos el componente aquí, al nivel más alto --- */}
    <Toaster 
      position="top-center" 
      reverseOrder={false} 
      toastOptions={{
        duration: 3000, // Duración por defecto de 3 segundos
        style: {
          background: '#333',
          color: '#fff',
        },
      }}
    />
    <App />
  </React.StrictMode>,
)