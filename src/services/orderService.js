import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  getDoc,
  writeBatch, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';

// --- HELPER PRIVADO: Genera los updates para la Caja (Shift) ---
const getShiftUpdates = (amount, paymentMethod = 'OTHER', type = 'SALES') => {
  if (!amount || amount <= 0) return {};

  const updates = {
    salesTotal: increment(amount),
    itemsSold: type === 'SALES' ? increment(1) : increment(0) 
  };

  const method = String(paymentMethod).toUpperCase();
  
  if (method.includes('EFECTIVO') || method === 'CASH') {
    updates.cashSales = increment(amount);
  } else if (method.includes('YAPE') || method.includes('PLIN') || method === 'DIGITAL') {
    updates.digitalSales = increment(amount);
  } else if (method.includes('TARJETA') || method.includes('CARD')) {
    updates.cardSales = increment(amount);
  } else if (method.includes('BANCO') || method.includes('TRANSFERENCIA')) {
    updates.bankSales = increment(amount);
  } else {
    updates.otherSales = increment(amount);
  }
  return updates;
};

// ... (createPendingOrder se mantiene igual, pero por brevedad no lo repito si no cambiaste nada, 
// AUNQUE para asegurar consistencia, TE COPIO EL ARCHIVO COMPLETO CON LAS NUEVAS FUNCIONES AL FINAL)

// 1. CREAR PEDIDO
export const createPendingOrder = async (cartItems, subtotal, total, clientInfo = {}, shiftId = null) => {
  const batch = writeBatch(db);
  const orderRef = doc(collection(db, 'orders'));
  const advanceAmount = Number(clientInfo.advance) || 0;
  const totalAmount = Number(total) || 0;
  const isBagOpening = clientInfo.isBagOpening || false;

  const newOrder = {
    id: orderRef.id,
    items: cartItems.map(item => ({
      id: item.id, name: item.name, cost: Number(item.cost) || 0,
      price: Number(item.price) || 0, quantity: Number(item.quantity) || 0, codes: item.codes || []
    })),
    subtotal: Number(subtotal),
    total: totalAmount,
    payment: {
      status: advanceAmount >= totalAmount ? "completed" : "pending_payment", 
      advance: advanceAmount,
      balance: totalAmount - advanceAmount,
      method: null 
    },
    orderInfo: {
      type: isBagOpening ? "Apertura Bolsita" : "Pedido Web/Redes",
      clientName: clientInfo.name || "Cliente General",
      clientPhone: clientInfo.phone || "",
      clientAddress: clientInfo.address || "",
      isBagOpening: isBagOpening,
      platform: clientInfo.platform || 'whatsapp'
    },
    status: 'PENDING',
    createdAt: serverTimestamp(),
    lastUpdate: serverTimestamp()
  };

  batch.set(orderRef, newOrder);
  cartItems.forEach(item => {
    if (item.id) {
      const productRef = doc(db, 'products', item.id);
      batch.update(productRef, { stock: increment(-item.quantity) });
    }
  });
  if (advanceAmount > 0 && shiftId) {
    const shiftRef = doc(db, 'shifts', shiftId);
    batch.update(shiftRef, getShiftUpdates(advanceAmount, 'OTHER', 'ADVANCE'));
  }
  await batch.commit();
  return { success: true, id: orderRef.id };
};

// 2. AGREGAR A BOLSITA (Live)
export const addToOpenBag = async (orderId, newItems, additionalAdvance = 0, shiftId = null) => {
  const batch = writeBatch(db);
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) throw new Error("Pedido no existe");
  const currentOrder = orderSnap.data();

  let updatedItems = currentOrder.items.map(item => ({...item}));
  newItems.forEach(newItem => {
    const existingIndex = updatedItems.findIndex(i => i.id === newItem.id);
    if (existingIndex >= 0) {
      updatedItems[existingIndex].quantity += Number(newItem.quantity);
    } else {
      updatedItems.push({
        id: newItem.id, name: newItem.name, price: Number(newItem.price) || 0,
        cost: Number(newItem.cost) || 0, quantity: Number(newItem.quantity) || 0, codes: newItem.codes || []
      });
    }
    if (newItem.id) {
      const productRef = doc(db, 'products', newItem.id);
      batch.update(productRef, { stock: increment(-newItem.quantity) });
    }
  });

  const newSubtotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const previousAdvance = Number(currentOrder.payment?.advance) || 0;
  const newAdvanceAmount = Number(additionalAdvance) || 0;
  const totalAdvance = previousAdvance + newAdvanceAmount;
  const newBalance = newSubtotal - totalAdvance;

  if (newAdvanceAmount > 0 && shiftId) {
    const shiftRef = doc(db, 'shifts', shiftId);
    batch.update(shiftRef, getShiftUpdates(newAdvanceAmount, 'OTHER', 'ADVANCE'));
  }

  batch.update(orderRef, {
    items: updatedItems,
    subtotal: newSubtotal,
    total: newSubtotal,
    'payment.advance': totalAdvance,
    'payment.balance': newBalance,
    lastUpdate: serverTimestamp()
  });
  await batch.commit();
  return { success: true };
};

