// src/services/saleService.js
import { db } from '../firebase/config';
import {
  collection,
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
  increment,
} from 'firebase/firestore';

// --- CLASIFICADOR ROBUSTO DE PAGOS ---
// No dependemos solo de type; usamos también el texto del método
// y cualquier cosa rara la tratamos como EFECTIVO por defecto.
function classifyPayment(p, totals, sign = 1) {
  const amount = (Number(p.amount) || 0) * sign;
  if (!amount) return;

  const type = String(p.type || '').toUpperCase().trim();
  const method = String(p.method || '').toUpperCase().trim();

  // 1) Digital (Yape/Plin, Nequi, etc)
  const isDigital =
    type === 'DIGITAL' ||
    method.includes('YAPE') ||
    method.includes('PLIN') ||
    method.includes('NEQUI') ||
    method.includes('DAVIPLATA') ||
    method.includes('MERCADO PAGO') ||
    method.includes('PAGO MOVIL') ||
    method.includes('PAGOMOVIL') ||
    method.includes('ZELLE');

  // 2) Tarjeta / POS
  const isCard =
    type === 'CARD' ||
    method.includes('TARJETA') ||
    method.includes('POS') ||
    method.includes('IZIPAY') ||
    method.includes('VISA') ||
    method.includes('MASTERCARD');

  // 3) Banco / Transferencias
  const isBank =
    type === 'BANK' ||
    method.includes('BANCO') ||
    method.includes('TRANSFER') ||
    method.includes('TRANSF') ||
    method.includes('DEPÓSITO') ||
    method.includes('DEPOSITO');

  // 4) Efectivo (por type o por nombre)
  const isCash =
    type === 'CASH' ||
    method.includes('EFECT') || // EFECTIVO / EFECT
    method.includes('CASH') ||
    method.includes('CONTADO');

  if (isDigital) {
    totals.digitalSales += amount;
  } else if (isCard) {
    totals.cardSales += amount;
  } else if (isBank) {
    totals.bankSales += amount;
  } else if (isCash) {
    totals.cashSales += amount;
  } else {
    // 🔁 Cualquier cosa que no se reconoce va a EFECTIVO por seguridad,
    // así nunca se pierde dinero en el arqueo.
    totals.cashSales += amount;
  }
}

// --- 1. CREAR VENTA ---
export const createSale = async (saleData, cartItems) => {
  const batch = writeBatch(db);
  const saleRef = doc(collection(db, 'sales'));

  const newSale = {
    ...saleData,
    status: 'COMPLETED',
    items: cartItems.map((item) => ({
      id:
        item.id && (item.id.startsWith('TEMP-') || item.id.startsWith('RAPIDO-'))
          ? null
          : item.id,
      name: item.name,
      cost: Number(item.cost) || 0,
      price: Number(item.price) || 0,
      originalPrice: Number(item.originalPrice) || 0,
      quantity: Number(item.quantity) || 0,
      discount: Number(item.discount) || 0,
      discountPercent: Number(item.discountPercent) || 0,
    })),
  createdAt: serverTimestamp(),
  };

  batch.set(saleRef, newSale);

  // --- Descontar stock ---
  cartItems.forEach((item) => {
    const isTemp =
      item.id &&
      (String(item.id).startsWith('TEMP-') ||
        String(item.id).startsWith('RAPIDO-'));
    if (item.id && !isTemp) {
      const productRef = doc(db, 'products', item.id);
      batch.update(productRef, { stock: increment(-Number(item.quantity) || 0) });
    }
  });

  // --- Actualizar caja (Shift) ---
  if (saleData.shiftId) {
    const shiftRef = doc(db, 'shifts', saleData.shiftId);

    const updates = {
      salesTotal: increment(Number(saleData.total) || 0),
      itemsSold: increment(Number(saleData.totalItems) || 0),
    };

    const payment = saleData.payment || {};
    const paymentsToProcess =
      Array.isArray(payment.multiPayments) && payment.multiPayments.length > 0
        ? payment.multiPayments
        : [
            {
              method: payment.method,
              type: payment.type,
              amount: saleData.total,
            },
          ];

    const tempTotals = {
      cashSales: 0,
      digitalSales: 0,
      cardSales: 0,
      bankSales: 0,
      otherSales: 0,
    };

    paymentsToProcess.forEach((p) => classifyPayment(p, tempTotals, +1));

    if (tempTotals.cashSales) updates.cashSales = increment(tempTotals.cashSales);
    if (tempTotals.digitalSales)
      updates.digitalSales = increment(tempTotals.digitalSales);
    if (tempTotals.cardSales) updates.cardSales = increment(tempTotals.cardSales);
    if (tempTotals.bankSales) updates.bankSales = increment(tempTotals.bankSales);
    if (tempTotals.otherSales)
      updates.otherSales = increment(tempTotals.otherSales);

    batch.update(shiftRef, updates);
  }

  try {
    await batch.commit();
    return { success: true, id: saleRef.id };
  } catch (error) {
    console.error('Error en transacción de venta:', error);
    throw error;
  }
};

// --- 2. ANULAR VENTA ---
export const voidSale = async (saleId, reason = 'Error de digitación') => {
  const batch = writeBatch(db);

  const saleRef = doc(db, 'sales', saleId);
  const saleSnap = await getDoc(saleRef);

  if (!saleSnap.exists()) throw new Error('Venta no encontrada');
  const saleData = saleSnap.data();

  if (String(saleData.status).toUpperCase() === 'CANCELLED') {
    throw new Error('Esta venta ya está anulada');
  }

  // Marcar como anulada
  batch.update(saleRef, {
    status: 'CANCELLED',
    voidedAt: serverTimestamp(),
    voidReason: reason,
  });

  // Devolver stock
  if (Array.isArray(saleData.items)) {
    saleData.items.forEach((item) => {
      if (item.id) {
        const productRef = doc(db, 'products', item.id);
        batch.update(productRef, { stock: increment(Number(item.quantity) || 0) });
      }
    });
  }

  // Revertir totales de caja
  if (saleData.shiftId) {
    const shiftRef = doc(db, 'shifts', saleData.shiftId);

    const updates = {
      salesTotal: increment(-(Number(saleData.total) || 0)),
      itemsSold: increment(-(Number(saleData.totalItems) || 0)),
    };

    const payment = saleData.payment || {};
    const paymentsToProcess =
      Array.isArray(payment.multiPayments) && payment.multiPayments.length > 0
        ? payment.multiPayments
        : [
            {
              method: payment.method,
              type: payment.type,
              amount: saleData.total,
            },
          ];

    const tempTotals = {
      cashSales: 0,
      digitalSales: 0,
      cardSales: 0,
      bankSales: 0,
      otherSales: 0,
    };

    // sign = -1 para restar
    paymentsToProcess.forEach((p) => classifyPayment(p, tempTotals, -1));

    if (tempTotals.cashSales) updates.cashSales = increment(tempTotals.cashSales);
    if (tempTotals.digitalSales)
      updates.digitalSales = increment(tempTotals.digitalSales);
    if (tempTotals.cardSales) updates.cardSales = increment(tempTotals.cardSales);
    if (tempTotals.bankSales) updates.bankSales = increment(tempTotals.bankSales);
    if (tempTotals.otherSales)
      updates.otherSales = increment(tempTotals.otherSales);

    batch.update(shiftRef, updates);
  }

  try {
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error al anular venta:', error);
    throw error;
  }
};
