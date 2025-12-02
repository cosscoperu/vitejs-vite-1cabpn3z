import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config'; // Agregamos db
import { doc, getDoc } from 'firebase/firestore'; // Agregamos funciones de Firestore
import useHotkeys from '../hooks/useHotkeys';
import ConfigModal from './ConfigModal';
import { cn } from '../utils/cn'; 

// --- ICONOS MODERNOS ---
import { 
  LayoutDashboard, ShoppingCart, ShoppingBag, Package, 
  Wallet, Smartphone, FileBarChart, Settings, LogOut, 
  ChevronLeft, ChevronRight, Menu 
} from 'lucide-react';

function MainLayout() {
  const navigate = useNavigate();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  // --- ESTADO PARA CONTROLAR LA BARRA ---
  const [isExpanded, setIsExpanded] = useState(true);

  // --- ESTADO PARA LA CONFIGURACIÓN GLOBAL (TICKET, LOGO, QR) ---
  const [storeConfig, setStoreConfig] = useState(null);

  // Función para cargar la configuración desde Firebase
  const loadConfig = async () => {
    try {
      const docRef = doc(db, 'settings', 'company');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Combinamos la data general con la config del POS
        setStoreConfig({
            ...data,
            posConfig: data.posConfig || { currency: 'S/', country: 'PERU' }
        });
      }
    } catch (err) {
      console.error("Error cargando configuración:", err);
    }
  };

  // Cargar al iniciar y escuchar cambios
  useEffect(() => {
    loadConfig();
    // Escuchar el evento que dispara el ConfigModal al guardar
    window.addEventListener('pos-config-updated', loadConfig);
    return () => window.removeEventListener('pos-config-updated', loadConfig);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) { console.error('Error al cerrar sesión:', err); }
  };

  const openSalesWindow = () => {
    window.open('/ventas', '_blank'); 
  };
  
  // Atajos (Sin cambios)
  const keyMap = {
    'F5': () => navigate('/'),
    'F6': () => openSalesWindow(),
    'F7': () => navigate('/inventario'),
    'F8': () => navigate('/reportes'),
    'F9': () => navigate('/compras'),
    'F10': () => navigate('/gastos'),
    'F11': () => navigate('/pedidos'),
  };
  useHotkeys(keyMap, [navigate, openSalesWindow]);

  // --- COMPONENTE DE ÍTEM DE MENÚ INTELIGENTE ---
  const NavItem = ({ to, icon: Icon, label, hotkey, onClick, isSpecial }) => {
    
    // Clases base para el contenedor del ítem
    const baseClasses = cn(
      "flex items-center gap-3 py-3 font-medium transition-all duration-200 rounded-lg mb-1 group relative",
      // Si está expandido padding normal, si no, centrado
      isExpanded ? "px-4" : "justify-center px-2"
    );

    // Renderizado interno (Icono + Texto)
    const content = (isActive) => (
      <>
        {/* Indicador lateral activo (Solo visible si no es botón especial) */}
        {!isSpecial && isActive && (
          <div className="absolute left-0 h-6 w-1 rounded-r-full bg-brand-gold" />
        )}
        
        {/* Icono: Si está colapsado, aumentamos un poco el tamaño para mejor click */}
        <Icon 
          size={isExpanded ? 20 : 24} 
          className={cn(
            "transition-colors",
            isSpecial ? "text-white" : (isActive ? "text-brand-gold" : "text-slate-400 group-hover:text-white")
          )} 
        />
        
        {/* Texto y Hotkey: Solo visibles si está expandido */}
        <div className={cn(
          "flex items-center justify-between flex-1 overflow-hidden transition-all duration-300",
          isExpanded ? "opacity-100 w-auto ml-3" : "opacity-0 w-0 ml-0"
        )}>
          <span className="whitespace-nowrap">{label}</span>
          {hotkey && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded border opacity-70",
              isSpecial 
                ? "border-white/30 bg-white/20" 
                : (isActive ? "border-brand-gold/30 bg-brand-gold/10 text-brand-gold" : "border-slate-600 bg-slate-800")
            )}>
              {hotkey}
            </span>
          )}
        </div>

        {/* TOOLTIP: Solo aparece si está colapsado y pasas el mouse */}
        {!isExpanded && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700">
            {label} {hotkey && `(${hotkey})`}
          </div>
        )}
      </>
    );

    // CASO 1: Botón (Como Ventas)
    if (onClick) {
      return (
        <button
          onClick={onClick}
          className={cn(
            baseClasses,
            isSpecial 
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 hover:scale-[1.02]" 
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
          title={!isExpanded ? label : undefined} // Tooltip nativo simple
        >
          {content(false)}
        </button>
      );
    }

    // CASO 2: Link Normal
    return (
      <NavLink
        to={to}
        end={to === '/'}
        className={({ isActive }) => cn(
          baseClasses,
          isActive 
            ? "bg-brand-gold/10 text-brand-gold" 
            : "text-slate-400 hover:text-white hover:bg-white/5"
        )}
      >
        {({ isActive }) => content(isActive)}
      </NavLink>
    );
  };

  // --- SEPARADOR DE SECCIÓN (Se oculta si está colapsado) ---
  const SectionTitle = ({ children }) => (
    <div className={cn(
      "px-4 mb-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-wider transition-opacity duration-300",
      isExpanded ? "opacity-100" : "opacity-0 h-0 overflow-hidden mt-0"
    )}>
      {children}
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      
      {/* --- SIDEBAR DINÁMICO --- */}
      <aside 
        className={cn(
          "bg-slate-900 flex flex-col shadow-xl z-20 flex-shrink-0 transition-all duration-300 ease-in-out",
          isExpanded ? "w-64" : "w-20" // ANCHO DINÁMICO
        )}
      >
        
        {/* HEADER DEL SIDEBAR (Logo + Toggle) */}
        <div className={cn(
          "h-16 flex items-center border-b border-slate-800 transition-all",
          isExpanded ? "px-6 justify-between" : "px-0 justify-center"
        )}>
          
          {/* Logo */}
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 min-w-[32px] rounded-lg bg-gradient-to-br from-brand-gold to-yellow-600 flex items-center justify-center text-white font-bold shadow-lg">
              C
            </div>
            <span className={cn(
              "text-xl font-extrabold text-white tracking-wide transition-all duration-300",
              isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
            )}>
              COSSCO
            </span>
          </div>

          {/* Botón Toggle (Flecha) - Solo visible si está expandido, o flotante si cerrado */}
          {isExpanded && (
            <button 
              onClick={() => setIsExpanded(false)}
              className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}
        </div>

        {/* Si está cerrado, mostramos el botón de abrir arriba para fácil acceso */}
        {!isExpanded && (
          <div className="flex justify-center py-2 border-b border-slate-800/50">
             <button 
              onClick={() => setIsExpanded(true)}
              className="text-slate-500 hover:text-brand-gold p-1.5 rounded hover:bg-slate-800 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* NAVEGACIÓN */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 scrollbar-hide">
          
          <SectionTitle>Principal</SectionTitle>
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" hotkey="F5" />
          <NavItem onClick={openSalesWindow} icon={ShoppingCart} label="Punto de Venta" hotkey="F6" isSpecial />

          <SectionTitle>Operaciones</SectionTitle>
          <NavItem to="/inventario" icon={Package} label="Inventario" hotkey="F7" />
          <NavItem to="/pedidos" icon={Smartphone} label="Pedidos" hotkey="F11" />
          <NavItem to="/compras" icon={ShoppingBag} label="Compras" hotkey="F9" />

          <SectionTitle>Administración</SectionTitle>
          <NavItem to="/gastos" icon={Wallet} label="Finanzas" hotkey="F10" />
          <NavItem to="/reportes" icon={FileBarChart} label="Reportes" hotkey="F8" />
        
        </nav>

        {/* FOOTER (Perfil + Config) */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50">
          <button 
            onClick={() => setIsConfigModalOpen(true)}
            className={cn(
              "w-full flex items-center gap-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors mb-2",
              isExpanded ? "px-4" : "justify-center px-0"
            )}
            title={!isExpanded ? "Configuración" : ""}
          >
            <Settings size={20} />
            {isExpanded && <span>Configuración</span>}
          </button>
          
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors",
              isExpanded ? "px-4" : "justify-center px-0"
            )}
            title={!isExpanded ? "Cerrar Sesión" : ""}
          >
            <LogOut size={20} />
            {isExpanded && <span>Salir</span>}
          </button>
        </div>
      </aside>

      {/* --- ÁREA DE CONTENIDO --- */}
      <main className="flex-1 overflow-hidden flex flex-col relative bg-slate-50/50">
        <div className="flex-1 overflow-auto">
          {/* 👇 AQUÍ ESTÁ EL CAMBIO CLAVE: Pasamos la configuración al POS */}
          <Outlet context={{ storeConfig }} />
        </div>
      </main>

      <ConfigModal show={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} />
    </div>
  );
}

export default MainLayout;