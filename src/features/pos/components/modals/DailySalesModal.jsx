// src/features/pos/components/modals/DailySalesModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../../firebase/config';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { generateReceipt } from '../../../../utils/ticketGenerator';
import { getPosConfig } from '../../../../utils/posSettings';
import { voidSale } from '../../../../services/saleService';
import toast from 'react-hot-toast';

// --- ICONOS FUTURISTAS ---
const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const IconRefresh = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 21h5v-5" />
  </svg>
);
const IconPrinter = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
);
const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);
const IconLock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

function DailySalesModal({ show, onClose }) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString('en-CA')
  );
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState(null);

  // Estados de Seguridad
  const [saleToVoid, setSaleToVoid] = useState(null);
  const [securityPin, setSecurityPin] = useState('');

  const { currency } = getPosConfig();

  useEffect(() => {
    if (show) {
      fetchSalesByDate(selectedDate);
    }
  }, [show, selectedDate]);

  useEffect(() => {
    if (!saleToVoid) setSecurityPin('');
  }, [saleToVoid]);

  const fetchSalesByDate = async (dateString) => {
    setLoading(true);
    setSales([]);
    try {
      const start = new Date(`${dateString}T00:00:00`);
      const end = new Date(`${dateString}T23:59:59`);

      const q = query(
        collection(db, 'sales'),
        where('createdAt', '>=', Timestamp.fromDate(start)),
        where('createdAt', '<=', Timestamp.fromDate(end)),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const salesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSales(salesData);
    } catch (error) {
      console.error('Error cargando ventas:', error);
      toast.error('Error de conexión.');
    }
    setLoading(false);
  };

  const requestVoid = (saleId) => {
    setSaleToVoid(saleId);
  };

  const confirmVoid = async (e) => {
    e.preventDefault();
    if (!saleToVoid) return;

    const ADMIN_PIN = '1234'; // 🔴 Configurable: PIN supervisor

    if (securityPin !== ADMIN_PIN) {
      toast.error('⛔ PIN Incorrecto');
      setSecurityPin('');
      return;
    }

    const toastId = toast.loading('Procesando anulación...');
    try {
      await voidSale(saleToVoid, 'Anulación autorizada por PIN');
      toast.success('Venta anulada y stock retornado', { id: toastId });
      setSaleToVoid(null);
      fetchSalesByDate(selectedDate);
    } catch (error) {
      console.error(error);
      toast.error('Error: ' + error.message, { id: toastId });
    }
  };

  const totals = useMemo(() => {
    const t = { total: 0, cash: 0, digital: 0, card: 0, bank: 0, count: 0 };

    sales.forEach((sale) => {
      if (sale.status === 'cancelled' || sale.status === 'returned') return;

      t.total += sale.total || 0;
      t.count++;

      const classifyAmount = (type, method, amount) => {
        const m = String(method || '').toUpperCase();
        const tp = String(type || '').toUpperCase();
        const amt = Number(amount) || 0;

        if (tp === 'CASH' || m.includes('EFECTIVO') || m === 'CASH') t.cash += amt;
        else if (tp === 'DIGITAL' || m.includes('YAPE') || m.includes('PLIN')) t.digital += amt;
        else if (tp === 'CARD' || m.includes('TARJETA') || m.includes('IZIPAY')) t.card += amt;
        else if (tp === 'BANK' || m.includes('BANCO') || m.includes('TRANSF')) t.bank += amt;
        else t.cash += amt;
      };

      if (sale.payment?.multiPayments && Array.isArray(sale.payment.multiPayments)) {
        sale.payment.multiPayments.forEach((p) =>
          classifyAmount(p.type, p.method, p.amount)
        );
      } else if (sale.payment) {
        const amount = sale.payment.amountReceived || sale.total;
        classifyAmount(sale.payment.type, sale.payment.method, amount);
      }
    });
    return t;
  }, [sales]);

  const formatTime = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return '-';
    return timestamp
      .toDate()
      .toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  };

  const getPaymentLabel = (sale) => {
    if (sale.payment?.multiPayments?.length > 1)
      return { text: 'MIXTO', color: '#f59e0b', bg: '#fffbeb' };
    const method = sale.payment?.method || 'EFECTIVO';
    if (['YAPE', 'PLIN', 'TRANSFERENCIA'].includes(method))
      return { text: method, color: '#d946ef', bg: '#fdf4ff' };
    if (method === 'TARJETA')
      return { text: method, color: '#3b82f6', bg: '#eff6ff' };
    return { text: method, color: '#10b981', bg: '#f0fdf4' };
  };

  if (!show) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Operaciones del Día</h2>
            <p style={styles.subtitle}>Gestión de tickets y anulaciones</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <IconX />
          </button>
        </div>

        {/* CONTROLES */}
        <div style={styles.controlsBar}>
          <div style={styles.dateWrapper}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#64748b',
              }}
            >
              FECHA:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.dateInput}
            />
          </div>
          <button
            onClick={() => fetchSalesByDate(selectedDate)}
            style={styles.refreshBtn}
          >
            <IconRefresh /> Actualizar
          </button>
        </div>

        {/* KPIs */}
        <div style={styles.kpiContainer}>
          <div style={{ ...styles.kpiCard, background: '#0f172a', color: 'white' }}>
            <div style={styles.kpiLabel}>VENTA TOTAL</div>
            <div style={styles.kpiValue}>
              {currency} {totals.total.toFixed(2)}
            </div>
            <div style={styles.kpiSub}>{totals.count} Tickets</div>
          </div>
          <div
            style={{
              ...styles.kpiCard,
              background: 'white',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ ...styles.kpiLabel, color: '#10b981' }}>EFECTIVO</div>
            <div style={{ ...styles.kpiValue, color: '#0f172a' }}>
              {currency} {totals.cash.toFixed(2)}
            </div>
          </div>
          <div
            style={{
              ...styles.kpiCard,
              background: 'white',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ ...styles.kpiLabel, color: '#d946ef' }}>DIGITAL (Y/P)</div>
            <div style={{ ...styles.kpiValue, color: '#0f172a' }}>
              {currency} {totals.digital.toFixed(2)}
            </div>
          </div>
          <div
            style={{
              ...styles.kpiCard,
              background: 'white',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ ...styles.kpiLabel, color: '#3b82f6' }}>TARJETAS</div>
            <div style={{ ...styles.kpiValue, color: '#0f172a' }}>
              {currency} {totals.card.toFixed(2)}
            </div>
          </div>
        </div>

        {/* LISTA */}
        <div style={styles.listContainer}>
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: '#64748b',
              }}
            >
              Cargando operaciones...
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Hora</th>
                  <th style={styles.th}>Método</th>
                  <th style={styles.th}>Total</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#94a3b8',
                      }}
                    >
                      Sin movimientos en esta fecha.
                    </td>
                  </tr>
                )}

                {sales.map((sale) => {
                  const isCancelled =
                    sale.status === 'cancelled' || sale.status === 'returned';
                  const badge = getPaymentLabel(sale);
                  const isExpanded = expandedSaleId === sale.id;

                  return (
                    <React.Fragment key={sale.id}>
                      <tr
                        style={
                          isCancelled
                            ? styles.trCancelled
                            : isExpanded
                            ? styles.trActive
                            : styles.tr
                        }
                      >
                        <td style={styles.td}>
                          <span
                            style={{
                              fontWeight: '600',
                              color: isCancelled ? '#ef4444' : '#334155',
                            }}
                          >
                            {formatTime(sale.createdAt)}
                          </span>
                          {isCancelled && (
                            <span style={styles.tagCancelled}>ANULADO</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.badge,
                              background: isCancelled ? '#fee2e2' : badge.bg,
                              color: isCancelled ? '#991b1b' : badge.color,
                            }}
                          >
                            {String(badge.text).toUpperCase()}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              fontWeight: '700',
                              color: isCancelled ? '#94a3b8' : '#0f172a',
                              textDecoration: isCancelled
                                ? 'line-through'
                                : 'none',
                            }}
                          >
                            {currency} {Number(sale.total).toFixed(2)}
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              gap: '8px',
                            }}
                          >
                            <button
                              onClick={() => generateReceipt(sale)}
                              style={styles.btnAction}
                              title="Reimprimir"
                            >
                              <IconPrinter />
                            </button>
                            {!isCancelled && (
                              <button
                                onClick={() => requestVoid(sale.id)}
                                style={styles.btnDanger}
                                title="Anular Venta"
                              >
                                <IconTrash />
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setExpandedSaleId(
                                  isExpanded ? null : sale.id
                                )
                              }
                              style={styles.btnDetail}
                            >
                              {isExpanded ? '▲' : '▼'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* DETALLE */}
                      {isExpanded && (
                        <tr style={{ background: '#f8fafc' }}>
                          <td colSpan="4" style={{ padding: '0' }}>
                            <div style={styles.expandedContent}>
                              <div
                                style={{
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  color: '#64748b',
                                  marginBottom: '8px',
                                  textTransform: 'uppercase',
                                }}
                              >
                                Detalle del Ticket:
                              </div>
                              <ul
                                style={{
                                  listStyle: 'none',
                                  padding: 0,
                                  margin: 0,
                                }}
                              >
                                {sale.items &&
                                  sale.items.map((item, i) => (
                                    <li
                                      key={i}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '13px',
                                        padding: '4px 0',
                                        borderBottom:
                                          '1px dashed #e2e8f0',
                                      }}
                                    >
                                      <span>
                                        {item.quantity} x{' '}
                                        <strong>{item.name}</strong>
                                      </span>
                                      <span>
                                        {currency}{' '}
                                        {(
                                          item.price * item.quantity
                                        ).toFixed(2)}
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                              {sale.payment?.payments && (
                                <div
                                  style={{
                                    marginTop: '10px',
                                    fontSize: '12px',
                                    color: '#64748b',
                                  }}
                                >
                                  {sale.payment.payments.map((p, k) => (
                                    <span key={k} style={{ marginRight: '10px' }}>
                                      {p.method}: <b>{currency} {p.amount}</b>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* MODAL PIN */}
        {saleToVoid && (
          <div style={styles.confirmOverlay}>
            <form onSubmit={confirmVoid} style={styles.confirmBox}>
              <div style={{ marginBottom: '15px' }}>
                <IconLock />
              </div>
              <h3 style={styles.confirmTitle}>Autorización Requerida</h3>
              <p
                style={{
                  fontSize: '13px',
                  color: '#64748b',
                  marginBottom: '20px',
                }}
              >
                Esta acción anulará la venta y{' '}
                <b>devolverá el stock</b> al inventario.
              </p>
              <input
                type="password"
                autoFocus
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value)}
                style={styles.pinInput}
                placeholder="PIN SUPERVISOR"
                maxLength={6}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setSaleToVoid(null)}
                  style={styles.btnCancel}
                >
                  Cancelar
                </button>
                <button type="submit" style={styles.btnConfirm}>
                  Confirmar Anulación
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// --- ESTILOS CLEAN TECH ---
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(15, 23, 42, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    position: 'relative',
    background: '#f8fafc',
    width: '800px',
    maxHeight: '90vh',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    margin: 0,
    color: '#0f172a',
    fontSize: '20px',
    fontWeight: '800',
    letterSpacing: '-0.5px',
  },
  subtitle: { margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    padding: '8px',
    borderRadius: '8px',
    transition: 'background 0.2s',
  },

  controlsBar: {
    padding: '20px 32px',
    display: 'flex',
    gap: '15px',
    alignItems: 'flex-end',
  },
  dateWrapper: { display: 'flex', flexDirection: 'column', gap: '5px' },
  dateInput: {
    padding: '10px 15px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    color: '#334155',
    fontWeight: '600',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '10px',
    background: '#0f172a',
    color: 'white',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    height: '42px',
    fontSize: '13px',
  },

  kpiContainer: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
    gap: '15px',
    padding: '0 32px 20px 32px',
  },
  kpiCard: {
    padding: '15px',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  },
  kpiLabel: {
    fontSize: '11px',
    fontWeight: '800',
    opacity: 0.8,
    marginBottom: '5px',
    letterSpacing: '0.5px',
  },
  kpiValue: { fontSize: '20px', fontWeight: '800' },
  kpiSub: { fontSize: '11px', opacity: 0.7 },

  listContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 32px 32px 32px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  },
  th: {
    textAlign: 'left',
    padding: '16px 20px',
    background: '#f1f5f9',
    fontSize: '11px',
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.2s',
  },
  trActive: { background: '#f8fafc' },
  trCancelled: { background: '#fff1f2' },
  td: { padding: '12px 20px', fontSize: '13px', verticalAlign: 'middle' },

  badge: {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: '800',
    letterSpacing: '0.5px',
  },
  tagCancelled: {
    marginLeft: '8px',
    fontSize: '9px',
    background: '#dc2626',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold',
  },

  btnAction: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#334155',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDanger: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#dc2626',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDetail: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '10px',
  },

  expandedContent: {
    padding: '20px 30px',
    borderTop: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0',
  },

  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  confirmBox: {
    background: 'white',
    padding: '40px',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    maxWidth: '350px',
  },
  confirmTitle: {
    margin: '0 0 10px 0',
    fontSize: '18px',
    fontWeight: '800',
    color: '#0f172a',
  },
  pinInput: {
    width: '100%',
    padding: '15px',
    fontSize: '24px',
    textAlign: 'center',
    letterSpacing: '8px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    outline: 'none',
    fontWeight: '800',
    color: '#0f172a',
  },
  btnCancel: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#64748b',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnConfirm: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: 'none',
    background: '#dc2626',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)',
  },
};

export default DailySalesModal;
