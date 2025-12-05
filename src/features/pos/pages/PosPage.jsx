import React, { useState, useEffect } from 'react';
import PosInterface from '../components/interface/PosInterface';
import { useCart } from '../../../hooks/useCart';
import { cn } from '../../../utils/cn';

import { getAuth, onAuthStateChanged } from 'firebase/auth';

// --- CONFIGURACIÓN DEFAULT ---
const DEFAULT_CONFIG = {
  country: 'PERU', currency: 'S/',
  methods: [
    { id: 'cash', label: 'Efectivo', type: 'CASH', icon: '💵', shortcut: 'F1', enabled: true, allowsOverpayment: true },
    { id: 'yape', label: 'Yape', type: 'DIGITAL', icon: '🟣', shortcut: 'F2', enabled: true, allowsOverpayment: false },
    { id: 'plin', label: 'Plin', type: 'DIGITAL', icon: '🔵', shortcut: 'F3', enabled: true, allowsOverpayment: false },
    { id: 'card', label: 'Tarjeta', type: 'CARD', icon: '💳', shortcut: 'F4', enabled: true, allowsOverpayment: false }
  ]
};

const getPosConfig = () => {
  try {
    const saved = localStorage.getItem('POS_GLOBAL_CONFIG');
    if (saved) return JSON.parse(saved);
  } catch (e) { console.error(e); }
  return DEFAULT_CONFIG;
};

function PosPage() {
  const { carts, activeTab, setActiveTab, setCart, clearCart } = useCart();
  const [storeConfig, setStoreConfig] = useState(getPosConfig());
  
  // 🔒 ESTADO DE SEGURIDAD
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // 1. Detectar usuario logueado (Seguridad Firebase)
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Usuario logueado: Permitir acceso
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Cajero'
        });
      } else {
        // Si no hay usuario, null (PosInterface deberá bloquear o pedir login)
        setCurrentUser(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Sincronización de configuración
  useEffect(() => {
    const handleStorageChange = () => setStoreConfig(getPosConfig());
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('theme-changed', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('theme-changed', handleStorageChange);
    };
  }, []);
  
  const handleTabChange = (index, e) => {
    if (e) e.target.blur();
    setActiveTab(index);
  };

  // Pantalla de carga mientras verificamos seguridad
  if (loadingAuth) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">Cargando sistema...</div>;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
      
      {/* HEADER DEL POS */}
      <header className="h-14 bg-slate-900 flex items-end justify-between px-4 border-b border-slate-800 shadow-md z-20">
        
        {/* Pestañas */}
        <div className="flex gap-1 h-full items-end">
          {[0, 1, 2, 3].map(index => {
            const isActive = activeTab === index;
            const hasItems = carts[index] && carts[index].length > 0;

            return (
              <button
                key={index}
                onClick={(e) => handleTabChange(index, e)}
                className={cn(
                  "relative px-6 py-2.5 text-sm font-medium transition-all duration-200 rounded-t-lg outline-none select-none border-t border-x",
                  isActive 
                    ? "bg-white text-slate-900 border-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] translate-y-[1px]" 
                    : "bg-slate-800/50 text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-brand-gold rounded-t-lg" />
                )}
                <span className="flex items-center gap-2">
                  Venta {index + 1}
                  {hasItems && (
                    <span className="flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-brand-gold opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-gold"></span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Info Usuario y Config */}
        <div className="flex items-center gap-3 mb-2">
           {/* Indicador de Usuario Logueado */}
           <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
              <div className={`w-2 h-2 rounded-full ${currentUser ? 'bg-green-500' : 'bg-red-500'}`}></div>
              {currentUser ? currentUser.email : 'Sin Conexión'}
           </div>

           <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
             <span>🌎</span>
             <span className="uppercase tracking-wide">{storeConfig.country}</span>
             <span className="text-slate-500">|</span>
             <span className="text-brand-gold">{storeConfig.currency}</span>
           </div>
        </div>
      </header>
      
      {/* ÁREA DE CONTENIDO */}
      <div className="flex-1 relative bg-slate-100 overflow-hidden">
        {[0, 1, 2, 3].map(index => (
          <div 
            key={index} 
            className={cn(
              "absolute inset-0 w-full h-full transition-opacity duration-150 bg-slate-100",
              activeTab === index 
                ? "z-10 opacity-100 visible" 
                : "z-0 opacity-0 invisible pointer-events-none"
            )}
          >
            <PosInterface
              isActive={activeTab === index}
              cart={carts[index] || []} 
              onCartChange={(newItems) => setCart(index, newItems)}
              onSaleComplete={() => clearCart(index)}
              storeConfig={storeConfig} 
              currentUser={currentUser} /* 👈 Pasamos el usuario a la interfaz */
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default PosPage;