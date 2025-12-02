// src/components/GlobalDiscountModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import useHotkeys from '../hooks/useHotkeys';
import toast from 'react-hot-toast';

function GlobalDiscountModal({ show, onClose, currentTotal, onApplyDiscount }) {
  const [newTotal, setNewTotal] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (show) {
      setNewTotal(currentTotal.toFixed(2)); // Rellena con el total actual
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [show, currentTotal]);

  const handleConfirm = (e) => {
    if (e) e.preventDefault();

    const targetTotal = parseFloat(newTotal);

    if (isNaN(targetTotal) || targetTotal < 0) {
      toast.error("Ingresa un monto válido.");
      return;
    }

    if (targetTotal > currentTotal) {
      toast.error("El nuevo total no puede ser mayor al actual.");
      return;
    }

    // Calculamos el descuento necesario para llegar a ese precio
    // Ejemplo: Total 103, Quiero 100 -> Descuento = 3
    const discountAmount = currentTotal - targetTotal;
    
    onApplyDiscount(discountAmount);
    onClose();
  };

  // Atajos
  useHotkeys({
    'Escape': onClose,
  }, [onClose], show);

  if (!show) return null;

  return (
    <div style={styles.modalOverlay}>
      <form onSubmit={handleConfirm} style={styles.modalContent}>
        <h2 style={styles.title}>Aplicar Descuento Global</h2>
        <p style={styles.text}>Total Actual: <strong>S/ {currentTotal.toFixed(2)}</strong></p>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Nuevo Total a Cobrar:</label>
          <input
            ref={inputRef}
            type="number"
            step="0.01"
            value={newTotal}
            onChange={(e) => setNewTotal(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.buttonGroup}>
          <button type="button" onClick={onClose} style={styles.buttonCancel}>Cancelar</button>
          <button type="submit" style={styles.buttonSave}>Aplicar Descuento</button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '350px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' },
  title: { textAlign: 'center', margin: '0 0 15px 0', color: '#1E2A3A' },
  text: { textAlign: 'center', marginBottom: '15px', fontSize: '16px' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#333' },
  input: { width: '100%', padding: '12px', fontSize: '20px', textAlign: 'center', border: '2px solid #007bff', borderRadius: '4px', fontWeight: 'bold', color: '#007bff' },
  buttonGroup: { display: 'flex', gap: '10px' },
  buttonSave: { flex: 1, padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  buttonCancel: { flex: 1, padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};

export default GlobalDiscountModal;