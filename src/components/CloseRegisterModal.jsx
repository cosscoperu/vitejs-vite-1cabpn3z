import React, { useState, useEffect, useMemo } from 'react';
// 1. IMPORTAMOS EL LECTOR DE CONFIGURACIÓN
import { getPosConfig } from '../utils/posSettings';

function CloseRegisterModal({ show, onClose, onCloseShift, currentShift }) {
  const [cashCount, setCashCount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // 2. OBTENER CONFIGURACIÓN ACTUAL (Moneda y País)
  // Esto asegura que el modal muestre $ o S/ según lo configurado
  const { currency, country } = useMemo(() => getPosConfig(), [show]);

  // 3. ETIQUETAS DINÁMICAS (Para que coincida con el país)
  const digitalLabel = useMemo(() => {
    if (country === 'PERU') return 'Yape / Plin';
    if (country === 'COLOMBIA') return 'Nequi / DaviPlata';
    if (country === 'VENEZUELA') return 'Pago Móvil / Zelle';
    if (country === 'MEXICO') return 'Mercado Pago';
    if (country === 'ARGENTINA') return 'Mercado Pago';
    if (country === 'CHILE') return 'WebPay / Mach';
    return 'Billeteras Digitales';
  }, [country]);

  // --- EXTRACCIÓN DE TOTALES (Con protección contra nulos) ---
  const initialAmount = Number(currentShift?.initialAmount || 0);
  
  // Desglose de ventas según lo que viene de Firebase (Shift Service)
  const cashSales = Number(currentShift?.cashSales || 0);
  const digitalSales = Number(currentShift?.digitalSales || 0); 
  const cardSales = Number(currentShift?.cardSales || 0);       
  const bankSales = Number(currentShift?.bankSales || 0);       
  const otherSales = Number(currentShift?.otherSales || 0);

  const expenses = Number(currentShift?.expensesTotal || 0); 

  // Dinero Físico Esperado = Fondo Inicial + Ventas Efectivo - Gastos
  const expectedCash = initialAmount + cashSales - expenses;
  
  // Diferencia (Cuadre)
  const difference = (Number(cashCount) || 0) - expectedCash;

  // Total vendido global (Suma de todo método)
  const totalSold = cashSales + digitalSales + cardSales + bankSales + otherSales;

  // Reset al abrir
  useEffect(() => {
    if (show) {
      setCashCount('');
      setNotes('');
    }
  }, [show]);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cashCount === '') return;
    setLoading(true);

    const closingData = {
      finalCashCount: Number(cashCount),
      expectedCash: expectedCash,
      difference: difference,
      totalSales: totalSold,
      notes: notes,
      currency: currency, // Guardamos la moneda del cierre para historial
      closingDate: new Date()
    };

    await onCloseShift(closingData);
    setLoading(false);
    setCashCount('');
    setNotes('');
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={{margin: 0}}>🔒 Arqueo de Caja</h2>
          <button onClick={onClose} style={styles.closeBtn}>X</button>
        </div>
        
        <div style={styles.scrollableContent}>
          {/* --- BLOQUE 1: DINERO FÍSICO (CAJA CHICA) --- */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>💵 Efectivo en Custodia</h4>
            <div style={styles.summaryRow}>
              <span>Fondo Inicial:</span>
              <span>{currency} {initialAmount.toFixed(2)}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>(+) Ventas Efectivo:</span>
              <span>{currency} {cashSales.toFixed(2)}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>(-) Gastos/Salidas:</span>
              <span style={{color: 'red'}}>{currency} {expenses.toFixed(2)}</span>
            </div>
            <div style={{...styles.summaryRow, borderTop: '1px solid #ccc', paddingTop: '5px', fontWeight: 'bold', fontSize: '16px'}}>
              <span>= A ENTREGAR:</span>
              <span>{currency} {expectedCash.toFixed(2)}</span>
            </div>
          </div>

          {/* --- BLOQUE 2: DINERO VIRTUAL (EN CUENTA) --- */}
          <div style={{...styles.section, backgroundColor: '#f0f8ff', borderColor: '#cce5ff'}}>
            <h4 style={{...styles.sectionTitle, color: '#0056b3'}}>💳 Ventas Digitales (Bancos/Apps)</h4>
            
            <div style={styles.summaryRow}>
              <span>{digitalLabel}:</span>
              <span style={{color: '#007bff', fontWeight: '500'}}>{currency} {digitalSales.toFixed(2)}</span>
            </div>
            
            <div style={styles.summaryRow}>
              <span>Tarjetas (POS):</span>
              <span style={{color: '#007bff', fontWeight: '500'}}>{currency} {cardSales.toFixed(2)}</span>
            </div>
            
            {bankSales > 0 && (
              <div style={styles.summaryRow}>
                <span>Transferencias:</span>
                <span style={{color: '#007bff', fontWeight: '500'}}>{currency} {bankSales.toFixed(2)}</span>
              </div>
            )}
            
            {otherSales > 0 && (
              <div style={styles.summaryRow}>
                <span>Otros Métodos:</span>
                <span style={{color: '#007bff', fontWeight: '500'}}>{currency} {otherSales.toFixed(2)}</span>
              </div>
            )}

             <div style={{...styles.summaryRow, borderTop: '1px solid #b8daff', paddingTop: '5px', fontWeight: 'bold'}}>
              <span>TOTAL DIGITAL:</span>
              <span>{currency} {(digitalSales + cardSales + bankSales + otherSales).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* --- BLOQUE 3: EL CONTEO --- */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Cuadre de Efectivo (Cuenta tus billetes):</label>
            <input 
              type="number" 
              value={cashCount} 
              onChange={(e) => setCashCount(e.target.value)} 
              style={{
                ...styles.inputMoney, 
                borderColor: difference < 0 ? 'red' : '#28a745', 
                color: difference < 0 ? 'red' : '#28a745'
              }} 
              step="0.01" 
              min="0" 
              placeholder={`${currency} 0.00`} 
              required 
              autoFocus
            />
          </div>

          {cashCount !== '' && (
            <div style={{textAlign: 'center', marginBottom: '5px', fontWeight: 'bold', fontSize: '15px', color: difference === 0 ? 'green' : (difference < 0 ? 'red' : 'blue')}}>
              {difference === 0 ? '✨ CUADRE PERFECTO' : (difference < 0 ? `❌ FALTANTE: ${currency} ${Math.abs(difference).toFixed(2)}` : `⚠️ SOBRANTE: ${currency} ${difference.toFixed(2)}`)}
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Notas de Cierre:</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              style={styles.textarea} 
              placeholder="Ej: Se dejó sencillo en caja..."
              rows="2"
            />
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.btnCancel}>Cancelar</button>
            <button type="submit" style={styles.btnConfirm} disabled={loading}>
              {loading ? 'Cerrando...' : 'Cerrar Turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '450px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 25px rgba(0,0,0,0.3)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: '#999' },
  scrollableContent: { overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' },
  section: { backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #eee', fontSize: '13px' },
  sectionTitle: { margin: '0 0 8px 0', fontSize: '13px', color: '#555', textTransform: 'uppercase', borderBottom: '1px solid #ddd', paddingBottom: '4px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontWeight: 'bold', color: '#333', fontSize: '13px' },
  inputMoney: { padding: '12px', fontSize: '24px', borderRadius: '5px', border: '2px solid #ccc', textAlign: 'center', fontWeight: 'bold' },
  textarea: { padding: '8px', borderRadius: '5px', border: '1px solid #ccc', resize: 'none' },
  actions: { display: 'flex', gap: '10px', marginTop: '5px' },
  btnCancel: { flex: 1, padding: '12px', borderRadius: '5px', border: 'none', backgroundColor: '#ccc', color: 'black', fontWeight: 'bold', cursor: 'pointer' },
  btnConfirm: { flex: 2, padding: '12px', borderRadius: '5px', border: 'none', backgroundColor: '#dc3545', color: 'white', fontWeight: 'bold', cursor: 'pointer' }
};

export default CloseRegisterModal;