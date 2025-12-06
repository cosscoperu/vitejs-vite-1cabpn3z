// src/services/shiftService.js
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
  increment,
} from 'firebase/firestore';

const COLLECTION_NAME = 'shifts';

/**
 * Obtiene el turno abierto actual (si existe) y normaliza campos numéricos.
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
 */
export const openShift = async (
  initialAmount,
  userId = 'sistema',
  userName = 'Cajero Principal'
) => {
  try {
    // Evitar 2 cajas abiertas
    const current = await getCurrentOpenShift();
    if (current) throw new Error('Ya existe una caja abierta.');

    const inicial = Number(initialAmount) || 0;

    const newShift = {
      status: 'open',
      userId,
      userName,
      startTime: serverTimestamp(),

      initialAmount: inicial,
      salesTotal: 0,
      expensesTotal: 0,
      expectedTotal: inicial,
      itemsSold: 0,

      cashSales: 0,
      digitalSales: 0,
      cardSales: 0,
      bankSales: 0,
      otherSales: 0,
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), newShift);

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
 * Suma un gasto al turno actual (campo expensesTotal).
 */
export const addExpenseToShift = async (shiftId, amount) => {
  try {
    const shiftRef = doc(db, COLLECTION_NAME, shiftId);
    await updateDoc(shiftRef, {
      expensesTotal: increment(Number(amount) || 0),
    });
  } catch (error) {
    console.error('Error actualizando gastos del turno:', error);
    throw error;
  }
};

/**
 * Cierra el turno actual.
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
