// src/components/EditHistoryModal.jsx
import React from 'react';

function EditHistoryModal({ show, onClose, product }) {
  if (!show || !product) return null;

  // Ordenamos: lo más reciente primero
  const logs = (product.editLog || []).sort((a, b) => {
    const dateA = a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date);
    const dateB = b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date);
    return dateB - dateA;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString('es-PE');
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3>Auditoría de Ediciones: {product.name}</h3>
          <button onClick={onClose} style={styles.closeBtn}>X</button>
        </div>
        
        <div style={styles.body}>
          {logs.length === 0 ? (
            <p style={{textAlign:'center', color:'#666'}}>Este producto no tiene cambios registrados.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Cambios Realizados</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={index}>
                    <td style={{...styles.td, width: '140px', verticalAlign: 'top'}}>
                      {formatDate(log.date)}
                    </td>
                    <td style={styles.td}>
                      <ul style={styles.changeList}>
                        {log.changes.map((change, i) => (
                          <li key={i} style={styles.changeItem}>
                            {change}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 },
  modal: { background: 'white', padding: '20px', borderRadius: '8px', width: '600px', maxHeight: '80vh', display:'flex', flexDirection:'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom:'1px solid #eee', paddingBottom:'10px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', fontWeight:'bold' },
  body: { overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px', borderBottom: '2px solid #eee', fontSize: '14px', backgroundColor: '#f9f9f9' },
  td: { padding: '10px', borderBottom: '1px solid #eee', fontSize: '13px', color: '#333' },
  changeList: { margin: 0, paddingLeft: '20px' },
  changeItem: { marginBottom: '4px' }
};

export default EditHistoryModal;