import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, query, orderBy, getDocs, where, Timestamp } from 'firebase/firestore';

// --- ICONOS ---
const IconRefresh = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>;
const IconCalendar = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const IconEye = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconCash = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const IconBank = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>;
const IconAlert = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;

// --- HELPERS ---
function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('es-PE', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true });
}

const getDateRange = (filterType, customDate) => {
  const now = new Date();
  let start = new Date(); let end = new Date();
  start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
  switch (filterType) {
    case 'TODAY': break; 
    case 'YESTERDAY': start.setDate(now.getDate() - 1); end.setDate(now.getDate() - 1); break;
    case 'WEEK': start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); break;
    case 'MONTH': start.setDate(1); break;
    case 'YEAR': start.setMonth(0, 1); break;
    case 'CUSTOM': if (customDate) { const s = new Date(customDate); const offset = s.getTimezoneOffset() * 60000; const adj = new Date(s.getTime() + offset); start = new Date(adj); start.setHours(0,0,0,0); end = new Date(adj); end.setHours(23,59,59,999); } break;
    default: break;
  }
  return { start, end };
};

function ReportsPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('TODAY');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  
  // PESTAÑA ACTIVA: 'FINANCE' (Dinero) o 'AUDIT' (Problemas)
  const [activeTab, setActiveTab] = useState('FINANCE'); 

  // --- CARGA MANUAL ---
  const loadReports = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { start, end } = getDateRange(filterType, customDate);
      // NOTA: Aquí deberíamos traer TAMBIÉN las ventas con status 'cancelled' o 'returned'
      // Si tu BD separa ventas anuladas, necesitaríamos otra query. 
      // Asumiremos que están en la misma colección 'sales' pero con un campo 'status'.
      const q = query(
        collection(db, 'sales'), 
        where('createdAt', '>=', Timestamp.fromDate(start)),
        where('createdAt', '<=', Timestamp.fromDate(end)),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { console.error(err); setError(err); } 
    finally { setLoading(false); }
  }, [filterType, customDate]);

  useEffect(() => { if (filterType === 'TODAY') loadReports(); }, []);

  // --- LÓGICA FINANCIERA AVANZADA ---
  const reportData = useMemo(() => {
    let revenue = 0; let cash = 0; let bank = 0; let online = 0;
    let activeSales = [];
    let auditSales = []; // Ventas anuladas, devueltas o con incidencias

    sales.forEach(sale => {
        // 1. SEPARAR POR ESTADO
        // Si tu sistema aun no tiene estado, asumimos 'completed'. 
        // Para probar auditoría, simula que algunas ventas tienen status: 'cancelled'
        if (sale.status === 'cancelled' || sale.status === 'returned') {
            auditSales.push(sale);
            return; // No suman al dinero real
        }
        
        activeSales.push(sale);

        // 2. CALCULAR DINERO REAL
        if (sale.total) {
            revenue += sale.total;
            
            // Redes Sociales
            if (sale.orderInfo?.type === 'Online') {
                online += sale.total;
            }

            // Caja vs Banco
            if (sale.payment?.payments?.length > 0) {
                sale.payment.payments.forEach(p => {
                    const method = p.method?.toUpperCase() || 'UNKNOWN';
                    if (method === 'CASH' || method === 'EFECTIVO') cash += p.amount;
                    else bank += p.amount;
                });
            } else if (sale.payment?.method) {
                const method = sale.payment.method.toUpperCase();
                if (method === 'CASH' || method === 'EFECTIVO') cash += sale.total;
                else bank += sale.total;
            }
        }
    });

    return { revenue, cash, bank, online, activeSales, auditSales };
  }, [sales]);

  return (
    <div style={styles.container}>
      
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Reportes & Auditoría</h1>
          <p style={styles.subtitle}>
             {filterType === 'TODAY' ? 'Cierre de Caja: HOY' : `Histórico: ${filterType}`}
          </p>
        </div>
        <div style={styles.controls}>
          <div style={styles.glassInputWrapper}>
            <IconCalendar />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={styles.glassSelect}>
              <option value="TODAY">Hoy</option>
              <option value="YESTERDAY">Ayer</option>
              <option value="WEEK">Semana</option>
              <option value="MONTH">Mes</option>
              <option value="CUSTOM">Fecha</option>
            </select>
          </div>
          {filterType === 'CUSTOM' && <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} style={styles.glassDate} />}
          <button onClick={loadReports} style={styles.btnAction} disabled={loading}>
            <IconRefresh /> {loading ? '...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN (CLAVE PARA NO CONFUNDIR) */}
      <div style={styles.tabsContainer}>
          <button 
            style={activeTab === 'FINANCE' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('FINANCE')}
          >
            📊 Flujo de Caja
          </button>
          <button 
            style={activeTab === 'AUDIT' ? styles.tabActiveAudit : styles.tab}
            onClick={() => setActiveTab('AUDIT')}
          >
            🚨 Auditoría / Anulados
            {reportData.auditSales.length > 0 && <span style={styles.auditBadge}>{reportData.auditSales.length}</span>}
          </button>
      </div>

      {/* --- CONTENIDO PESTAÑA 1: FINANZAS --- */}
      {activeTab === 'FINANCE' && (
        <>
            <div style={styles.kpiGrid}>
                {/* TARJETA 1: VENTAS TOTALES (BRUTO) */}
                <div style={{...styles.kpiCard, background: '#1e293b', color:'white'}}>
                    <div style={styles.kpiHeader}>VENTAS TOTALES</div>
                    <div style={styles.kpiValue}>S/ {reportData.revenue.toFixed(2)}</div>
                    <div style={styles.kpiSub}>Dinero total procesado</div>
                </div>

                {/* TARJETA 2: EFECTIVO (PARA ARQUEO) */}
                <div style={{...styles.kpiCard, background: '#10b981', color:'white'}}>
                    <div style={styles.kpiHeader}><IconCash /> EFECTIVO FÍSICO</div>
                    <div style={styles.kpiValue}>S/ {reportData.cash.toFixed(2)}</div>
                    <div style={styles.kpiSub}>Debe haber en caja</div>
                </div>

                {/* TARJETA 3: BANCOS (PARA CONCILIACIÓN) */}
                <div style={{...styles.kpiCard, background: '#3b82f6', color:'white'}}>
                    <div style={styles.kpiHeader}><IconBank /> BANCO / DIGITAL</div>
                    <div style={styles.kpiValue}>S/ {reportData.bank.toFixed(2)}</div>
                    <div style={styles.kpiSub}>Yape, Plin, Tarjetas</div>
                </div>

                {/* TARJETA 4: REDES (SOLO INFORMATIVO) */}
                <div style={{...styles.kpiCard, background: 'white', color:'#334155', border:'1px solid #e2e8f0'}}>
                    <div style={{...styles.kpiHeader, color:'#64748b'}}>VENTAS REDES</div>
                    <div style={{...styles.kpiValue, color:'#0f172a'}}>S/ {reportData.online.toFixed(2)}</div>
                    <div style={styles.kpiSub}>Ya incluidas en total</div>
                </div>
            </div>

            <div style={styles.tableContainer}>
                {reportData.activeSales.length === 0 ? (
                    <div style={{padding:'40px', textAlign:'center', color:'#94a3b8'}}>No hay ventas registradas en este periodo.</div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Hora</th>
                                <th style={styles.th}>Tipo</th>
                                <th style={styles.th}>Monto</th>
                                <th style={styles.th}>Destino</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.activeSales.map(sale => (
                                <tr key={sale.id} style={styles.tr}>
                                    <td style={styles.td}>{formatDate(sale.createdAt)}</td>
                                    <td style={styles.td}>{sale.orderInfo?.type === 'Online' ? '🌐 REDES' : '🛒 TIENDA'}</td>
                                    <td style={{...styles.td, fontWeight:'bold'}}>S/ {sale.total.toFixed(2)}</td>
                                    <td style={styles.td}>
                                        {/* Lógica visual simple para destino */}
                                        {sale.payment?.method === 'CASH' || sale.payment?.method === 'EFECTIVO' 
                                            ? <span style={{color:'#10b981', fontWeight:'700'}}>EFECTIVO</span> 
                                            : <span style={{color:'#3b82f6', fontWeight:'700'}}>BANCO</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
      )}

      {/* --- CONTENIDO PESTAÑA 2: AUDITORÍA (Tus puntos 6 y 7) --- */}
      {activeTab === 'AUDIT' && (
          <div style={{...styles.tableContainer, borderTop:'4px solid #ef4444'}}>
              <div style={{padding:'20px', borderBottom:'1px solid #eee', background:'#fef2f2'}}>
                  <h3 style={{margin:0, color:'#b91c1c', display:'flex', alignItems:'center', gap:'10px'}}>
                      <IconAlert /> Registro de Anomalías
                  </h3>
                  <p style={{margin:'5px 0 0', fontSize:'13px', color:'#7f1d1d'}}>
                      Aquí aparecen las ventas eliminadas, anuladas o devoluciones. Si esto está vacío, todo está perfecto.
                  </p>
              </div>
              
              {reportData.auditSales.length === 0 ? (
                  <div style={{padding:'50px', textAlign:'center', color:'#16a34a', fontWeight:'600'}}>
                      ✅ Sin incidencias. No hay ventas eliminadas ni devoluciones en este periodo.
                  </div>
              ) : (
                  <table style={styles.table}>
                      <thead>
                          <tr>
                              <th style={styles.th}>Fecha</th>
                              <th style={styles.th}>Motivo</th>
                              <th style={styles.th}>Monto Afectado</th>
                              <th style={styles.th}>Responsable</th>
                          </tr>
                      </thead>
                      <tbody>
                          {reportData.auditSales.map(sale => (
                              <tr key={sale.id} style={styles.tr}>
                                  <td style={styles.td}>{formatDate(sale.createdAt)}</td>
                                  <td style={styles.td}>
                                      <span style={{padding:'4px 8px', background:'#fee2e2', color:'#b91c1c', borderRadius:'4px', fontSize:'11px', fontWeight:'bold', textTransform:'uppercase'}}>
                                          {sale.status === 'returned' ? 'DEVOLUCIÓN' : 'ELIMINADA'}
                                      </span>
                                  </td>
                                  <td style={{...styles.td, textDecoration:'line-through', color:'#94a3b8'}}>
                                      S/ {sale.total.toFixed(2)}
                                  </td>
                                  <td style={styles.td}>{sale.sellerName || 'Admin'}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              )}
          </div>
      )}

    </div>
  );
}

const styles = {
  container: { width: '100%', minHeight: '100vh', background: '#f1f5f9', padding: '30px', fontFamily: '"Inter", sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' },
  title: { fontSize: '26px', fontWeight: '900', color: '#0f172a', margin: 0 },
  subtitle: { color: '#64748b', fontSize: '14px', marginTop: '5px', fontWeight: '500' },
  
  controls: { display: 'flex', gap: '10px' },
  glassInputWrapper: { display: 'flex', alignItems: 'center', background: 'white', borderRadius: '8px', padding: '0 10px', border: '1px solid #cbd5e1' },
  glassSelect: { border: 'none', background: 'transparent', height: '40px', fontSize: '13px', color: '#334155', outline: 'none' },
  glassDate: { border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', height: '42px', outline: 'none', color: '#334155' },
  btnAction: { display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', padding: '0 20px', height: '42px', fontWeight: '600', fontSize:'13px', cursor: 'pointer' },

  // TABS
  tabsContainer: { display:'flex', gap:'10px', marginBottom:'25px' },
  tab: { padding:'10px 20px', background:'transparent', border:'none', borderBottom:'2px solid transparent', color:'#64748b', fontWeight:'600', cursor:'pointer', fontSize:'14px' },
  tabActive: { padding:'10px 20px', background:'white', border:'none', borderBottom:'2px solid #0f172a', color:'#0f172a', fontWeight:'800', cursor:'pointer', fontSize:'14px', borderRadius:'8px 8px 0 0' },
  tabActiveAudit: { padding:'10px 20px', background:'#fef2f2', border:'none', borderBottom:'2px solid #ef4444', color:'#b91c1c', fontWeight:'800', cursor:'pointer', fontSize:'14px', borderRadius:'8px 8px 0 0', display:'flex', alignItems:'center', gap:'8px' },
  auditBadge: { background:'#ef4444', color:'white', padding:'2px 6px', borderRadius:'10px', fontSize:'10px' },

  // KPI
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' },
  kpiCard: { padding: '20px', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  kpiHeader: { fontSize: '11px', fontWeight: '800', letterSpacing: '1px', marginBottom: '10px', opacity: 0.8, display:'flex', alignItems:'center', gap:'8px' },
  kpiValue: { fontSize: '28px', fontWeight: '800', marginBottom: '4px' },
  kpiSub: { fontSize: '12px', opacity: 0.8 },

  // TABLE
  tableContainer: { background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '15px 20px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' },
  tr: { borderBottom: '1px solid #f8fafc' },
  td: { padding: '15px 20px', verticalAlign: 'middle', fontSize:'14px', color:'#334155' }
};

export default ReportsPage;