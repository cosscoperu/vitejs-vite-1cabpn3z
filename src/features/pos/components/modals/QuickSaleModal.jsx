import React, { useState, useRef, useEffect } from 'react';
import useHotkeys from '../../../../hooks/useHotkeys';
import toast from 'react-hot-toast';

function QuickSaleModal({ show, onClose, onAddProduct }) {
  
  const [name, setName] = useState('Prendas Varios');
  const [price, setPrice] = useState(0);
  
  const priceInputRef = useRef(null);
  const nameInputRef = useRef(null);
  
  // BLOQUEO SINCRÓNICO: Usamos useRef en lugar de useState para bloqueo inmediato
  const isSubmitting = useRef(false);

  useEffect(() => {
    if (show) {
      isSubmitting.current = false; // Resetear bloqueo
      setName('Prendas Varios');
      setPrice(0);
      setTimeout(() => {
        if (priceInputRef.current) {
          priceInputRef.current.focus();
          priceInputRef.current.select();
        }
      }, 50);
    }
  }, [show]);

  // Esta función se ejecuta SOLO por el evento 'onSubmit' del formulario
  const handleConfirm = (e) => {
    e.preventDefault(); // Detiene recargas

    // Si ya se está procesando, detener inmediatamente (Evita doble disparo)
    if (isSubmitting.current) return;

    const currentName = nameInputRef.current.value;
    const currentPriceVal = priceInputRef.current.value;
    const priceAmount = parseFloat(currentPriceVal);

    // Validaciones
    if (!currentName.trim()) {
      toast.error("El nombre no puede estar vacío.");
      return;
    }

    if (!currentPriceVal || isNaN(priceAmount) || priceAmount <= 0) {
      toast.error("El precio debe ser mayor a 0.");
      // Re-enfocar si hay error
      if (priceInputRef.current) {
        priceInputRef.current.focus();
        priceInputRef.current.select();
      }
      return; 
    }
    
    // BLOQUEAR: A partir de aquí, ignoramos cualquier otro Enter o Clic
    isSubmitting.current = true;

    onAddProduct({
      name: currentName,
      price: priceAmount,
      cost: 0, 
      stock: 999,
      codes: [`RAPIDO-${Date.now()}`],
    });
    onClose();
  };

  // ATAJOS: Solo escuchamos ESCAPE.
  // ELIMINAMOS 'Enter' de aquí porque el <form> ya lo maneja nativamente.
  useHotkeys({
    'Escape': onClose,
  }, [onClose], show);

  if (!show) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h2 style={styles.title}>Venta Rápida</h2>
        <p style={styles.subLabel}>Añade un producto genérico.</p>
        
        {/* EL FORMULARIO MANEJA EL ENTER AUTOMÁTICAMENTE */}
        <form onSubmit={handleConfirm}>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Nombre del Producto:</label>
            <input
              ref={nameInputRef}
              type="text"
              defaultValue="Prendas Varios" // Usamos defaultValue para rendimiento
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              onFocus={(e) => e.target.select()}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Precio de Venta:</label>
            <input
              ref={priceInputRef}
              type="number"
              step="0.01"
              style={styles.input}
              placeholder="0.00"
              // No usamos defaultValue en 0 para que placeholder se vea si borran
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div style={styles.buttonGroup}>
            <button type="button" onClick={onClose} style={styles.buttonCancel}>
              Cancelar <span style={styles.hotkeyLabelSmall}>(Esc)</span>
            </button>
            <button 
              type="submit" 
              style={styles.buttonSave}
            >
              Añadir al Ticket <span style={styles.hotkeyLabelSmall}>(Enter)</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', padding: '25px 30px', borderRadius: '8px', boxShadow: '0 5px 20px rgba(0,0,0,0.25)', width: '400px', },
  title: { textAlign: 'center', margin: '0 0 5px 0', color: '#1E2A3A' },
  subLabel: { fontSize: '14px', color: '#555', margin: '0 0 20px 0', textAlign: 'center' },
  label: { display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px', color: '#333' },
  formGroup: { marginBottom: '15px', display: 'flex', flexDirection: 'column', },
  input: { padding: '12px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc', marginTop: '5px', textAlign: 'center' },
  buttonGroup: { marginTop: '25px', display: 'flex', justifyContent: 'space-between', gap: '10px', },
  buttonSave: { flex: 1, padding: '15px', fontSize: '16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  buttonCancel: { flex: 1, padding: '15px', fontSize: '16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  hotkeyLabelSmall: { fontSize: '12px', opacity: 0.8, marginLeft: '5px', }
};

export default QuickSaleModal;
