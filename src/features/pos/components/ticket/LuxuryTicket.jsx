// src/features/pos/components/ticket/LuxuryTicket.jsx
import React, { useRef, useEffect, useState } from "react";
import { useReactToPrint } from "react-to-print";
import toast from "react-hot-toast";

const LuxuryTicket = ({ saleData = {}, businessConfig = {}, onClose }) => {
  const ticketRef = useRef(null);
  const [printed, setPrinted] = useState(false);

  // --- DES-STRUCTURAMOS DATOS ---
  const {
    id,
    createdAt,
    items = [],
    subtotal = 0,
    discountGlobal = 0,
    total = 0,
    payment = {},
    customer = {},
  } = saleData;

  const {
    name = "COSSCO POS",
    address = "",
    phone = "",
    ruc = "",
    logoUrl = "",
    posConfig = {},
  } = businessConfig;

  const currency = posConfig.currency || "S/";

  // --- FECHA ---
  const formatDate = (d) => {
    try {
      const date =
        d?.toDate?.() ||
        (d instanceof Date ? d : new Date());

      return date.toLocaleString("es-PE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // --- FORMATOS ---
  const money = (v) => `${currency} ${Number(v || 0).toFixed(2)}`;

  // --- DESCUENTOS POR PRODUCTO ---
  const totalDescProductos = items.reduce((acc, item) => {
    const d = Number(item.discount || 0);
    return acc + d;
  }, 0);

  const ahorroTotal = totalDescProductos + Number(discountGlobal || 0);

  // --- SEPARAR PAGOS MIXTOS ---
  const multi = Array.isArray(payment.multiPayments)
    ? payment.multiPayments
    : [];

  const pagoUnico = !multi.length
    ? {
        method: payment.method,
        amount: payment.amountReceived,
      }
    : null;

  // --- react-to-print ---
  const handlePrint = useReactToPrint({
    content: () => ticketRef.current,
    documentTitle: `Ticket-${id}`,
    onAfterPrint: () => {
      toast.success("Impresión completada");
      if (onClose) onClose();
    },
    removeAfterPrint: true,
  });

  // --- IMPRESIÓN AUTOMÁTICA ---
  useEffect(() => {
    if (!printed) {
      setPrinted(true);
      setTimeout(() => handlePrint(), 300);
    }
  }, [printed]);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Ticket imprimible */}
        <div ref={ticketRef} style={styles.ticket}>

          {/* ENCABEZADO */}
          <div style={styles.header}>
            {logoUrl ? (
              <img src={logoUrl} style={styles.logo} alt="logo" />
            ) : null}
            <div style={styles.center}>
              <div style={styles.storeName}>{name}</div>
              {ruc && <div style={styles.sub}>{`RUC: ${ruc}`}</div>}
              {address && <div style={styles.sub}>{address}</div>}
              {phone && <div style={styles.sub}>{`Tel: ${phone}`}</div>}
            </div>
          </div>

          <div style={styles.sep} />

          {/* INFO */}
          <div style={styles.row}><b>Ticket:</b><span>{id}</span></div>
          <div style={styles.row}><b>Fecha:</b><span>{formatDate(createdAt)}</span></div>

          {customer?.name ? (
            <div style={styles.row}><b>Cliente:</b><span>{customer.name}</span></div>
          ) : null}

          {customer?.document ? (
            <div style={styles.row}><b>Documento:</b><span>{customer.document}</span></div>
          ) : null}

          <div style={styles.sep} />

          {/* ITEMS */}
          <div style={styles.itemHeader}>
            <span style={{ flex: 3 }}>DESC</span>
            <span style={{ flex: 1, textAlign: "center" }}>CANT</span>
            <span style={{ flex: 1, textAlign: "right" }}>P.U.</span>
            <span style={{ flex: 1, textAlign: "right" }}>IMP</span>
          </div>

          {items.map((p, idx) => {
            const qty = p.qty || p.quantity || 1;
            const price = p.price || p.unitPrice;
            const totalItem = qty * price;

            return (
              <div key={idx}>
                <div style={styles.item}>
                  <span style={{ flex: 3 }}>{p.name}</span>
                  <span style={{ flex: 1, textAlign: "center" }}>{qty}</span>
                  <span style={{ flex: 1, textAlign: "right" }}>{money(price)}</span>
                  <span style={{ flex: 1, textAlign: "right" }}>{money(totalItem)}</span>
                </div>

                {/* DESCUENTO POR PRODUCTO */}
                {p.discount > 0 ? (
                  <div style={styles.discountLine}>
                    Descuento: - {money(p.discount)}
                  </div>
                ) : null}
              </div>
            );
          })}

          <div style={styles.sep} />

          {/* TOTALES */}
          <div style={styles.row}><span>SUBTOTAL:</span><b>{money(subtotal)}</b></div>

          {discountGlobal > 0 ? (
            <div style={styles.row}>
              <span>DESCUENTO GLOBAL:</span>
              <span style={{ color: "black" }}>- {money(discountGlobal)}</span>
            </div>
          ) : null}

          <div style={styles.row}>
            <span style={{ fontWeight: "bold" }}>TOTAL A PAGAR:</span>
            <span style={{ fontWeight: "bold" }}>{money(total)}</span>
          </div>

          {/* AHORRO TOTAL */}
          {ahorroTotal > 0 ? (
            <div style={styles.row}>
              <span>AHORRO TOTAL:</span>
              <span style={{ fontWeight: "bold" }}>{money(ahorroTotal)}</span>
            </div>
          ) : null}

          <div style={styles.sep} />

          {/* MÉTODOS DE PAGO */}
          <div style={styles.sectionTitle}>PAGOS:</div>

          {pagoUnico ? (
            <>
              <div style={styles.row}>
                <span>{pagoUnico.method}</span>
                <span>{money(pagoUnico.amount)}</span>
              </div>
              {payment.change != null && (
                <div style={styles.row}>
                  <span>VUELTO:</span>
                  <span>{money(payment.change)}</span>
                </div>
              )}
            </>
          ) : (
            <>
              {multi.map((m, i) => (
                <div key={i} style={styles.row}>
                  <span>{m.method}</span>
                  <span>{money(m.amount)}</span>
                </div>
              ))}
              {payment.change != null && (
                <div style={styles.row}>
                  <span>VUELTO:</span>
                  <span>{money(payment.change)}</span>
                </div>
              )}
            </>
          )}

          <div style={styles.sep} />
          <div style={styles.footer}>¡GRACIAS POR SU COMPRA!</div>
          <div style={styles.footerSmall}>Guarde su comprobante para consultas.</div>
        </div>
      </div>
    </div>
  );
};

// 🎨 ESTILOS 80mm SIN COLORES
const styles = {
  overlay: {
    position: "fixed", inset: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 5000,
  },
  modal: {
    background: "transparent",
    boxShadow: "none",
  },
  ticket: {
    width: "320px",
    background: "white",
    color: "black",
    fontSize: "11px",
    padding: "10px",
    border: "1px solid #000",
    fontFamily: "monospace",
  },
  header: {
    display: "flex",
    alignItems: "center",
    marginBottom: "6px",
  },
  logo: {
    width: "45px",
    height: "45px",
    objectFit: "contain",
  },
  center: { textAlign: "center", flex: 1 },
  storeName: { fontSize: "13px", fontWeight: "bold" },
  sub: { fontSize: "10px" },
  sep: { borderTop: "1px dashed black", margin: "6px 0" },
  row: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
  },
  itemHeader: {
    display: "flex",
    fontWeight: "bold",
    marginBottom: "4px",
  },
  item: { display: "flex", fontSize: "11px" },
  discountLine: {
    fontSize: "10px",
    color: "black",
    marginBottom: "3px",
    paddingLeft: "4px",
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: "4px",
  },
  footer: {
    textAlign: "center",
    fontWeight: "bold",
  },
  footerSmall: {
    textAlign: "center",
    fontSize: "10px",
  },
};

export default LuxuryTicket;
