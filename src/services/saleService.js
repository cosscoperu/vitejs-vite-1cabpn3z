import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  getDoc,
  writeBatch, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';

// --- 1. FUNCIÓN PARA CREAR VENTA ---
export const createSale = async (saleData, cartItems) => {
  const batch = writeBatch(db);
  const saleRef = doc(collection(db, 'sales'));
  
  const newSale = {
    ...saleData,
    status: 'COMPLETED', // Estado inicial obligatorio para poder anular después
    items: cartItems.map(item => ({
      id: item.id.startsWith('TEMP-') || item.id.startsWith('RAPIDO-') ? null : item.id,
      name: item.name,
      cost: Number(item.cost) || 0,
      price: Number(item.price) || 0,
      originalPrice: Number(item.originalPrice) || 0,
      quantity: Number(item.quantity) || 0,
      discount: Number(item.discount) || 0,
      discountPercent: Number(item.discountPercent) || 0
    })),
    createdAt: serverTimestamp()
  };

  batch.set(saleRef, newSale);

  // Descontar Stock
  cartItems.forEach(item => {
    const isTemp = item.id && (String(item.id).startsWith('TEMP-') || String(item.id).startsWith('RAPIDO-'));
    if (item.id && !isTemp) {
      const productRef = doc(db, 'products', item.id);
      batch.update(productRef, { stock: increment(-item.quantity) });
    }
  });

  // Actualizar Caja (Shift)
  if (saleData.shiftId) {
    const shiftRef = doc(db, 'shifts', saleData.shiftId);
    
    const updates = {
      salesTotal: increment(saleData.total),
      itemsSold: increment(saleData.totalItems || 0)
    };

    const payment = saleData.payment || {};
    const paymentsToProcess = Array.isArray(payment.multiPayments) && payment.multiPayments.length > 0
        ? payment.multiPayments 
        : [{ method: payment.method, type: payment.type, amount: saleData.total }];

    const tempTotals = { cashSales: 0, digitalSales: 0, cardSales: 0, bankSales: 0, otherSales: 0 };

    paymentsToProcess.forEach(p => {
        const amount = Number(p.amount) || 0;
        const type = String(p.type || '').toUpperCase().trim();
        const method = String(p.method || '').toUpperCase().trim();

        if (type === 'CASH') tempTotals.cashSales += amount;
        else if (type === 'DIGITAL') tempTotals.digitalSales += amount;
        else if (type === 'CARD') tempTotals.cardSales += amount;
        else if (type === 'BANK') tempTotals.bankSales += amount;
        else {
            if (method.includes('EFECTIVO') || method.includes('CASH')) tempTotals.cashSales += amount;
            else if (method.includes('YAPE') || method.includes('PLIN') || method.includes('DIGITAL')) tempTotals.digitalSales += amount;
            else if (method.includes('TARJETA') || method.includes('POS')) tempTotals.cardSales += amount;
            else if (method.includes('BANCO') || method.includes('TRANSFERENCIA')) tempTotals.bankSales += amount;
            else tempTotals.otherSales += amount;
        }
    });

    if (tempTotals.cashSales > 0) updates.cashSales = increment(tempTotals.cashSales);
    if (tempTotals.digitalSales > 0) updates.digitalSales = increment(tempTotals.digitalSales);
    if (tempTotals.cardSales > 0) updates.cardSales = increment(tempTotals.cardSales);
    if (tempTotals.bankSales > 0) updates.bankSales = increment(tempTotals.bankSales);
    if (tempTotals.otherSales > 0) updates.otherSales = increment(tempTotals.otherSales);

    batch.update(shiftRef, updates);
  }

  try {
    await batch.commit();
    return { success: true, id: saleRef.id };
  } catch (error) {
    console.error("Error en transacción de venta:", error);
    throw error;
  }
};

// --- 2. FUNCIÓN PARA ANULAR VENTA (Reversión) ---
export const voidSale = async (saleId, reason = 'Error de digitación') => {
  const batch = writeBatch(db);
  
  // Obtener venta original
  const saleRef = doc(db, 'sales', saleId);
  const saleSnap = await getDoc(saleRef);

  if (!saleSnap.exists()) throw new Error("Venta no encontrada");
  const saleData = saleSnap.data();

  if (saleData.status === 'CANCELLED') throw new Error("Esta venta ya está anulada");

  // Marcar como ANULADA
  batch.update(saleRef, {
    status: 'CANCELLED',
    voidedAt: serverTimestamp(),
    voidReason: reason
  });

  // Devolver Stock
  if (saleData.items && Array.isArray(saleData.items)) {
    saleData.items.forEach(item => {
      if (item.id) { 
         const productRef = doc(db, 'products', item.id);
         batch.update(productRef, { stock: increment(item.quantity) });
      }
    });
  }

  // Restar dinero de la Caja
  if (saleData.shiftId) {
    const shiftRef = doc(db, 'shifts', saleData.shiftId);

    const updates = {
      salesTotal: increment(-saleData.total),
      itemsSold: increment(-(saleData.totalItems || 0))
    };

    const payment = saleData.payment || {};
    const paymentsToProcess = Array.isArray(payment.multiPayments) && payment.multiPayments.length > 0
        ? payment.multiPayments 
        : [{ method: payment.method, type: payment.type, amount: saleData.total }];

    const tempTotals = { cashSales: 0, digitalSales: 0, cardSales: 0, bankSales: 0, otherSales: 0 };

    paymentsToProcess.forEach(p => {
        const amount = Number(p.amount) || 0;
        const type = String(p.type || '').toUpperCase().trim();
        const method = String(p.method || '').toUpperCase().trim();

        if (type === 'CASH') tempTotals.cashSales += amount;
        else if (type === 'DIGITAL') tempTotals.digitalSales += amount;
        else if (type === 'CARD') tempTotals.cardSales += amount;
        else if (type === 'BANK') tempTotals.bankSales += amount;
        else {
            if (method.includes('EFECTIVO') || method.includes('CASH')) tempTotals.cashSales += amount;
            else if (method.includes('YAPE') || method.includes('DIGITAL')) tempTotals.digitalSales += amount;
            else if (method.includes('TARJETA') || method.includes('POS')) tempTotals.cardSales += amount;
            else if (method.includes('BANCO')) tempTotals.bankSales += amount;
            else tempTotals.otherSales += amount;
        }
    });

    // Restar (incremento negativo)
    if (tempTotals.cashSales > 0) updates.cashSales = increment(-tempTotals.cashSales);
    if (tempTotals.digitalSales > 0) updates.digitalSales = increment(-tempTotals.digitalSales);
    if (tempTotals.cardSales > 0) updates.cardSales = increment(-tempTotals.cardSales);
    if (tempTotals.bankSales > 0) updates.bankSales = increment(-tempTotals.bankSales);
    if (tempTotals.otherSales > 0) updates.otherSales = increment(-tempTotals.otherSales);

    batch.update(shiftRef, updates);
  }

  try {
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error al anular venta:", error);
    throw error;
  }
};