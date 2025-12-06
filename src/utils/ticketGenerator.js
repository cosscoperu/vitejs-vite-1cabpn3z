// src/utils/ticketGenerator.js
// Generador de ticket térmico para impresora de 80mm

const TICKET_WIDTH = 40; // columnas aproximadas para texto monoespaciado

const padLeft = (text, width) => String(text).padStart(width, ' ');
const padRight = (text, width) => String(text).padEnd(width, ' ');
const center = (text) => {
  const len = String(text).length;
  if (len >= TICKET_WIDTH) return text;
  const spaces = Math.floor((TICKET_WIDTH - len) / 2);
  return ' '.repeat(spaces) + text;
};
const line = (char = '-') => char.repeat(TICKET_WIDTH);
const money = (n = 0) =>
  (Number.isFinite(Number(n)) ? Number(n) : 0).toFixed(2);

/**
 * sale:
 *  - id
 *  - items: [{ name, quantity, price, discount }]
 *  - subtotal
 *  - itemDiscounts
 *  - globalDiscount
 *  - totalDiscounts
 *  - total
 *  - payment: {
 *       method,
 *       multiPayments?: [{ method, amount }],
 *       amountReceived?, amountPaid?
 *    }
 *  - createdAt (Date o Timestamp de Firestore)
 *
 * storeConfig:
 *  - name, ruc, address, phone, website, facebook, instagram
 */
export function generateReceipt(sale = {}, storeConfig = {}) {
  const {
    id,
    items = [],
    subtotal = 0,
    itemDiscounts = 0,
    globalDiscount = 0,
    totalDiscounts,
    total = 0,
    payment = {},
    createdAt,
    currency = 'S/',
  } = sale;

  const businessName = storeConfig.name || 'COSSCO POS';
  const ruc = storeConfig.ruc || '--------';
  const address = storeConfig.address || '';
  const phone = storeConfig.phone || '';
  const website = storeConfig.website || 'www.cossco.com';
  const facebook = storeConfig.facebook || 'COSSCO';
  const instagram = storeConfig.instagram || 'cossco_';

  // Fecha
  let dateObj;
  if (createdAt && createdAt.seconds) {
    dateObj = new Date(createdAt.seconds * 1000);
  } else if (createdAt instanceof Date) {
    dateObj = createdAt;
  } else {
    dateObj = new Date();
  }
  const fecha = dateObj.toLocaleDateString();
  const hora = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Descuentos
  const globalDisc = Number(globalDiscount) || 0;
  const itemDisc = Number(itemDiscounts) || 0;
  const totalDisc =
    totalDiscounts != null ? Number(totalDiscounts) : itemDisc + globalDisc;

  // Pagos
  let pagos = [];
  if (Array.isArray(payment.multiPayments) && payment.multiPayments.length > 0) {
    pagos = payment.multiPayments.map((p) => ({
      method: p.method || 'MÉTODO',
      amount: p.amount ?? 0,
    }));
  } else if (payment.method) {
    const amount =
      payment.amountReceived ?? payment.amountPaid ?? total;
    pagos = [{ method: payment.method, amount }];
  } else {
    pagos = [{ method: 'EFECTIVO', amount: total }];
  }

  let condicion = 'CONTADO';
  if (payment.method === 'CREDITO') {
    condicion = 'CRÉDITO';
  } else if (pagos.length > 1) {
    condicion = 'MIXTO';
  }

  const lines = [];

  // Encabezado negocio
  lines.push(center(businessName));
  lines.push('');
  lines.push(center(`RUC: ${ruc}`));
  if (address) lines.push(center(address));
  if (phone) lines.push(center(`Tel: ${phone}`));
  lines.push(line());
  lines.push(`Ticket: #${id || '--------'}`);
  lines.push(`Fecha: ${fecha} ${hora}`);
  lines.push(`Condición: ${condicion}`);
  lines.push(line());

  // Encabezado de items
  lines.push('CANT DESCRIPTION               IMP.');
  lines.push(line());

  // Items
  items.forEach((item) => {
    const qty = item.quantity || 0;
    const name = (item.name || '').toString();
    const price = Number(item.price) || 0;
    const discount = Number(item.discount) || 0;

    const importe = price * qty;

    // Línea principal: "1  Nombre                 100.00"
    const left = padRight(`${qty} ${name}`.slice(0, 28), 28);
    const right = padLeft(money(importe), 10);
    lines.push(left + right);

    // Descuento de línea
    if (discount > 0) {
      const descText = `↓ Desc.: - ${currency} ${money(discount)}`;
      lines.push('  ' + descText);
    }
  });

  lines.push(line());

  // Totales
  lines.push(
    padRight('Subtotal:', 20) +
      padLeft(`${currency} ${money(subtotal)}`, 20)
  );

  // Descuento por ítems
  lines.push(
    padRight('Desc. Ítems:', 20) +
      padLeft(`- ${currency} ${money(itemDisc)}`, 20)
  );

  // Descuento global (NUEVO)
  lines.push(
    padRight('Desc. Global:', 20) +
      padLeft(`- ${currency} ${money(globalDisc)}`, 20)
  );

  lines.push(
    padRight('TOTAL:', 20) +
      padLeft(`${currency} ${money(total)}`, 20)
  );

  // Bloque de Ahorro Total
  lines.push('');
  lines.push(line());
  lines.push(center('AHORRO TOTAL:'));
  lines.push(center(`${currency} ${money(totalDisc)}`));
  lines.push(line());
  lines.push('');

  // Métodos de pago
  lines.push('MÉTODOS DE PAGO:');
  pagos.forEach((p) => {
    const methodName = `- ${p.method}`.toUpperCase();
    const left = padRight(methodName.slice(0, 22), 22);
    const right = padLeft(`${currency} ${money(p.amount)}`, 18);
    lines.push(left + right);
  });

  lines.push('');
  lines.push(line());
  lines.push(center(website));
  lines.push(center(`FB: ${facebook}`));
  lines.push(center(`IG: ${instagram}`));
  lines.push(line());
  lines.push('');
  lines.push(center('¡Gracias por su compra!'));
  lines.push(center('todo cambio máximo 3 días'));
  lines.push('');

  const ticketText = lines.join('\n');

  // Ventana de impresión
  const printWindow = window.open('', '_blank', 'width=400,height=700');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Ticket #${id || ''}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: "Courier New", monospace;
            font-size: 12px;
            padding: 10px;
          }
          pre { white-space: pre; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <pre>${ticketText}</pre>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();

  // Opcional: cerrar luego de imprimir
  setTimeout(() => {
    try {
      printWindow.close();
    } catch (e) {
      // ignorar
    }
  }, 1000);
}
