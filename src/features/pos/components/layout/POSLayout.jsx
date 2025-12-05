// src/components/POSLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

// Ajuste importante:
// Firebase config vive en: src/firebase/config.js
// Desde /src/components/ → la ruta correcta es: ../firebase/config
import { db } from '../../../../firebase/config';

import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Layout exclusivo para la ventana de ventas (Pantalla completa / POS)
function POSLayout() {
  const [storeConfig, setStoreConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar configuración de la tienda (similar a MainLayout)
  const loadConfig = async () => {
    try {
      const docRef = doc(db, 'settings', 'company');
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();

        setStoreConfig({
          ...data,
          posConfig: data.posConfig || {
            currency: 'S/',
            country: 'PERU',
          },
        });
      } else {
        toast.error('No se encontró la configuración de la tienda.');
      }
    } catch (err) {
      console.error('Error cargando configuración POS:', err);
      toast.error('Error cargando datos de tienda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();

    // Escuchar eventos cuando se actualiza configuración en otra pestaña
    window.addEventListener('pos-config-updated', loadConfig);

    return () => {
      window.removeEventListener('pos-config-updated', loadConfig);
    };
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
      {/* Pasamos storeConfig al hijo (PosPage) vía Outlet */}
      <Outlet context={{ storeConfig }} />
    </div>
  );
}

export default POSLayout;
