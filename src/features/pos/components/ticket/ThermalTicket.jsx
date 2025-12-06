// src/features/pos/components/ticket/ThermalTicket.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';

function ThermalTicket({ saleData = {}, businessConfig = {}, onClose }) {
  const ticketRef = useRef(null);
  const [printed, setPrinted] = useState(false);

  // -------- DATOS DE VENTA (con defaults seguros) --------
  const {
    id = '',
    createdAt,
    items = [],
    subtotal = 0,
    itemDiscounts = 0,
    globalDiscount = 0,
    totalDiscounts, // por si algún día lo guardas ya sumado
    total = 0,
    payment = {},
    customerName,
    customerPhone,
    currency: saleCurrency,
  } = saleData || {};

  // -------- DATOS DE LA EMPRESA --------
  const {
    name = 'COSSCO POS',
    ruc = '',
    address = '',
    phone = '',
    web = '',
    facebook = '',
    instagram = '',
    posConfig = {},
  } = businessConfig || {};

  const currency = saleCurrency || posConfig.currency || 'S/';

  // -------- HELPERS --------
  const formatDateTime = (value) => {
    try {
      const d =
        value?.toDate?.() ||
        (value instanceof Date ? value : new Date());

      return d.toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const money = (v) => `${currency} ${Number(v || 0).toFixed(2)}`;

  // Descuento global derivado si no viene totalDiscounts
  const descItems = Number(itemDiscounts || 0);
  let descGlobal = Number(globalDiscount || 0);

  if (!descGlobal && totalDiscounts != null) {
    // Si alguna vez guardas el total directo
    descGlobal = Number(totalDiscounts) - descItems;
  }

  // Ahorro total = desc. por ítems + desc. global
  const ahorroTotal = descItems + (descGlobal || 0);

  // Pagos
  const multiPayments = Array.isArray(payment.multiPayments)
    ? payment.multiPayments
    : [];

  const isMixto = multiPayments.length > 0;

  const pagoSimple = !isMixto
    ? {
        method: payment.method || 'SIN MÉTODO',
        amount: payment.amountReceived ?? total,
      }
    : null;

  const vuelto = Number(payment.change || 0);

  // -------- IMPRESIÓN AUTOMÁTICA --------
  const handlePrint = useReactToPrint({
    content: () => ticketRef.current,
    documentTitle: `Ticket-${id || 'venta'}`,
    onAfterPrint: () => {
      if (typeof onClose === 'function') onClose();
    },
    removeAfterPrint: true,
  });

  // Disparar impresión al montar
  useEffect(() => {
    if (!printed) {
      setPrinted(true);
      setTimeout(() => {
        if (handlePrint) handlePrint();
      }, 300);
    }
  }, [printed, handlePrint]);

  // Cerrar con ESC
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && typeof onClose === 'function') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Cerrar al hacer click fuera
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        {/* CONTENIDO QUE SE IMPRIME */}
        <div ref={ticketRef} style={styles.ticket}>
          {/* CABECERA EMPRESA */}
          <div style={styles.center}>
            <div style={styles.storeName}>{name}</div>
            {ruc && <div style={styles.sub}>{`RUC: ${ruc}`}</div>}
            {address && <div style={styles.sub}>{address}</div>}
            {phone && <div style={styles.sub}>{`Tel: ${phone}`}</div>}
          </div>

          <div style={styles.sep} />

          {/* INFO BÁSICA */}
          <div style={styles.row}>
            <span>Ticket:</span>
            <span>{id || '-'}</span>
          </div>
          <div style={styles.row}>
            <span>Fecha:</span>
            <span>{formatDateTime(createdAt)}</span>
          </div>

          {customerName && (
            <div style={styles.row}>
              <span>Cliente:</span>
              <span>{customerName}</span>
            </div>
          )}
          {customerPhone && (
            <div style={styles.row}>
              <span>Tel.:</span>
              <span>{customerPhone}</span>
            </div>
          )}

          <div style={styles.sep} />

          {/* CABECERA ITEMS */}
          <div style={styles.itemsHeader}>
            <span style={{ flex: 3 }}>DESC</span>
            <span style={{ flex: 1, textAlign: 'center' }}>CANT</span>
            <span style={{ flex: 1, textAlign: 'right' }}>P.U.</span>
            <span style={{ flex: 1, textAlign: 'right' }}>IMP.</span>
          </div>

          {/* ITEMS */}
          {items.map((item, idx) => {
            const qty = item.quantity || item.qty || 1;
            const price = Number(item.price || 0);
            const baseTotal = price * qty;
            const descLinea = Number(item.discount || 0);
            const totalLinea = baseTotal - descLinea;

            return (
              <div key={idx}>
                <div style={styles.itemRow}>
                  <span style={{ flex: 3 }}>
                    {item.name || item.description || 'Producto'}
                  </span>
                  <span style={{ flex: 1, textAlign: 'center' }}>{qty}</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>
                    {money(price)}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right' }}>
                    {money(totalLinea)}
                  </span>
                </div>
                {descLinea > 0 && (
                  <div style={styles.discountLine}>
                    LÍNEA DESC.: - {money(descLinea)}
                  </div>
                )}
              </div>
            );
          })}

          <div style={styles.sep} />

          {/* TOTALES / DESCUENTOS */}
          <div style={styles.row}>
            <span>Subtotal:</span>
            <span>{money(subtotal)}</span>
          </div>

          {descItems > 0 && (
            <div style={styles.row}>
              <span>Desc. Ítems:</span>
              <span>- {money(descItems)}</span>
            </div>
          )}

          {descGlobal > 0 && (
            <div style={styles.row}>
              <span>Desc. Global:</span>
              <span>- {money(descGlobal)}</span>
            </div>
          )}

          <div style={{ ...styles.row, fontWeight: 'bold', marginTop: 4 }}>
            <span>TOTAL:</span>
            <span>{money(total)}</span>
          </div>

          {/* AHORRO TOTAL DESTACADO */}
          {ahorroTotal > 0 && (
            <div style={styles.ahorroBox}>
              <div style={styles.ahorroLabel}>AHORRO TOTAL:</div>
              <div style={styles.ahorroValue}>{money(ahorroTotal)}</div>
            </div>
          )}

          <div style={styles.sep} />

          {/* MÉTODOS DE PAGO */}
          <div style={styles.sectionTitle}>MÉTODOS DE PAGO:</div>

          {isMixto ? (
            <>
              {multiPayments.map((p, i) => (
                <div key={i} style={styles.row}>
                  <span>- {p.method}</span>
                  <span>{money(p.amount)}</span>
                </div>
              ))}
            </>
          ) : (
            <div style={styles.row}>
              <span>- {pagoSimple?.method}</span>
              <span>{money(pagoSimple?.amount || 0)}</span>
            </div>
          )}

          {vuelto !== 0 && (
            <div style={styles.row}>
              <span>Vuelto:</span>
              <span>{money(vuelto)}</span>
            </div>
          )}

          <div style={styles.sep} />

          {/* FOOTER / REDES */}
          <div style={styles.center}>
            {web && <div style={styles.sub}>{web}</div>}
            {facebook && <div style={styles.sub}>FB: {facebook}</div>}
            {instagram && <div style={styles.sub}>IG: {instagram}</div>}
          </div>

          <div style={styles.sep} />

          <div style={styles.footerBig}>¡GRACIAS POR SU COMPRA!</div>
          <div style={styles.footerSmall}>
            Todo cambio máximo 3 días | Guarde su comprobante
          </div>
        </div>

        {/* Texto que NO se imprime (solo guía) */}
        <div style={styles.helpText}>
          Se abrirá la ventana de impresión del navegador.  
          Cierra este mensaje con <b>ESC</b> o haciendo click fuera.
        </div>
      </div>
    </div>
  );
}

// -------- ESTILOS 80mm --------
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5000,
  },
  modal: {
    background: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  ticket: {
    width: 320, // aprox 80mm
    backgroundColor: '#ffffff',
    color: '#000000',
    padding: 10,
    border: '1px solid #000',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  center: { textAlign: 'center' },
  storeName: { fontWeight: 'bold', fontSize: 13 },
  sub: { fontSize: 10 },
  sep: {
    borderTop: '1px dashed #000',
    margin: '6px 0',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
  },
  itemsHeader: {
    display: 'flex',
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 11,
  },
  itemRow: {
    display: 'flex',
    fontSize: 11,
  },
  discountLine: {
    fontSize: 10,
    paddingLeft: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 11,
    marginBottom: 4,
  },
  ahorroBox: {
    marginTop: 6,
    marginBottom: 4,
    border: '1px solid #000',
    padding: 4,
    textAlign: 'center',
  },
  ahorroLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  ahorroValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  footerBig: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 4,
  },
  footerSmall: {
    textAlign: 'center',
    fontSize: 10,
  },
  helpText: {
    color: '#e5e7eb',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 320,
  },
};

export default ThermalTicket;
