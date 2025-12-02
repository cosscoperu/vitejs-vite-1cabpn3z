import React, { useState } from 'react';
import toast from 'react-hot-toast';

function ClientInfoModal({ show, onClose, onConfirm, totalToPay }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    advance: '',
    isBagOpening: false,
    platform: 'whatsapp' // Valor por defecto
  });

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("El nombre es obligatorio");
    if (!formData.phone.trim()) return toast.error("El teléfono es obligatorio");
    
    const advanceVal = Number(formData.advance);
    if (advanceVal < 0) return toast.error("El adelanto no puede ser negativo");
    if (advanceVal > totalToPay) return toast.error("El adelanto no puede ser mayor al total");

    onConfirm({
      ...formData,
      advance: advanceVal
    });
    // Resetear formulario
    setFormData({ name: '', phone: '', address: '', advance: '', isBagOpening: false, platform: 'whatsapp' });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3>👤 Datos del Cliente & Origen</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} style={styles.body}>
          
          {/* SELECCIÓN DE PLATAFORMA (ORIGEN) */}
          <div style={{marginBottom: '10px'}}>
             <label style={{fontSize:'12px', fontWeight:'bold', color:'#555'}}>¿De dónde viene el pedido?</label>
             <div style={styles.platformGrid}>
                {['whatsapp', 'facebook', 'instagram', 'tiktok', 'web'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormData({...formData, platform: p})}
                    style={formData.platform === p ? {...styles.platBtn, ...styles.platBtnActive} : styles.platBtn}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
             </div>
          </div>

          <div style={styles.row}>
            <div style={styles.group}>
              <label>Nombre Completo *</label>
              <input 
                type="text" required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                style={styles.input} placeholder="Ej. María Pérez" autoFocus
              />
            </div>
            <div style={styles.group}>
              <label>Teléfono / WhatsApp *</label>
              <input 
                type="tel" required 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})}
                style={styles.input} placeholder="999 999 999" 
              />
            </div>
          </div>

          <div style={styles.group}>
            <label>Dirección de Envío *</label>
            <input 
              type="text" required 
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})}
              style={styles.input} placeholder="Av. Las Flores 123, Distrito..." 
            />
          </div>

          {/* Checkbox Apertura Bolsita */}
          <div style={styles.bagSection}>
            <label style={styles.bagLabel}>
              <input 
                type="checkbox" 
                checked={formData.isBagOpening} 
                onChange={e => setFormData({...formData, isBagOpening: e.target.checked})} 
                style={{width:'18px', height:'18px'}}
              />
              🛍️ ¿Es Apertura de Bolsita? (Live)
            </label>
          </div>

          <div style={styles.divider}></div>

          <div style={styles.advanceContainer}>
            <div style={{flex:1}}>
              <label style={{fontWeight:'bold'}}>Adelanto (Opcional)</label>
              <p style={{fontSize:'12px', color:'#666', margin:0}}>Si paga algo ahora.</p>
            </div>
            <div style={{flex:1, textAlign:'right'}}>
              <input 
                type="number" 
                value={formData.advance} 
                onChange={e => setFormData({...formData, advance: e.target.value})}
                style={styles.moneyInput} placeholder="0.00" min="0" step="0.10"
              />
            </div>
          </div>

          <div style={styles.summary}>
            <div>Total: <b>S/ {totalToPay.toFixed(2)}</b></div>
            <div>Saldo: <b style={{color: '#dc3545'}}>S/ {Math.max(0, totalToPay - Number(formData.advance)).toFixed(2)}</b></div>
          </div>

          <button type="submit" style={styles.confirmBtn}>GUARDAR PEDIDO</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modal: { background: 'white', width: '500px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', overflow:'hidden' },
  header: { background: '#f8f9fa', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' },
  body: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' },
  row: { display: 'flex', gap: '15px' },
  group: { flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '14px' },
  input: { padding: '10px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '14px' },
  
  // Estilos Plataforma
  platformGrid: { display: 'flex', gap: '8px', marginTop:'5px', flexWrap: 'wrap' },
  platBtn: { flex: 1, padding: '8px 5px', border: '1px solid #ddd', background: '#f9f9f9', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', color:'#666' },
  platBtnActive: { background: '#333', color: 'white', borderColor: '#333', fontWeight: 'bold' },

  bagSection: { background: '#fff3cd', padding: '10px', borderRadius: '5px', border: '1px solid #ffeeba' },
  bagLabel: { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', cursor: 'pointer', color: '#856404', fontSize:'13px' },
  divider: { height: '1px', background: '#eee', margin: '5px 0' },
  advanceContainer: { display: 'flex', alignItems: 'center', background: '#f8f9fa', padding: '15px', borderRadius: '8px' },
  moneyInput: { padding: '10px', fontSize: '18px', textAlign: 'right', width: '100%', border: '1px solid #28a745', borderRadius: '5px', fontWeight: 'bold', color: '#28a745' },
  summary: { display: 'flex', justifyContent: 'space-between', fontSize: '14px' },
  confirmBtn: { padding: '15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }
};

export default ClientInfoModal;