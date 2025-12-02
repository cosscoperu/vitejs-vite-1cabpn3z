import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // <--- Importamos useNavigate
import { useProducts } from '../hooks/useProducts';
import toast from 'react-hot-toast';

import DepartmentManagerModal from '../components/DepartmentManagerModal';
import CategoryPickerModal from '../components/CategoryPickerModal';

function PurchasesPage() {
  const navigate = useNavigate(); // Hook para navegar
  const { add, loading } = useProducts();

  // --- ESTADOS ---
  const [nombre, setNombre] = useState('');
  const [selectedCategory, setSelectedCategory] = useState({ id: '', name: '', fullPath: '' });
  const [precio, setPrecio] = useState('');
  const [costo, setCosto] = useState('');
  const [stock, setStock] = useState(0);
  const [codes, setCodes] = useState([]);
  const [currentCode, setCurrentCode] = useState('');
  
  // Control de Modales
  const [isDeptManagerOpen, setIsDeptManagerOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const codeInputRef = useRef(null);

  // --- LÓGICA "SMART ESCAPE" (NUEVO) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Prioridad 1: Cerrar modales si están abiertos
        if (isPickerOpen) {
          setIsPickerOpen(false);
          return;
        }
        if (isDeptManagerOpen) {
          setIsDeptManagerOpen(false);
          return;
        }

        // Prioridad 2: Si no hay modales, SALIR del módulo (ir al Dashboard)
        // Opcional: Podrías poner un confirm() aquí si quieres evitar salidas accidentales
        navigate('/'); 
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPickerOpen, isDeptManagerOpen, navigate]);


  // --- AUTO-RELLENO ---
  useEffect(() => {
    if (codes.length === 2 && nombre === '') {
      setNombre('Prendas Varios');
      toast.success('Nombre auto-rellenado');
    }
  }, [codes.length, nombre]);

  const handleAddCode = (e) => {
    e.preventDefault(); 
    if (!currentCode) return; 
    if (codes.includes(currentCode)) { toast.error('Código duplicado.'); setCurrentCode(''); return; }
    setCodes(prev => [currentCode, ...prev]); 
    setCurrentCode(''); 
    codeInputRef.current.focus(); 
  };
  
  const handleRemoveCode = (code) => setCodes(prev => prev.filter(c => c !== code));

  const handleCategorySelect = (categoryObj) => {
    setSelectedCategory(categoryObj);
    setIsPickerOpen(false);
  };

  const handleExit = () => {
    navigate('/');
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!nombre || !precio || !costo) { toast.error('Faltan datos principales.'); return; }

    const newProduct = {
      name: nombre,
      department: selectedCategory.id || 'GENERAL', 
      departmentName: selectedCategory.fullPath || 'GENERAL', 
      price: Number(precio),
      cost: Number(costo), 
      stock: Number(stock),
      codes: codes, 
      createdAt: new Date(),
      history: [{ date: new Date(), amount: Number(stock), type: 'Inicial' }]
    };

    const success = await add(newProduct);

    if (success) {
      setNombre(''); setPrecio(''); setCosto(''); setStock(0); 
      setCodes([]); setCurrentCode(''); 
      setSelectedCategory({ id: '', name: '', fullPath: '' });
      toast.success("¡Producto guardado con éxito!");
    }
  };

  return (
    <div style={styles.pageBackground}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
          {/* Botón Atrás Visual */}
          <button onClick={handleExit} style={styles.btnBack} title="Salir al Dashboard (Esc)">
             ⬅
          </button>
          <div>
            <h1 style={styles.title}>✨ Nuevo Ingreso</h1>
            <p style={styles.subtitle}>Registra mercadería y alimenta tu stock.</p>
          </div>
        </div>
        
        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
           <div style={styles.headerBadge}>🛒 Compras</div>
           
           {/* BOTÓN SALIR (ESC) - NUEVO */}
           <button onClick={handleExit} style={styles.btnClose} title="Cerrar Módulo (Esc)">
             ✖
           </button>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.layout}>
          
          {/* --- CARD 1: CÓDIGOS --- */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.stepCircleOrange}>1</div>
              <h3 style={styles.cardTitle}>Identificación</h3>
            </div>
            
            <div style={styles.cardBody}>
              <label style={styles.label}>Código de Barra / SKU</label>
              <p style={styles.helperText}>Escanea el producto o escribe manualmente.</p>
              
              <form onSubmit={handleAddCode} style={styles.codeForm}>
                <div style={styles.inputGroup}>
                   <span style={styles.inputIcon}>🔎</span>
                   <input 
                      ref={codeInputRef} 
                      type="text" 
                      value={currentCode} 
                      onChange={(e) => setCurrentCode(e.target.value)} 
                      placeholder="Escanear..." 
                      style={styles.inputWithIcon} 
                   />
                </div>
              </form>

              <div style={styles.codesList}>
                {codes.length === 0 && (
                  <div style={styles.emptyCodes}>
                    <span>💤 Sin códigos escaneados</span>
                  </div>
                )}
                {codes.map(code => (
                  <div key={code} style={styles.codeItem}>
                    <span style={{fontWeight:'bold', color:'#0ea5e9'}}>#{code}</span>
                    <button type="button" onClick={() => handleRemoveCode(code)} style={styles.removeButton}>✖</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* --- CARD 2: DETALLES --- */}
          <form onSubmit={handleAddProduct} style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.stepCircleBlue}>2</div>
              <h3 style={styles.cardTitle}>Detalles del Producto</h3>
            </div>

            <div style={styles.cardBody}>
              
              {/* NOMBRE */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Nombre del Producto</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} style={styles.input} required placeholder="Ej: Polo Boxy Fit - Colección Verano" />
              </div>
              
              {/* CATEGORÍA */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Categoría / Departamento</label>
                <div style={{display: 'flex', gap: '12px'}}>
                  
                  <div 
                    style={selectedCategory.id ? styles.fakeSelectActive : styles.fakeSelect} 
                    onClick={() => setIsPickerOpen(true)}
                  >
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      <span style={{fontSize:'20px'}}>{selectedCategory.id ? '📂' : '✨'}</span>
                      <div style={{display:'flex', flexDirection:'column'}}>
                         <span style={selectedCategory.id ? styles.catTextActive : styles.catTextPlaceholder}>
                           {selectedCategory.id ? selectedCategory.fullPath : 'Elige una categoría...'}
                         </span>
                      </div>
                    </div>
                    <span style={{color:'#0ea5e9', fontWeight:'bold'}}>▼</span>
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={() => setIsDeptManagerOpen(true)}
                    style={styles.btnManage}
                    title="Gestionar categorías"
                  >
                    ✏️
                  </button>
                </div>
              </div>

              {/* PRECIOS Y STOCK */}
              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                   <label style={styles.label}>Precio Venta (S/)</label>
                   <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} style={styles.inputPrice} step="0.01" required placeholder="0.00" />
                </div>
                <div style={styles.formGroup}>
                   <label style={styles.label}>Costo Unit. (S/)</label>
                   <input type="number" value={costo} onChange={(e) => setCosto(e.target.value)} style={styles.inputCost} step="0.01" required placeholder="0.00" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Stock Inicial</label>
                  <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} style={styles.inputStock} required placeholder="0" />
                </div>
              </div>
              
              {/* BOTONES */}
              <div style={styles.btnGroup}>
                <button type="button" onClick={() => window.location.reload()} style={styles.btnCancel}>
                  Limpiar
                </button>
                <button type="submit" style={styles.btnSave} disabled={loading}>
                  {loading ? 'Guardando...' : '✅ GUARDAR INGRESO'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <CategoryPickerModal show={isPickerOpen} onClose={() => setIsPickerOpen(false)} onSelect={handleCategorySelect} />
      <DepartmentManagerModal show={isDeptManagerOpen} onClose={() => setIsDeptManagerOpen(false)} />
    </div>
  );
}

