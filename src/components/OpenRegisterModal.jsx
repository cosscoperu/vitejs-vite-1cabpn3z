import React, { useState } from 'react';

function OpenRegisterModal({ show, onClose, onOpenShift, isOpen }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  // 1. PROTECCIÓN VISUAL: Si ya está abierta, mostramos aviso.
  if (isOpen) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <span style={{ fontSize: '40px' }}>⚠️</span>
            <h2 style={{ color: '#f39c12', margin: '10px 0' }}>
              Turno ya iniciado
            </h2>
            <p style={{ color: '#666' }}>
              Ya existe una caja abierta. Debes cerrarla antes de abrir una
              nueva.
            </p>
            <button onClick={onClose} style={styles.btnConfirm}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. FORMULARIO NORMAL DE APERTURA
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount) return;

    setLoading(true);
    await onOpenShift(Number(amount));
    setLoading(false);
    setAmount(''); // Limpiar campo
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={{ textAlign: 'center', color: '#333' }}>🌞 Abrir Caja</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
          Ingresa el fondo de caja inicial (Sencillo).
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Monto Inicial (S/):</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={styles.input}
              step="0.01"
              min="0"
              placeholder="0.00"
              autoFocus
              required
            />
          </div>

          <div style={styles.actions}>
            <button type="submit" style={styles.btnConfirm} disabled={loading}>
              {loading ? 'Abriendo...' : '✅ Iniciar Turno'}
            </button>
            <button type="button" onClick={onClose} style={styles.btnCancel}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    width: '400px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginTop: '20px',
  },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontWeight: 'bold', color: '#555' },
  input: {
    padding: '12px',
    fontSize: '24px',
    borderRadius: '5px',
    border: '1px solid #28a745',
    textAlign: 'center',
    color: '#28a745',
    fontWeight: 'bold',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    justifyContent: 'center',
  },
  btnConfirm: {
    padding: '12px 30px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#28a745',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    width: '100%',
  },
  btnCancel: {
    padding: '10px',
    fontSize: '14px',
    color: '#666',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};

export default OpenRegisterModal;
