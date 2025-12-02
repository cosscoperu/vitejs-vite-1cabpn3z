import { db } from '../firebase/config';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy, // <-- ESTO FALTABA PARA EL ORDEN
  serverTimestamp
} from 'firebase/firestore';

// Referencia a la colección 'products' en Firestore
const collectionRef = collection(db, 'products');

/**
 * Obtiene todos los productos de la colección, ordenados por fecha de creación.
 * @returns {Promise<Array>} Un array de objetos de producto con su ID.
 */
export const getProducts = async () => {
  try {
    // CORRECCIÓN DE ORDEN: Usamos 'query' y 'orderBy'
    // 'desc' significa descendente (del más nuevo al más viejo)
    const q = query(collectionRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return products;
  } catch (error) {
    console.error("Error en getProducts (Service Layer):", error);
    throw error; // Re-lanzamos el error para que lo maneje el Hook
  }
};

/**
 * Agrega un nuevo producto con lógica robusta de códigos.
 * @param {Object} productData - Los datos del producto provenientes del formulario.
 * @returns {Promise<DocumentReference>} La referencia del documento creado.
 */
export const addProduct = async (productData) => {
  try {
    // --- LÓGICA BLINDADA DE CÓDIGOS ---
    let finalCodes = productData.codes || [];
    let finalCode = null;

    // Escenario 1: El usuario escaneó uno o más códigos en el formulario nuevo.
    // Tomamos el primero de la lista como el "código principal".
    if (finalCodes.length > 0) {
        finalCode = finalCodes[0];
    }

    // Escenario 2: No hay códigos (ni lista, ni principal). Generamos automático.
    // Verificamos si finalCode sigue siendo nulo o vacío.
    if (!finalCode || finalCode.trim().length === 0) {
      const uniqueSuffix = Date.now().toString().slice(-6);
      finalCode = `INT-${uniqueSuffix}`;
      // Aseguramos que la lista también tenga este código generado
      finalCodes = [finalCode];
    }

    // Preparar el objeto final para guardar en Firebase
    const newProduct = {
      ...productData,
      code: finalCode,       // SIEMPRE tendrá un valor (escaneado o INT)
      codes: finalCodes,     // SIEMPRE será un array con al menos un valor
      createdAt: serverTimestamp()
    };

    // Guardar en Firestore
    return await addDoc(collectionRef, newProduct);

  } catch (error) {
    console.error("Error en addProduct (Service Layer):", error);
    throw error;
  }
};

/**
 * Actualiza un producto existente.
 * @param {string} id - El ID del producto a actualizar.
 * @param {Object} updates - Objeto con los campos a modificar.
 */
export const updateProduct = async (id, updates) => {
  try {
    const productDoc = doc(db, 'products', id);
    // Agregamos timestamp de última edición si lo deseas, si no, se puede quitar.
    const updatesWithTimestamp = {
        ...updates,
        updatedAt: serverTimestamp()
    };
    await updateDoc(productDoc, updatesWithTimestamp);
  } catch (error) {
    console.error("Error en updateProduct:", error);
    throw error;
  }
};

/**
 * Elimina un producto (Lógica física por ahora).
 * @param {string} id - El ID del producto a eliminar.
 */
export const deleteProduct = async (id) => {
  try {
    const productDoc = doc(db, 'products', id);
    await deleteDoc(productDoc);
  } catch (error) {
    console.error("Error en deleteProduct:", error);
    throw error;
  }
};