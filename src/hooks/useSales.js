import { useState } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  writeBatch, 
  doc, 
  increment,
  updateDoc 
} from 'firebase/firestore';
import toast from 'react-hot-toast';

export const useSales = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- 1. PROCESAR VENTA (COBRAR) ---
  const processSale = async (saleData, cartItems) => {
    setLoading(true);
    try {
      const batch = writeBatch(db);

      // A) Crear el registro de venta
      const saleRef = doc(collection(db, 'sales')); // Generamos ID automático
      batch.set(saleRef, {
        ...saleData,
        items: cartItems,
        createdAt: serverTimestamp(),
        status: 'completed' // Estado inicial
      });

      // B) Descontar Stock (Solo productos reales, no genéricos 'RAPIDO')
      cartItems.forEach(item => {
        if (item.id && !item.id.toString().startsWith('RAPIDO-')) {
          const productRef = doc(db, 'products', item.id);
          // Restamos la cantidad vendida
          batch.update(productRef, { 
            stock: increment(-item.quantity) 
          });
        }
      });

      await batch.commit();
      return { success: true, id: saleRef.id };

    } catch (err) {
      console.error("Error procesando venta:", err);
      setError(err.message);
      toast.error("Error al procesar la venta");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // --- 2. ANULAR VENTA (DEVOLVER STOCK) ---
  const cancelSale = async (sale) => {
    if (!sale || !sale.id) return;
    
    // Si ya está anulada, no hacer nada
    if (sale.status === 'cancelled') {
        toast.error("Esta venta ya está anulada.");
        return;
    }

    if (!window.confirm(`¿Confirmas ANULAR esta venta por S/ ${sale.total}?`)) return;

    setLoading(true);
    try {
      const batch = writeBatch(db);

      // A) Marcar venta como CANCELLED
      const saleRef = doc(db, 'sales', sale.id);
      batch.update(saleRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // B) Devolver Stock (Reverse Logistics)
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          if (item.id && !item.id.toString().startsWith('RAPIDO-')) {
            const productRef = doc(db, 'products', item.id);
            // Sumamos la cantidad de vuelta
            batch.update(productRef, { 
              stock: increment(item.quantity) 
            });
          }
        });
      }

      await batch.commit();
      toast.success("Venta anulada. Stock restaurado.");
      return true;

    } catch (err) {
      console.error("Error anulando venta:", err);
      toast.error("No se pudo anular la venta.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { 
    processSale, 
    cancelSale, // <--- ¡Importante! Exportamos la función
    loading, 
    error 
  };
};