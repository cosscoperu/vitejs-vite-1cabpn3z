// src/services/shiftServices.js
import { db } from '../firebase/config';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

const COLLECTION_NAME = 'shifts';

/**
 * Obtiene el turno abierto actual (si existe).
 * Normaliza todos los montos a Number para que el modal de cierre
 * siempre reciba valores válidos (0 en lugar de undefined).
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
    const data = docSnap.data() || {};

    return {
      id: docSnap.id,
      ...data,
      // Normalizamos todos los campos numéricos
      initialAmount: Number(data.initialAmount || 0),
      salesTotal: Number(data.salesTotal || 0),
      expensesTotal: Number(data.expensesTotal || 0),
      expectedTotal: Number(data.expectedTotal || 0),
      itemsSold: Number(data.itemsSold || 0),

      cashSales: Number(data.cashSales || 0),
      digitalSales: Number(data.digitalSales || 0),
      cardSales: Number(data.cardSales || 0),
      bankSales: Number(data.bankSales || 0),
      otherSales: Number(data.otherSales || 0),
    };
  } catch (error) {
    console.error('Error consultando turno abierto:', error);
    throw error;
  }
};

/**
 * Abre un nuevo turno de caja.
 * @param {number} initialAmount - Monto de apertura (Sencillo/Cambio).
 * @param {string} userId - ID del usuario que abre.
 * @param {string} userName - Nombre del usuario.
 */
export const openShift = async (
  initialAmount,
  userId = 'sistema',
  userName = 'Cajero Principal'
) => {
  try {
    // Verificación doble: evitar 2 cajas abiertas
    const current = await getCurrentOpenShift();
    if (current) throw new Error('Ya existe una caja abierta.');

    const inicial = Number(initialAmount) || 0;

    const newShift = {
      status: 'open',
      userId,
      userName,
      startTime: serverTimestamp(),

      // Fondo y totales
      initialAmount: inicial,
      salesTotal: 0,
      expensesTotal: 0,
      expectedTotal: inicial,
      itemsSold: 0,

      // Desglose por método (IMPORTANTE para el arqueo)
      cashSales: 0,
      digitalSales: 0,
      cardSales: 0,
      bankSales: 0,
      otherSales: 0,
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), newShift);

    // Devolvemos el objeto normalizado como en getCurrentOpenShift
    return {
      id: docRef.id,
      ...newShift,
    };
  } catch (error) {
    console.error('Error abriendo caja:', error);
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
      ...closingData, // finalCashCount, expectedCash, difference, totalSales, notes, currency...
    };

    await updateDoc(shiftRef, closingPayload);
    return true;
  } catch (error) {
    console.error('Error cerrando caja:', error);
    throw error;
  }
};
