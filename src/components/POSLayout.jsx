// src/components/POSLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Este Layout es exclusivo para la ventana de ventas independiente (Pantalla completa)
function POSLayout() {
  const [storeConfig, setStoreConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Lógica de carga (Idéntica al MainLayout) ---
  const loadConfig = async () => {
    try {
      const docRef = doc(db, 'settings', 'company');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoreConfig({
            ...data,
            posConfig: data.posConfig || { currency: 'S/', country: 'PERU' }
        });
      }
    } catch (err) {
      console.error("Error cargando configuración POS:", err);
      toast.error("Error cargando datos de tienda");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadConfig();
    // Escuchamos cambios por si el usuario tiene abierta la config en otra pestaña
    window.addEventListener('pos-config-updated', loadConfig);
    return () => window.removeEventListener('pos-config-updated', loadConfig);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-400 font-bold animate-pulse">
        CARGANDO PUNTO DE VENTA...
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50 overflow-hidden">
      {/* Aquí está la magia: Pasamos el storeConfig al hijo (PosPage) 
         igual que lo hace el MainLayout.
      */}
      <Outlet context={{ storeConfig }} />
    </div>
  );
}

export default POSLayout;