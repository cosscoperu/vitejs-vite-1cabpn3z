import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

function AddStockModal({ product, show, onClose, onAddMovement }) {
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState(''); // Nuevo: Motivo del ajuste
  const [loading, setLoading] = useState(false);
  const quantityInputRef = useRef(null);

  useEffect(() => {
    if (show && quantityInputRef.current) {
      quantityInputRef.current.focus();
      quantityInputRef.current.select();
    }
    setQuantity(0); 
    setReason('');
  }, [show]);

  const handleAdjustStock = async (e) => {
    if (e) e.preventDefault(); 
    const adjustmentAmount = Number(quantity);

    if (adjustmentAmount === 0) {
      toast.error("La cantidad no puede ser 0");
      return;
    }
    
    setLoading(true);
    
    try {
      // Usar la función del hook que maneja todo correctamente
      await onAddMovement({
        productId: product.id,
        type: adjustmentAmount > 0 ? 'ENTRADA' : 'SALIDA',
        quantity: adjustmentAmount,
        reason: reason || (adjustmentAmount > 0 ? 'Ingreso Manual / Compra' : 'Ajuste / Merma'),
        user: 'Administrador'
      });

      if (adjustmentAmount > 0) {
        toast.success(`¡${adjustmentAmount} unidades AÑADIDAS!`);
      } else {
        toast.success(`¡${Math.abs(adjustmentAmount)} unidades RESTADAS!`);
      }
      
      onClose();

    } catch (err) {
      console.error("Error al ajustar stock: ", err);
      toast.error("Error al actualizar.");
    }
    setLoading(false);
  };

  if (!show || !product) return null;

  return (
    <div style={styles.modalOverlay}>
      <form onSubmit={handleAdjustStock} style={styles.modalContent}>
        <h2 style={styles.title}>Ajustar Stock</h2>
        <p style={styles.productName}>{product.name}</p>
        
        <div style={styles.formGroup}>
          <label>Cantidad (+/-):</label>
          <input
            ref={quantityInputRef}
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            style={styles.input}
            placeholder="Ej: 10 o -5"
          />
          <small style={{color:'#666', marginTop:'5px'}}>
            Use números negativos para restar (mermas).
          </small>
        </div>

        <div style={styles.formGroup}>
          <label>Motivo (Opcional):</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={styles.input}
            placeholder="Ej: Factura #123, Producto roto..."
          />
        </div>

        <div style={styles.buttonGroup}>
          <button type="button" onClick={onClose} style={styles.buttonCancel} disabled={loading}>Cancelar</button>
          <button type="submit" style={styles.buttonSave} disabled={loading || Number(quantity) === 0}>
            {loading ? 'Guardando...' : 'Confirmar Movimiento'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', padding: '25px 30px', borderRadius: '8px', boxShadow: '0 5px 20px rgba(0,0,0,0.25)', width: '400px', },
  title: { textAlign: 'center', margin: '0 0 5px 0', color: '#1E2A3A' },
  productName: { textAlign: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#007bff' },
  formGroup: { marginBottom: '15px', display: 'flex', flexDirection: 'column', },
  input: { padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc', marginTop: '5px' },
  buttonGroup: { marginTop: '25px', display: 'flex', justifyContent: 'space-between', gap: '10px', },
  buttonSave: { flex: 1, padding: '15px', fontSize: '16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  buttonCancel: { flex: 1, padding: '15px', fontSize: '16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};

export default AddStockModal;
