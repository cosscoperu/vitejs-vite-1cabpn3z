import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'pos_carts_v1';
// Inicializamos con 4 carritos vacíos para las 4 pestañas de venta
const INITIAL_STATE = [[], [], [], []];

export const useCart = () => {
  // 1. CARGA INTELIGENTE (Recupera datos si se cerró el navegador)
  const [carts, setCarts] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      // Verificamos que lo guardado sea válido (un array de 4 espacios)
      if (Array.isArray(parsed) && parsed.length === 4) return parsed;
      return INITIAL_STATE;
    } catch (error) {
      console.error("Error recuperando carrito:", error);
      return INITIAL_STATE;
    }
  });

  const [activeTab, setActiveTab] = useState(0);

  // 2. GUARDADO AUTOMÁTICO (Cada vez que cambias algo, se graba)
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(carts));
    } catch (error) {
      console.error("Error guardando carrito:", error);
    }
  }, [carts]);

  // --- ACCIONES DEL CARRITO ---

  /**
   * Helper para reemplazar el carrito completo de una pestaña
   * (Necesario para que PosInterface funcione como antes)
   */
  const setCart = useCallback((tabIndex, newItems) => {
    setCarts(prev => {
      const copy = [...prev];
      copy[tabIndex] = newItems || [];
      return copy;
    });
  }, []);

  /**
   * Vacía todo el carrito (al terminar venta)
   */
  const clearCart = useCallback((tabIndex) => {
    setCarts(prev => {
      const copy = [...prev];
      copy[tabIndex] = [];
      return copy;
    });
  }, []);

  // Exportamos todo lo necesario
  return {
    carts,
    activeTab,
    setActiveTab,
    setCart,    // Para actualizar manualmente desde la interfaz antigua
    clearCart   // Para limpiar después de la venta
  };
};