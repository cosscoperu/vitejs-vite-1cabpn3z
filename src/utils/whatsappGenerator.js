export const sendWhatsAppTicket = (sale, phone) => {
  if (!phone) return;

  const companyName = "COSSCO";
  const date = new Date().toLocaleDateString('es-PE');
  const time = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  const ticketId = sale.id ? sale.id.slice(-6).toUpperCase() : '---';

  // Construimos el mensaje con formato
  let message = `*BOLETA ELECTRÓNICA - ${companyName}*\n`;
  message += `📅 Fecha: ${date} ${time}\n`;
  message += `🎫 Ticket: #${ticketId}\n`;
  message += `------------------------------\n`;

  // --- DETALLE DE PRODUCTOS ---
  sale.items.forEach(item => {
    const itemTotal = item.price * item.quantity;
    message += `${item.quantity}x ${item.name}\n`;
    message += `   S/ ${itemTotal.toFixed(2)}\n`;

    // Si hay descuento por ítem, lo mostramos
    if (item.discount > 0) {
        message += `   _(Desc: -S/ ${item.discount.toFixed(2)})_\n`;
    }
  });

  message += `------------------------------\n`;

  // --- RESUMEN FINANCIERO ---
  // Si hubo algún descuento (Item o Global), mostramos el desglose
  if (sale.itemDiscounts > 0 || sale.globalDiscount > 0) {
      message += `Subtotal: S/ ${sale.subtotal.toFixed(2)}\n`;
      
      if (sale.itemDiscounts > 0) {
        message += `Desc. Items: -S/ ${sale.itemDiscounts.toFixed(2)}\n`;
      }
      
      if (sale.globalDiscount > 0) {
        message += `*Desc. Global: -S/ ${sale.globalDiscount.toFixed(2)}*\n`;
      }
      
      message += `------------------------------\n`;
  }

  // TOTAL FINAL
  message += `*TOTAL A PAGAR: S/ ${sale.total.toFixed(2)}*\n`;

  // Información de Pago
  if (sale.payment) {
      message += `\n*Pagado con:* `;
      if (sale.payment.payments) {
          // Pago Mixto
          const methods = sale.payment.payments.map(p => `${p.method.toUpperCase()} (S/${p.amount})`).join(', ');
          message += `${methods}\n`;
      } else {
          // Pago Único
          const method = sale.payment.method ? sale.payment.method.toUpperCase() : 'EFECTIVO';
          message += `${method}\n`;
      }
  }

  message += `\nGracias por su compra. 🤝`;

  // Codificamos para URL
  const encodedMessage = encodeURIComponent(message);
  
  // Abrir WhatsApp
  const url = `https://wa.me/51${phone}?text=${encodedMessage}`;
  
  window.open(url, '_blank');
};