// --- ESTILOS ---
const styles = {
  pageBackground: { width: '100%', minHeight: '100vh', backgroundColor: '#f0f9ff' }, 
  
  header: { padding: '20px 40px', background: 'white', borderBottom: '2px solid #e0f2fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '24px', color: '#0f172a', fontWeight: '800', letterSpacing: '-0.5px' },
  subtitle: { margin: '5px 0 0 0', color: '#64748b', fontSize: '14px' },
  headerBadge: { background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)', color: 'white', padding: '6px 15px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(59, 130, 246, 0.3)' },
  
  // Botones de Navegación Header
  btnBack: { background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', transition: 'all 0.2s' },
  btnClose: { background: '#fee2e2', border: 'none', borderRadius: '50%', width: '35px', height: '35px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontWeight: 'bold', marginLeft: '15px', transition: 'all 0.2s' },

  content: { padding: '30px 40px' },
  layout: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', maxWidth: '1200px', margin: '0 auto' },
  
  card: { background: 'white', borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', border: '1px solid #e0f2fe', overflow: 'hidden', height: 'fit-content' },
  cardHeader: { padding: '20px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '15px', background: '#f8fafc' },
  cardTitle: { margin: 0, fontSize: '17px', fontWeight: '700', color: '#334155' },
  cardBody: { padding: '30px' },
  
  stepCircleOrange: { background: 'linear-gradient(135deg, #fbbf24 0%, #ea580c 100%)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(234, 88, 12, 0.3)' },
  stepCircleBlue: { background: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(14, 165, 233, 0.3)' },

  formGroup: { marginBottom: '25px' },
  gridRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  helperText: { fontSize: '12px', color: '#94a3b8', marginBottom: '10px' },
  
  input: { width: '100%', padding: '14px 18px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '15px', color: '#334155', outline: 'none', transition: 'all 0.2s', backgroundColor: '#f8fafc' },
  inputWithIcon: { width: '100%', padding: '14px 18px 14px 45px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '15px', outline: 'none', background: '#f8fafc' },
  
  inputPrice: { width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '16px', fontWeight:'bold', color: '#059669', outline: 'none', background: '#ecfdf5' },
  inputCost: { width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '16px', fontWeight:'bold', color: '#ef4444', outline: 'none', background: '#fef2f2' },
  inputStock: { width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '16px', fontWeight:'bold', color: '#3b82f6', outline: 'none', background: '#eff6ff' },

  inputGroup: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '15px', zIndex: 1, fontSize: '18px' },

  fakeSelect: { flex: 1, padding: '14px 20px', borderRadius: '12px', border: '2px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' },
  fakeSelectActive: { flex: 1, padding: '14px 20px', borderRadius: '12px', border: '2px solid #38bdf8', background: '#e0f2fe', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 10px rgba(56, 189, 248, 0.1)' },
  catTextPlaceholder: { color: '#94a3b8', fontSize: '15px', fontStyle: 'italic' },
  catTextActive: { color: '#0284c7', fontSize: '15px', fontWeight: '700' },
  
  btnManage: { width: '55px', borderRadius: '12px', border: 'none', background: '#fef3c7', color: '#d97706', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s', boxShadow: '0 2px 5px rgba(217, 119, 6, 0.1)' },
  
  btnGroup: { display: 'flex', gap: '15px', marginTop: '30px' },
  btnSave: { flex: 2, padding: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)', letterSpacing: '0.5px', textTransform: 'uppercase', transition: 'transform 0.1s' },
  btnCancel: { flex: 1, padding: '16px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },

  codesList: { marginTop: '20px', maxHeight: '250px', overflowY: 'auto', borderRadius: '12px', background: '#f1f5f9', padding: '5px' },
  emptyCodes: { padding: '25px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: '500' },
  codeItem: { display: 'flex', justifyContent: 'space-between', padding: '12px 15px', marginBottom: '5px', borderRadius: '8px', alignItems: 'center', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' },
  removeButton: { background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};

export default PurchasesPage;