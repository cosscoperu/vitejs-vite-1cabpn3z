import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { 
  collection, query, orderBy, getDocs, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
  limit, where, startAt, endAt 
} from 'firebase/firestore';
import toast from 'react-hot-toast';

const generateProductCode = (data) => {
    let finalCodes = data.codes || [];
    let finalCode = finalCodes.length > 0 ? finalCodes[0] : null;
    if (!finalCode || finalCode.trim().length === 0) {
        const uniqueSuffix = Date.now().toString().slice(-6);
        finalCode = `INT-${uniqueSuffix}`;
        finalCodes = [finalCode];
    }
    return { finalCode, finalCodes };
};

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. CARGA INICIAL (Limitada a 20 para ahorrar)
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'products'), 
        orderBy('createdAt', 'desc'), 
        limit(20) 
      );
      const snapshot = await getDocs(q); 
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
    } catch (err) {
      console.error(err);
      setError("Error cargando inventario.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. NUEVA FUNCIÓN: BÚSQUEDA EN NUBE (Profesional)
  // Busca en TODA la base de datos, no solo en lo visible.
  const searchProducts = async (term) => {
    if (!term || term.trim() === '') {
        loadProducts(); // Si borran el texto, volvemos a los 20 iniciales
        return;
    }

    setLoading(true);
    try {
        const searchTerm = term.trim(); // No convertimos a minúsculas porque Firestore es Case Sensitive por defecto
        
        // ESTRATEGIA: Buscamos por nombre (prefijo). 
        // Nota: Para buscar por código EXACTO o array, se requiere otra query, 
        // pero "startAt" funciona bien para nombres y códigos si son strings.
        
        const q = query(
            collection(db, 'products'),
            orderBy('name'), // Necesario para hacer búsqueda por rango
            startAt(searchTerm),
            endAt(searchTerm + '\uf8ff'),
            limit(20) // Traemos los 20 mejores resultados de esa búsqueda
        );

        const snapshot = await getDocs(q);
        
        // Si no encontramos por nombre, intentamos buscar por CÓDIGO exacto (Plan B)
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (data.length === 0) {
             const qCode = query(
                collection(db, 'products'),
                where('codes', 'array-contains', searchTerm),
                limit(5)
             );
             const snapshotCode = await getDocs(qCode);
             data = snapshotCode.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        if (data.length === 0) {
            toast('No se encontraron coincidencias', { icon: '🔍' });
            // Opcional: limpiar lista o dejar la anterior
            setProducts([]); 
        } else {
            setProducts(data);
        }

    } catch (err) {
        console.error("Error en búsqueda:", err);
        // Si falla (ej. por falta de índice), recargamos lo normal
        toast.error("Error buscando. Verifica índices.");
        loadProducts(); 
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ESTRATEGIA ZERO-COST (Local update)
  useEffect(() => {
    const handleLocalUpdate = (event) => {
      const soldItems = event.detail.items || [];
      setProducts(currentProducts => {
        return currentProducts.map(p => {
          const sold = soldItems.find(s => s.id === p.id);
          if (sold) {
            const newStock = (Number(p.stock) || 0) - sold.quantity;
            return { ...p, stock: newStock };
          }
          return p;
        });
      });
    };
    window.addEventListener('product-stock-update', handleLocalUpdate);
    return () => window.removeEventListener('product-stock-update', handleLocalUpdate);
  }, []);

  const addMovement = async (movementData) => { /* ... (Igual que antes) ... */ 
      // ... Copia el contenido de addMovement de tu versión anterior ...
      // Para ahorrar espacio aquí, asumo que mantienes la lógica de AddMovement igual
      // Si la necesitas completa dímelo.
      try {
        if (!movementData.productId || movementData.quantity === undefined) throw new Error('Incompleto');
        const currentProduct = products.find(p => p.id === movementData.productId);
        const previousStock = currentProduct ? (Number(currentProduct.stock) || 0) : 0;
        const quantity = Number(movementData.quantity);
        const newStock = previousStock + quantity;
        const movement = {
            productId: movementData.productId, type: movementData.type || 'AJUSTE',
            quantity: quantity, previousStock: previousStock, newStock: newStock,
            reason: movementData.reason || 'Ajuste', user: movementData.user || 'admin',
            timestamp: serverTimestamp(),
        };
        const movementRef = await addDoc(collection(db, 'movements'), movement);
        const productRef = doc(db, 'products', movementData.productId);
        await updateDoc(productRef, { stock: newStock });
        setProducts(prev => prev.map(p => p.id === movementData.productId ? { ...p, stock: newStock } : p));
        toast.success('Movimiento registrado.');
        return movementRef.id;
      } catch (err) { console.error(err); toast.error('Error movimiento'); throw err; }
  };

  const add = async (productData) => {
     /* ... Copia tu función add anterior ... */
     try {
      const { finalCode, finalCodes } = generateProductCode(productData);
      const newProduct = { ...productData, code: finalCode, codes: finalCodes, createdAt: serverTimestamp() };
      const ref = await addDoc(collection(db, 'products'), newProduct);
      setProducts(prev => [{ ...newProduct, id: ref.id }, ...prev]);
      toast.success('Producto agregado.');
      return true;
    } catch (err) { console.error(err); toast.error('Error al agregar.'); return false; }
  };

  const update = async (id, updates) => {
     /* ... Copia tu función update anterior ... */
    try {
      const docRef = doc(db, 'products', id);
      await updateDoc(docRef, updates);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      toast.success('Producto actualizado.');
      return true;
    } catch (err) { console.error(err); toast.error('Error al actualizar.'); return false; }
  };

  const remove = async (id) => {
      /* ... Copia tu función remove anterior ... */
      if (!window.confirm("¿Borrar?")) return;
      try {
        await deleteDoc(doc(db, 'products', id));
        setProducts(prev => prev.filter(p => p.id !== id));
        toast.success('Eliminado.');
      } catch (err) { console.error(err); toast.error('Error.'); }
  };

  // EXPORTAMOS LA NUEVA FUNCIÓN searchProducts
  return { products, loading, error, add, update, remove, loadProducts, addMovement, searchProducts };
};