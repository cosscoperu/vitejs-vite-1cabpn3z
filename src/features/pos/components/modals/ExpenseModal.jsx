// src/features/pos/components/modals/ExpenseModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { db } from '../../../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import useHotkeys from '../../../../hooks/useHotkeys';
import {
  getCurrentOpenShift,
  addExpenseToShift,
} from '../../../../services/shiftService';

function ExpenseModal({ show, onClose }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const descInputRef = useRef(null);

  useEffect(() => {
    if (show) {
      setDescription('');
      setAmount('');
      setTimeout(() => {
        if (descInputRef.current) descInputRef.current.focus();
      }, 50);
    }
  }, [show]);

  const handleSaveExpense = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error('Ingresa una descripción.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('El monto debe ser mayor a 0.');
      return;
    }

    setLoading(true);
    try {
      // 1️⃣ Verificar turno abierto
      const currentShift = await getCurrentOpenShift();
      if (!currentShift || !currentShift.id) {
        toast.error('No hay una caja abierta para asociar el gasto.');
        setLoading(false);
        return;
      }

      const amountNum = Number(amount) || 0;

      // 2️⃣ Guardar gasto vinculado al turno
      await addDoc(collection(db, 'expenses'), {
        shiftId: currentShift.id,
        description: description.trim(),
        amount: amountNum,
        type: 'CAJA_CHICA',
        createdAt: serverTimestamp(),
      });

      // 3️⃣ Sumar al acumulado de gastos del turno
      await addExpenseToShift(currentShift.id, amountNum);

      // 4️⃣ Notificar para que otros componentes recarguen, ej. CloseRegisterModal
      window.dispatchEvent(new Event('pos-shift-updated'));

      toast.success(`Gasto registrado: -S/ ${amountNum.toFixed(2)}`);

      // Modo continuo: limpiar y seguir registrando
      setDescription('');
      setAmount('');
      if (descInputRef.current) descInputRef.current.focus();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar gasto.');
    }
    setLoading(false);
  };

  useHotkeys({ Escape: onClose }, [onClose], show);

  if (!show) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={{ margin: 0, color: '#dc3545' }}>
            💸 Salida de Efectivo (Gasto)
          </h2>
          <button onClick={onClose} style={styles.closeBtn}>
            X
          </button>
        </div>

        <p
          style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '20px',
          }}
        >
          Registra gastos menores (Almuerzo, Pasajes, Limpieza).
        </p>

        <form onSubmit={handleSaveExpense}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Descripción del Gasto:</label>
            <input
              ref={descInputRef}
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={styles.textInput}
              placeholder="Ej. Compra de detergente"
              autoComplete="off"
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Monto Retirado (S/):</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={styles.numberInput}
              placeholder="0.00"
            />
          </div>

          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={styles.btnCancel}
              disabled={loading}
            >
              Terminar / Cerrar
            </button>
            <button type="submit" style={styles.btnSave} disabled={loading}>
              {loading ? 'Guardando...' : 'REGISTRAR Y SEGUIR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 🔹 Estilos (tomados de tu versión original, sin errores de comillas)
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
  },
  modal: {
    background: 'white',
    padding: '25px',
    borderRadius: '10px',
    width: '450px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    fontWeight: 'bold',
    marginBottom: '5px',
    fontSize: '14px',
    color: '#333',
  },
  textInput: {
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  numberInput: {
    width: '100%',
    padding: '10px',
    fontSize: '24px',
    textAlign: 'center',
    borderRadius: '4px',
    border: '2px solid #dc3545',
    color: '#dc3545',
    fontWeight: 'bold',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  btnCancel: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    background: '#ccc',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  btnSave: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    background: '#dc3545',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px',
  },
};

export default ExpenseModal;
