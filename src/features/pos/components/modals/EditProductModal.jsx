// src/components/EditProductModal.jsx
import React, { useState, useEffect } from 'react';
import { arrayUnion } from 'firebase/firestore'; 
import { useProducts } from '../../../../hooks/useProducts'; 
import EditHistoryModal from './EditHistoryModal';
// 👇 Importamos el nuevo Picker
import CategoryPickerModal from './CategoryPickerModal';
// Importamos un icono para el botón
import { FolderEdit } from 'lucide-react';

function EditProductModal({ show, onClose, product }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  
  // Estados para Categoría
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [showHistory, setShowHistory] = useState(false);

  const { update, loading } = useProducts();

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setPrice(product.price || '');
      setCost(product.cost || '');
      setStock(product.stock || '');
      
      // Cargar datos de categoría actuales
      setCategoryId(product.department || ''); // Asumo que guardas el ID en 'department'
      setCategoryName(product.departmentName || 'Sin Categoría');

      if (product.codes && product.codes.length > 1) {
        setCode('Mixto'); 
      } else if (product.codes && product.codes.length === 1) {
        setCode(product.codes[0]); 
      } else {
        setCode(product.code || ''); 
      }
    }
  }, [product]);

  // Handler cuando seleccionas una nueva categoría desde el Picker
  const handleCategorySelect = (selectedCat) => {
    setCategoryId(selectedCat.id);
    setCategoryName(selectedCat.name); // O selectedCat.fullPath si prefieres la ruta completa
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    const newPrice = Number(price);
    const newCost = Number(cost);
    const newStock = Number(stock);

    const updates = {
      name,
      price: newPrice,
      cost: newCost,
      stock: newStock,
      department: categoryId, // Actualizamos ID
      departmentName: categoryName // Actualizamos Nombre para visualización rápida
    };

    // --- LÓGICA DE AUDITORÍA ---
    const changes = [];
    if (name !== product.name) changes.push(`Nombre: "${product.name}" ➔ "${name}"`);
    if (newPrice !== product.price) changes.push(`Precio: S/ ${product.price} ➔ S/ ${newPrice}`);
    if (newCost !== product.cost) changes.push(`Costo: S/ ${product.cost} ➔ S/ ${newCost}`);
    if (newStock !== product.stock) changes.push(`Stock (Manual): ${product.stock} ➔ ${newStock}`);
    
    // Auditoría de cambio de categoría
    if (categoryId !== product.department) {
       changes.push(`Categoría: "${product.departmentName || 'S/C'}" ➔ "${categoryName}"`);
    }
    
    if (code !== 'Mixto') {
      const oldCode = (product.codes && product.codes.length > 0) ? product.codes[0] : (product.code || '');
      if (code !== oldCode) {
           changes.push(`Código: ${oldCode} ➔ ${code}`);
           updates.code = code;
           updates.codes = [code];
      }
    }
    
    if (changes.length > 0) {
      updates.editLog = arrayUnion({
          date: new Date(),
          changes: changes
      });
    }
    // ---------------------------

    const success = await update(product.id, updates);

    if (success) {
      onClose();
    }
  };

  if (!show || !product) return null;

  return (
    <>
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <h2 style={{margin:0}}>Editar Producto</h2>
            <button 
                type="button" 
                onClick={() => setShowHistory(true)} 
                style={styles.historyBtn}
                title="Ver historial de cambios"
            >
                🕒 Historial
            </button>
          </div>

          <form onSubmit={handleSave} style={styles.form}>
            <div style={styles.group}>
              <label>Código:</label>
              <input 
                type="text" value={code} onChange={(e) => setCode(e.target.value)} style={styles.input}
                disabled={code === 'Mixto'} title={code === 'Mixto' ? "Los códigos mixtos se gestionan en Compras" : ""}
              />
            </div>
            
            <div style={styles.group}>
              <label>Nombre:</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={styles.input} required />
            </div>

            {/* 👇 NUEVO CAMPO: SELECCIÓN DE CATEGORÍA */}
            <div style={styles.group}>
               <label>Categoría:</label>
               <div style={{display:'flex', gap:'8px'}}>
                 <div style={styles.categoryDisplay}>
                    <span style={{fontWeight:'bold', color:'#334155'}}>{categoryName}</span>
                 </div>
                 <button 
                   type="button" 
                   onClick={() => setShowCategoryPicker(true)}
                   style={styles.btnChangeCat}
                   title="Cambiar Categoría"
                 >
                   <FolderEdit size={16} />
                 </button>
               </div>
            </div>
            
            <div style={{display:'flex', gap:'10px'}}>
              <div style={styles.group}>
                <label>Precio Venta:</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={styles.input} step="0.01" required />
              </div>
              <div style={styles.group}>
                <label>Costo:</label>
                <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} style={styles.input} step="0.01" required />
              </div>
            </div>

            <div style={styles.group}>
              <label>Stock (Ajuste Manual):</label>
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} style={styles.input} required />
              <small style={{color:'#666', fontSize:'11px'}}>Para ingresos normales, usa el botón "Ajustar" en la tabla.</small>
            </div>

            <div style={styles.actions}>
              <button type="button" onClick={onClose} style={styles.btnCancel}>Cancelar</button>
              <button type="submit" style={styles.btnSave} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <EditHistoryModal show={showHistory} onClose={() => setShowHistory(false)} product={product} />
      
      {/* 👇 MODAL DEL SELECTOR */}
      <CategoryPickerModal 
         show={showCategoryPicker} 
         onClose={() => setShowCategoryPicker(false)}
         onSelect={handleCategorySelect}
      />
    </>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modal: { background: 'white', padding: '25px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  group: { display: 'flex', flexDirection: 'column', gap: '5px' },
  input: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' },
  
  // Estilos nuevos para Categoría
  categoryDisplay: { flex: 1, padding: '8px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', display:'flex', alignItems:'center' },
  btnChangeCat: { padding: '0 12px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' },

  actions: { display: 'flex', gap: '10px', marginTop: '10px' },
  btnSave: { flex: 1, padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  btnCancel: { flex: 1, padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  historyBtn: { background: '#e9ecef', border: '1px solid #ccc', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#333' }
};

export default EditProductModal;