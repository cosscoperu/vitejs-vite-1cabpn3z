import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

function ConfirmOrderModal({ show, onClose, order, onConfirm }) {
  const [paymentMethod, setPaymentMethod] = useState('yape'); 
  const [payAmount, setPayAmount] = useState(''); // Estado para el monto a pagar

  useEffect(() => {
    if (show && order) {
      setPaymentMethod(order?.payment?.method || 'yape');
      // Por defecto sugerimos pagar TODO el saldo pendiente
      const pending = order.total - (order.payment?.advance || 0);
      setPayAmount(pending.toFixed(2)); 
    }
  }, [show, order]);

  if (!show || !order) return null;

  const currentDebt = order.total - (order.payment?.advance || 0);
  const isPartial = Number(payAmount) < Number(currentDebt.toFixed(2));

  const handleConfirm = () => {
    if (!paymentMethod) return toast.error("Selecciona método de pago");
    const amount = Number(payAmount);
    
    if (amount <= 0) return toast.error("Monto inválido");
    if (amount > currentDebt) return toast.error("No puedes cobrar más de la deuda");

    // Enviamos el monto y un flag si es parcial o total
    onConfirm(paymentMethod, amount, isPartial);
    onClose();
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h2 style={styles.title}>💰 {isPartial ? 'Realizar Abono' : 'Cobrar Totalidad'}</h2>
        
        <div style={styles.infoBox}>
           <div>Cliente: <b>{order.orderInfo?.clientName}</b></div>
           <div style={{fontSize:'12px', color:'#666'}}>Deuda Actual: S/ {currentDebt.toFixed(2)}</div>
        </div>

        <div style={styles.amountSection}>
          <label style={styles.label}>Monto a cobrar ahora:</label>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
             <span style={{fontSize:'20px', fontWeight:'bold'}}>S/</span>
             <input 
                type="number" 
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                style={styles.amountInput}
                step="0.10"
             />
          </div>
          {isPartial && <div style={styles.partialBadge}>⚠️ ESTO ES UN ABONO PARCIAL</div>}
        </div>
        
        <label style={styles.label}>Método de Pago:</label>
        <div style={styles.methodGrid}>
          {['efectivo', 'yape', 'tarjeta', 'banco'].map(m => (
            <button 
                key={m}
                style={paymentMethod === m ? {...styles.methodButton, ...styles.methodButtonSelected} : styles.methodButton} 
                onClick={() => setPaymentMethod(m)}
            >
                {m.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={styles.buttonGroup}>
          <button type="button" onClick={onClose} style={styles.buttonCancel}>Cancelar</button>
          <button type="button" onClick={handleConfirm} style={isPartial ? styles.buttonPartial : styles.buttonSave}>
             {isPartial ? `ABONAR S/ ${payAmount}` : `COBRAR TODO`}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', padding: '25px 30px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', width: '450px', },
  title: { textAlign: 'center', margin: '0 0 15px 0', color: '#1E2A3A', fontSize: '20px' },
  infoBox: { textAlign: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' },
  
  amountSection: { background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign:'center' },
  amountInput: { width: '150px', padding: '10px', fontSize: '24px', fontWeight:'bold', textAlign:'center', border:'2px solid #ddd', borderRadius:'8px', outline:'none', color:'#333' },
  partialBadge: { marginTop:'10px', fontSize:'11px', background:'#fff3cd', color:'#856404', padding:'5px', borderRadius:'4px', fontWeight:'bold' },

  label: { display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#333' },
  methodGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '25px' },
  methodButton: { padding: '15px', fontSize: '14px', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: 'white', transition: 'all 0.2s', textAlign: 'center', color: '#555', fontWeight:'600' },
  methodButtonSelected: { backgroundColor: '#1E2A3A', color: 'white', borderColor: '#1E2A3A', transform: 'scale(1.02)' },
  
  buttonGroup: { display: 'flex', gap: '15px', },
  buttonSave: { flex: 2, padding: '15px', fontSize: '16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  buttonPartial: { flex: 2, padding: '15px', fontSize: '16px', backgroundColor: '#ffc107', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  buttonCancel: { flex: 1, padding: '15px', fontSize: '16px', backgroundColor: '#f1f1f1', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
};

export default ConfirmOrderModal;