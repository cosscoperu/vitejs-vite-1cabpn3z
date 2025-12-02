import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore'; // Quitamos 'orderBy' de aquí para evitar errores de índice

// --- ICONOS SVG ---
const IconHistory = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>;
const IconClose = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconArrowUp = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
const IconArrowDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
const IconEmpty = () => <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>;

function HistoryModal({ show, onClose, product }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && product) {
      fetchHistory();
    }
  }, [show, product]);

  const fetchHistory = async () => {
    setLoading(true);
    setHistory([]);
    try {
      // ESTRATEGIA ROBUSTA:
      // 1. Solo filtramos por producto (No requiere índice compuesto).
      const q = query(
        collection(db, 'movements'),
        where('productId', '==', product.id)
      );

      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 2. Ordenamos en el cliente (JavaScript) para evitar errores de Firebase
      data.sort((a, b) => {
        // Convertimos timestamp de firestore a milisegundos para comparar
        const timeA = a.timestamp?.toMillis?.() || 0;
        const timeB = b.timestamp?.toMillis?.() || 0;
        return timeB - timeA; // Descendente (Más nuevo primero)
      });

      setHistory(data);
    } catch (error) {
      console.error("Error cargando historial:", error);
    }
    setLoading(false);
  };

  if (!show || !product) return null;

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    // Soporte para Timestamp de Firebase o Date normal
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('es-PE', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        
        {/* HEADER */}
        <div style={styles.header}>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <div style={styles.iconWrapper}><IconHistory /></div>
            <div>
              <h3 style={styles.title}>Kardex de Movimientos</h3>
              <p style={styles.subtitle}>{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} title="Cerrar"><IconClose /></button>
        </div>
        
        {/* BODY */}
        <div style={styles.body}>
          {loading ? (
            <div style={styles.centerMessage}>
              <div style={styles.spinner}></div>
              <p style={{marginTop:'15px', color:'#64748b'}}>Cargando trazabilidad...</p>
            </div>
          ) : (
            <>
              {history.length === 0 ? (
                <div style={styles.centerMessage}>
                  <IconEmpty />
                  <h4 style={{margin:'10px 0 5px 0', color:'#475569'}}>Sin Movimientos</h4>
                  <p style={{margin:0, fontSize:'13px', color:'#94a3b8'}}>Este producto aún no tiene historial registrado.</p>
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.theadRow}>
                      <th style={styles.th}>FECHA / HORA</th>
                      <th style={styles.th}>TIPO</th>
                      <th style={{...styles.th, textAlign:'right'}}>CANTIDAD</th>
                      <th style={{...styles.th, textAlign:'right'}}>STOCK FINAL</th>
                      <th style={styles.th}>DETALLE / MOTIVO</th>
                      <th style={styles.th}>USUARIO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry, index) => {
                       // Lógica de Color Semántica
                       const isEntry = ['ENTRADA', 'INGRESO', 'AJUSTE_POSITIVO', 'DEVOLUCION', 'COMPRA'].includes(entry.type);
                       const isExit = ['SALIDA', 'VENTA', 'AJUSTE_NEGATIVO', 'MERMA'].includes(entry.type);
                       
                       let rowBg = 'transparent';
                       let icon = null;
                       let quantityColor = '#334155';

                       if (isEntry) {
                         icon = <IconArrowUp />;
                         quantityColor = '#16a34a'; // Verde
                       } else if (isExit) {
                         icon = <IconArrowDown />;
                         quantityColor = '#dc2626'; // Rojo
                       }

                       return (
                        <tr key={index} style={{...styles.tr, background: rowBg}}>
                          <td style={styles.tdDate}>{formatDate(entry.timestamp)}</td>
                          
                          <td style={styles.td}>
                            <span style={isEntry ? styles.badgeGreen : (isExit ? styles.badgeRed : styles.badgeGray)}>
                              {entry.type}
                            </span>
                          </td>
                          
                          <td style={{...styles.td, textAlign:'right', fontWeight:'bold', color: quantityColor}}>
                              <div style={{display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'5px'}}>
                                {icon} <span>{Math.abs(entry.quantity)}</span>
                              </div>
                          </td>
                          
                          <td style={{...styles.td, textAlign:'right', fontWeight:'800', color:'#1e293b'}}>
                            {entry.newStock}
                          </td>
                          
                          <td style={{...styles.td, color:'#475569', fontStyle: entry.reason ? 'normal' : 'italic'}}>
                            {entry.reason || 'Sin detalle'}
                          </td>
                          
                          <td style={styles.tdUser}>
                            <span style={styles.userBadge}>{entry.user || 'Admin'}</span>
                          </td>
                        </tr>
                       );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

        {/* FOOTER SIMPLE */}
        <div style={styles.footer}>
           <div style={styles.legend}>
             <span style={styles.legendItem}><span style={styles.dotGreen}></span> Entradas</span>
             <span style={styles.legendItem}><span style={styles.dotRed}></span> Salidas</span>
           </div>
           <button onClick={onClose} style={styles.btnClose}>Cerrar</button>
        </div>

      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(2px)' },
  modal: { background: 'white', borderRadius: '16px', width: '850px', maxHeight: '85vh', display:'flex', flexDirection:'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden' },
  
  header: { padding: '20px 25px', borderBottom:'1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' },
  iconWrapper: { background: '#e0e7ff', padding: '8px', borderRadius: '10px', display: 'flex' },
  title: { margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' },
  subtitle: { margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' },
  closeBtn: { background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s', display:'flex' },

  body: { overflowY: 'auto', flex: 1, padding: '0' },
  centerMessage: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#64748b' },
  
  // Tabla Moderna
  table: { width: '100%', borderCollapse: 'collapse', fontSize:'13px' },
  theadRow: { background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' },
  th: { textAlign: 'left', padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', position:'sticky', top:0, background:'#f1f5f9' },
  tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' },
  td: { padding: '12px 20px', verticalAlign: 'middle' },
  tdDate: { padding: '12px 20px', color: '#334155', fontWeight: '500', whiteSpace: 'nowrap' },
  tdUser: { padding: '12px 20px' },

  // Badges
  badgeGreen: { background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' },
  badgeRed: { background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' },
  badgeGray: { background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' },
  
  userBadge: { background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' },

  // Footer
  footer: { padding: '15px 25px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  legend: { display: 'flex', gap: '15px' },
  legendItem: { display: 'flex', alignItems: 'center', fontSize: '12px', color: '#64748b', gap: '5px' },
  dotGreen: { width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' },
  dotRed: { width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' },
  
  btnClose: { padding: '10px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#334155', fontWeight: '600', fontSize: '13px', cursor: 'pointer' },

  // Spinner simple
  spinner: { width: '30px', height: '30px', border: '3px solid #e2e8f0', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};

// Animación CSS inyectada para el spinner
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;
document.head.appendChild(styleSheet);

export default HistoryModal;