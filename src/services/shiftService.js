import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';

const COLLECTION_NAME = 'shifts';

/**
 * Verifica si hay un turno abierto actualmente.
 * @returns {Promise<Object|null>} El objeto del turno o null si no hay.
 */
export const getCurrentOpenShift = async () => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('status', '==', 'open'), 
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error("Error consultando turno abierto:", error);
    throw error;
  }
};

/**
 * Abre un nuevo turno de caja.
 * @param {number} initialAmount - Monto de apertura (Sencillo/Cambio).
 * @param {string} userId - ID del usuario que abre.
 * @param {string} userName - Nombre del usuario.
 */
export const openShift = async (initialAmount, userId = 'sistema', userName = 'Cajero Principal') => {
  try {
    // 1. Doble verificación: Asegurar que no haya otro abierto (por seguridad)
    const current = await getCurrentOpenShift();
    if (current) throw new Error("Ya existe una caja abierta.");

    const newShift = {
      status: 'open',
      initialAmount: Number(initialAmount),
      userId,
      userName,
      startTime: serverTimestamp(),
      salesTotal: 0, // Se irán sumando o calculando al cierre
      expensesTotal: 0,
      expectedTotal: Number(initialAmount) // Inicialmente es lo que hay
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), newShift);
    return { id: docRef.id, ...newShift };
  } catch (error) {
    console.error("Error abriendo caja:", error);
    throw error;
  }
};

/**
 * Cierra el turno actual.
 * @param {string} shiftId - ID del turno a cerrar.
 * @param {Object} closingData - Datos finales (total ventas, gastos, efectivo real, etc).
 */
export const closeShift = async (shiftId, closingData) => {
  try {
    const shiftRef = doc(db, COLLECTION_NAME, shiftId);
    
    const closingPayload = {
      status: 'closed',
      endTime: serverTimestamp(),
      ...closingData // totalSales, totalExpenses, finalCashCount, discrepancy
    };

    await updateDoc(shiftRef, closingPayload);
    return true;
  } catch (error) {
    console.error("Error cerrando caja:", error);
    throw error;
  }
};