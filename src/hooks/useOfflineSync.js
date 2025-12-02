// hooks/useOfflineSync.js
import { useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  writeBatch, 
  doc, 
  increment 
} from 'firebase/firestore';
import toast from 'react-hot-toast';

const OFFLINE_SALES_KEY = 'pos_offline_sales_v1';

// Guarda una venta pendiente en localStorage
const savePendingSale = (sale) => {
  try {
    const current = getPendingSales();
    const updated = [...current, sale];
    localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error guardando venta offline', e);
  }
};

// Obtiene todas las ventas pendientes
const getPendingSales = () => {
  try {
    const raw = localStorage.getItem(OFFLINE_SALES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error leyendo ventas offline', e);
    return [];
  }
};

// Elimina una venta pendiente (ya sincronizada)
const removePendingSale = (id) => {
  try {
    const current = getPendingSales().filter(s => s.id !== id);
    localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Error eliminando venta offline', e);
  }
};

// Intenta sincronizar UNA venta pendiente
const syncSale = async (pendingSale) => {
  const { saleData, cartItems } = pendingSale;

  // 1. Actualizamos estado local a "syncing"
  const temp = getPendingSales().map(s => 
    s.id === pendingSale.id ? { ...s, status: 'syncing' } : s
  );
  localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(temp));

  // 2. Ejecutamos la misma lógica que processSale
  const batch = writeBatch(db);

  const saleRef = doc(collection(db, 'sales'));
  batch.set(saleRef, {
    ...saleData,
    items: cartItems,
    createdAt: serverTimestamp(),
    status: 'completed'
  });

  cartItems.forEach(item => {
    if (item.id && !item.id.toString().startsWith('RAPIDO-')) {
      const productRef = doc(db, 'products', item.id);
      batch.update(productRef, { stock: increment(-item.quantity) });
    }
  });

  await batch.commit();

  // 3. Si todo OK, eliminamos del almacenamiento local
  removePendingSale(pendingSale.id);
  return saleRef.id;
};

// Hook principal
export const useOfflineSync = () => {
  useEffect(() => {
    const processPendingSales = async () => {
      const pending = getPendingSales().filter(s => s.status === 'pending');
      if (pending.length === 0) return;

      toast.loading(`Sincronizando ${pending.length} venta(s) pendiente(s)...`, { id: 'sync' });

      let successCount = 0;
      for (const sale of pending) {
        try {
          await syncSale(sale);
          successCount++;
          // Opcional: emitir evento para actualizar stock local
          window.dispatchEvent(new CustomEvent('product-stock-update', {
            detail: { items: sale.cartItems }
          }));
        } catch (err) {
          console.error('Fallo al sincronizar venta:', sale.id, err);
          // Marcar como fallida (opcional: reintentar más tarde)
          const updated = getPendingSales().map(s =>
            s.id === sale.id ? { ...s, status: 'failed' } : s
          );
          localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(updated));
        }
      }

      toast.dismiss('sync');
      if (successCount > 0) {
        toast.success(`✅ ${successCount} venta(s) sincronizada(s)`);
      }
    };

    // Escuchar cambios de conectividad
    const handleOnline = () => {
      // Pequeño delay para asegurar conexión estable
      setTimeout(() => {
        if (navigator.onLine) {
          processPendingSales();
        }
      }, 2000);
    };

    // Ejecutar al inicio si hay conexión
    if (navigator.onLine) {
      processPendingSales();
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);
};