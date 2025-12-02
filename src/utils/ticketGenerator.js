import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const generateReceipt = async (sale) => {
  
  // 1. RECUPERAR CONFIGURACIÓN DE LA EMPRESA
  let companySettings = {
    name: "MI NEGOCIO",
    ruc: "00000000000",
    address: "Sin Dirección",
    phone: "",
    logoUrl: "",
    showLogoOnTicket: true,
    paperSize: "80mm",
    footerLines: ["¡Gracias por su compra!"],
    socialFacebook: "",
    socialInstagram: "",
    socialWeb: ""
  };

  try {
    const docRef = doc(db, 'settings', 'company');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (!data.footerLines && data.message) {
        data.footerLines = [data.message];
      }
      companySettings = { ...companySettings, ...data };
    }
  } catch (e) {
    console.error("Error leyendo config empresa:", e);
  }

  // 2. DETERMINAR MONEDA
  let currencySymbol = sale.currency; 
  if (!currencySymbol) {
    try {
      const localConfig = localStorage.getItem('POS_GLOBAL_CONFIG');
      if (localConfig) currencySymbol = JSON.parse(localConfig).currency;
    } catch (e) {}
  }
  currencySymbol = currencySymbol || 'S/';

  const { name, ruc, address, phone, logoUrl, showLogoOnTicket, paperSize, footerLines, socialFacebook, socialInstagram, socialWeb } = companySettings;

  // 3. AJUSTES DE FORMATO
  const isSmallPaper = paperSize === '58mm';
  const bodyWidth = isSmallPaper ? '48mm' : '72mm';
  const fontSize = isSmallPaper ? '10px' : '12px';

  const dateObj = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date();
  const date = dateObj.toLocaleDateString('es-PE');
  const time = dateObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  const ticketId = sale.id ? sale.id.slice(-6).toUpperCase() : '---';

  // Determinar texto principal de pago
  let paymentText = "EFECTIVO";
  const paymentInfo = sale.payment || {};
  
  if (paymentInfo.multiPayments && paymentInfo.multiPayments.length > 1) {
      paymentText = "MIXTO";
  } else if (paymentInfo.method) {
      paymentText = paymentInfo.method.toUpperCase();
  }

  // Calcular Ahorro Total
  const totalSavings = (sale.itemDiscounts || 0) + (sale.globalDiscount || 0);

  // --- GENERACIÓN HTML ---
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ticket #${ticketId}</title>
        <style>
          @page { margin: 0; size: ${paperSize} auto; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${bodyWidth};
            margin: 0 auto;
            padding: 5px 0;
            font-size: ${fontSize};
            color: #000;
            line-height: 1.2;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .header { margin-bottom: 10px; text-align: center; }
          .logo { max-width: 60%; height: auto; margin-bottom: 5px; filter: grayscale(100%); } 
          .company-name { font-size: 1.2em; font-weight: bold; margin: 5px 0; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 0.95em; }
          td, th { padding: 2px 0; vertical-align: top; }
          .col-cant { width: 15%; text-align: center; }
          .col-desc { width: 60%; text-align: left; }
          .col-total { width: 25%; text-align: right; }
          .totals { margin-top: 5px; text-align: right; }
          .total-row { display: flex; justify-content: space-between; }
          .grand-total { font-size: 1.4em; font-weight: bold; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
          .savings { font-weight: bold; font-size: 0.9em; text-align: center; margin-top: 5px; border: 1px solid #000; padding: 2px; border-radius: 3px; }
          .payments { margin-top: 8px; font-size: 0.9em; border-top: 1px dashed #000; padding-top: 5px; }
          .footer { margin-top: 15px; text-align: center; font-size: 0.9em; }
          .socials { margin-top: 5px; font-size: 0.85em; }
        </style>
      </head>
      <body>
        <div class="header">
          ${(showLogoOnTicket && logoUrl) ? `<img src="${logoUrl}" class="logo" onerror="this.style.display='none'"/>` : ''}
          <div class="company-name">${name}</div>
          <div>RUC: ${ruc}</div>
          <div>${address}</div>
          ${phone ? `<div>Tel: ${phone}</div>` : ''}
        </div>

        <div class="divider"></div>
        <div>Ticket: #${ticketId}<br>Fecha: ${date} ${time}<br>Condición: ${paymentText}</div>
        <div class="divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th class="col-cant">CANT</th><th class="col-desc">DESCRIPCION</th><th class="col-total">IMP.</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map(item => `
              <tr>
                <td class="col-cant">${item.quantity}</td>
                <td class="col-desc">${item.name}</td>
                <td class="col-total">${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
              ${item.discount > 0 ? `
              <tr>
                <td></td>
                <td colspan="2" style="font-size:0.85em; font-style:italic;">
                   ↳ Desc: -${currencySymbol} ${item.discount.toFixed(2)}
                </td>
              </tr>` : ''}
            `).join('')}
          </tbody>
        </table>

        <div class="divider"></div>

        <div class="totals">
            ${totalSavings > 0 ? `
                <div class="total-row"><span>Subtotal:</span><span>${currencySymbol} ${sale.subtotal.toFixed(2)}</span></div>
                <div class="total-row"><span>Descuentos:</span><span>- ${currencySymbol} ${totalSavings.toFixed(2)}</span></div>
            ` : ''}
            
            <div class="total-row grand-total"><span>TOTAL:</span><span>${currencySymbol} ${sale.total.toFixed(2)}</span></div>
            
            ${totalSavings > 0 ? `
                <div class="savings">¡AHORRO TOTAL: ${currencySymbol} ${totalSavings.toFixed(2)}!</div>
            ` : ''}
        </div>

        <!-- SECCIÓN DE PAGOS DETALLADA -->
        <div class="payments">
            <div style="font-weight:bold; margin-bottom:3px;">MÉTODOS DE PAGO:</div>
            ${renderPaymentDetails(sale, currencySymbol)}
        </div>

        <div class="footer">
          ${(socialWeb || socialFacebook || socialInstagram) ? `
            <div class="divider"></div>
            <div class="socials">
              ${socialWeb ? `<div>🌐 ${socialWeb}</div>` : ''}
              ${socialFacebook ? `<div>FB: ${socialFacebook}</div>` : ''}
              ${socialInstagram ? `<div>IG: ${socialInstagram}</div>` : ''}
            </div>
          ` : ''}
          
          <div class="divider"></div>
          ${footerLines && footerLines.length > 0 
            ? footerLines.map(line => `<div>${line}</div>`).join('') 
            : '¡Gracias por su compra!'}
        </div>

        <script>
          window.onload = function() { 
            window.print(); 
            // setTimeout(function(){ window.close(); }, 500); 
          }
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', 'ImpresionTicket', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
};

// Helper mejorado para leer multiPayments
function renderPaymentDetails(sale, currency) {
    const payment = sale.payment || {};
    let html = '';

    // 1. Si hay lista de pagos múltiples (multiPayments)
    if (payment.multiPayments && Array.isArray(payment.multiPayments) && payment.multiPayments.length > 0) {
        html = payment.multiPayments.map(p => 
            `<div style="display:flex; justify-content:space-between;">
                <span>- ${(p.method || 'PAGO').toUpperCase()}:</span>
                <span>${currency} ${Number(p.amount).toFixed(2)}</span>
             </div>`
        ).join('');
    } 
    // 2. Si es un pago simple
    else if (payment.method) {
        const amount = payment.amountReceived || payment.totalPaid || sale.total;
        html = `<div style="display:flex; justify-content:space-between;">
                  <span>- ${(payment.method).toUpperCase()}:</span>
                  <span>${currency} ${Number(amount).toFixed(2)}</span>
                </div>`;
    }

    // 3. Mostrar Vuelto si existe y es Efectivo
    if (payment.change > 0) {
        html += `<div style="display:flex; justify-content:space-between; margin-top:2px; border-top:1px dotted #000;">
                    <span>VUELTO:</span>
                    <span>${currency} ${Number(payment.change).toFixed(2)}</span>
                 </div>`;
    }

    return html;
}