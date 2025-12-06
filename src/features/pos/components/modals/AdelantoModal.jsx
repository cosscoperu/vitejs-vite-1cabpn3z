// src/features/pos/components/modals/AdelantoModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import useHotkeys from '../../../../hooks/useHotkeys';
import toast from 'react-hot-toast';

// Modal para registrar un adelanto de un pedido.
// Recibe: totalAmount, y devuelve { method, amount } vía onConfirmAdelanto.
function AdelantoModal({ show, onClose, totalAmount = 0, onConfirmAdelanto }) {
  // Aseguramos que totalAmount siempre sea un número válido
  const safeTotal = Number(totalAmount) || 0;

  // Por defecto, Yape está seleccionado
  const [paymentMethod, setPaymentMethod] = useState('yape');
  // Por defecto, el monto es el total (por si pagan todo por adelantado)
  const [amount, setAmount] = useState(safeTotal.toFixed(2));

  const amountInputRef = useRef(null);

  // Reseteamos y enfocamos cada vez que se abre
  useEffect(() => {
    if (show) {
      setPaymentMethod('yape');
      setAmount(safeTotal.toFixed(2));

      setTimeout(() => {
        if (amountInputRef.current) {
          amountInputRef.current.focus();
          amountInputRef.current.select();
        }
      }, 50);
    }
  }, [show, safeTotal]);

  // Función para confirmar el adelanto
  const handleConfirm = () => {
    const adelantoAmount = parseFloat(amount);

    if (!paymentMethod) {
      toast.error('Selecciona un método de pago.');
      return;
    }
    if (!adelantoAmount || adelantoAmount <= 0) {
      toast.error('El monto debe ser mayor a 0.');
      return;
    }
    if (adelantoAmount > safeTotal) {
      toast.error('El adelanto no puede ser mayor al total del pedido.');
      return;
    }

    // Devolvemos la información del adelanto
    onConfirmAdelanto({
      method: paymentMethod,
      amount: adelantoAmount,
    });
    onClose();
  };

  // Atajos de teclado (F1-F4, F12, Esc)
  const keyMap = {
    F1: () => setPaymentMethod('efectivo'),
    F2: () => setPaymentMethod('yape'),
    F3: () => setPaymentMethod('tarjeta'),
    F4: () => setPaymentMethod('banco'),
    F12: handleConfirm,
    Escape: onClose,
  };

  useHotkeys(keyMap, [handleConfirm, onClose, paymentMethod, amount], show);

  if (!show) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h2 style={styles.title}>Registrar Adelanto</h2>

        <div style={styles.totalDisplay}>
          <span style={styles.totalText}>TOTAL DEL PEDIDO:</span>
          <span style={styles.totalAmount}>S/ {safeTotal.toFixed(2)}</span>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Monto del Adelanto:</label>
          <input
            ref={amountInputRef}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={styles.input}
            onFocus={(e) => e.target.select()}
          />
        </div>

        <label style={styles.label}>
          Método de Pago del Adelanto (Defecto: Yape):
        </label>
        <div style={styles.methodGrid}>
          <button
            style={
              paymentMethod === 'efectivo'
                ? { ...styles.methodButton, ...styles.methodButtonSelected }
                : styles.methodButton
            }
            onClick={() => setPaymentMethod('efectivo')}
          >
            <span style={styles.hotkeyLabel}>F1</span>Efectivo
          </button>
          <button
            style={
              paymentMethod === 'yape'
                ? { ...styles.methodButton, ...styles.methodButtonSelected }
                : styles.methodButton
            }
            onClick={() => setPaymentMethod('yape')}
          >
            <span style={styles.hotkeyLabel}>F2</span>Yape
          </button>
          <button
            style={
              paymentMethod === 'tarjeta'
                ? { ...styles.methodButton, ...styles.methodButtonSelected }
                : styles.methodButton
            }
            onClick={() => setPaymentMethod('tarjeta')}
          >
            <span style={styles.hotkeyLabel}>F3</span>Tarjeta
          </button>
          <button
            style={
              paymentMethod === 'banco'
                ? { ...styles.methodButton, ...styles.methodButtonSelected }
                : styles.methodButton
            }
            onClick={() => setPaymentMethod('banco')}
          >
            <span style={styles.hotkeyLabel}>F4</span>Banco
          </button>
        </div>

        <div style={styles.buttonGroup}>
          <button type="button" onClick={onClose} style={styles.buttonCancel}>
            Cancelar <span style={styles.hotkeyLabelSmall}>(Esc)</span>
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={styles.buttonSave}
          >
            Confirmar Adelanto{' '}
            <span style={styles.hotkeyLabelSmall}>(F12)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Estilos inline
const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '25px 30px',
    borderRadius: '8px',
    boxShadow: '0 5px 20px rgba(0,0,0,0.25)',
    width: '450px',
  },
  title: {
    textAlign: 'center',
    margin: '0 0 15px 0',
    color: '#1E2A3A',
  },
  totalDisplay: {
    backgroundColor: '#f0f2f5',
    padding: '15px 20px',
    borderRadius: '5px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  totalText: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#555',
  },
  totalAmount: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1E2A3A',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#333',
  },
  formGroup: {
    marginBottom: '15px',
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    padding: '12px',
    fontSize: '18px',
    borderRadius: '4px',
    border: '1px solid #ccc', // 👈 aquí estaba el error antes
    marginTop: '5px',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  methodGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '20px',
  },
  methodButton: {
    padding: '15px',
    fontSize: '16px',
    cursor: 'pointer',
    border: '2px solid #ddd',
    borderRadius: '5px',
    backgroundColor: '#f9f9f9',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  methodButtonSelected: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff',
    fontWeight: 'bold',
  },
  buttonGroup: {
    marginTop: '25px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
  },
  buttonSave: {
    flex: 1,
    padding: '15px',
    fontSize: '16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  buttonCancel: {
    flex: 1,
    padding: '15px',
    fontSize: '16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  hotkeyLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'inherit',
    marginBottom: '5px',
  },
  hotkeyLabelSmall: {
    fontSize: '12px',
    opacity: 0.8,
    marginLeft: '5px',
  },
};

export default AdelantoModal;