/**
 * 3. QUITAR ITEM DE PEDIDO (Devuelve Stock)
 * Nueva Función
 */
export const removeItemFromOrder = async (orderId, itemIndex) => {
    const batch = writeBatch(db);
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) throw new Error("Pedido no existe");
    const currentOrder = orderSnap.data();
  
    // Copia de items
    let updatedItems = [...currentOrder.items];
    const itemToRemove = updatedItems[itemIndex];
  
    // 1. Devolver Stock
    if (itemToRemove.id) {
        const productRef = doc(db, 'products', itemToRemove.id);
        batch.update(productRef, { stock: increment(itemToRemove.quantity) });
    }
  
    // 2. Quitar del array
    updatedItems.splice(itemIndex, 1);
  
    // 3. Recalcular
    const newSubtotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const advance = Number(currentOrder.payment?.advance) || 0;
    const newBalance = newSubtotal - advance;
  
    batch.update(orderRef, {
        items: updatedItems,
        subtotal: newSubtotal,
        total: newSubtotal,
        'payment.balance': newBalance,
        lastUpdate: serverTimestamp()
    });
  
    await batch.commit();
    return { success: true };
};

/**
 * 4. PAGO PARCIAL (Abono)
 * Nueva Función
 */
export const addPartialPayment = async (orderId, amount, method, shiftId) => {
    const batch = writeBatch(db);
    const orderRef = doc(db, 'orders', orderId);
    const payAmount = Number(amount);

    if (shiftId) {
        const shiftRef = doc(db, 'shifts', shiftId);
        batch.update(shiftRef, getShiftUpdates(payAmount, method, 'PARTIAL'));
    }

    // Actualizar Pedido (Solo montos, no se cierra)
    batch.update(orderRef, {
        'payment.advance': increment(payAmount),
        'payment.balance': increment(-payAmount),
        lastUpdate: serverTimestamp()
    });

    await batch.commit();
    return { success: true };
};

// 5. CONFIRMAR (PAGO TOTAL)
export const confirmPendingOrder = async (orderId, orderData, paymentMethod, platform, shiftId, amountPaidNow) => {
  const batch = writeBatch(db);
  const salesRef = doc(collection(db, 'sales'));
  const orderRef = doc(db, 'orders', orderId); 
  
  // Usamos el monto que nos pasen (puede ser parcial o total, pero aquí cerramos la venta)
  // Si confirmPendingOrder se llama, asumimos que se cierra la venta.
  const finalAmount = Number(amountPaidNow);

  const newSale = {
    ...orderData,
    status: 'COMPLETED',
    shiftId: shiftId || null, 
    payment: {
      ...orderData.payment,
      method: paymentMethod,
      status: "completed",
      paidAt: serverTimestamp(),
      finalPaymentAmount: finalAmount // Lo que entró en el último paso
    },
    orderInfo: { ...orderData.orderInfo, platform: platform },
    originalOrderId: orderId
  };
  delete newSale.id; 

  batch.set(salesRef, newSale);

  if (shiftId && finalAmount > 0) {
    const shiftRef = doc(db, 'shifts', shiftId);
    batch.update(shiftRef, getShiftUpdates(finalAmount, paymentMethod, 'SALES'));
  }

  batch.delete(orderRef);
  await batch.commit();
  return { success: true, saleId: salesRef.id };
};

// 6. CANCELAR
export const cancelPendingOrder = async (orderId, items) => {
  const batch = writeBatch(db);
  const orderRef = doc(db, 'orders', orderId);
  items.forEach(item => {
    if (item.id) {
      const productRef = doc(db, 'products', item.id);
      batch.update(productRef, { stock: increment(item.quantity) });
    }
  });
  batch.delete(orderRef);
  await batch.commit();
  return { success: true };
};