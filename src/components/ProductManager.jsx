import React, { useState, useMemo } from 'react';
// Asegúrate de que useProducts ahora devuelve searchProducts
import { useProducts } from '../hooks/useProducts';
import EditProductModal from './EditProductModal'; 
import AddStockModal from './AddStockModal';
import HistoryModal from './HistoryModal';

// ... (MANTÉN TUS ICONOS IGUAL QUE ANTES) ...
const IconSearch = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconKardex = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>;
const IconRefresh = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>;
const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
const IconAdjust = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>;

// ... (MANTÉN HELPER FECHA) ...
const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

function ProductManager() {
  // 👇 AQUÍ IMPORTAMOS searchProducts
  const { products, loading, remove, loadProducts, addMovement, searchProducts } = useProducts();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('TODOS');
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState(currentYear.toString());
  const [statusFilter, setStatusFilter] = useState('ALL'); 

  // Modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [productForStock, setProductForStock] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [productForHistory, setProductForHistory] = useState(null);

  // --- LÓGICA DE FILTRADO (SOLO FILTROS DE ESTADO Y FECHA) ---
  // NOTA: Quitamos el filtro de texto de aquí porque ahora lo maneja el Backend (searchProducts)
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      
      // 1. Filtro de Estado
      if (statusFilter === 'ZERO_STOCK') {
        if (product.stock > 0) return false;
      }
      if (statusFilter === 'SLOW_MOVING') {
        const now = new Date();
        const dateRef = product.createdAt && product.createdAt.toDate ? product.createdAt.toDate() : new Date();
        const diffDays = Math.ceil(Math.abs(now - dateRef) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30 || product.stock <= 0) return false;
      }

      // 2. Filtro por Fecha
      if (!product.createdAt) return filterMonth === 'TODOS';
      const date = product.createdAt.toDate ? product.createdAt.toDate() : new Date(product.createdAt);
      const month = (date.getMonth() + 1).toString();
      const year = date.getFullYear().toString();
      const monthMatch = filterMonth === 'TODOS' || month === filterMonth;
      const yearMatch = filterYear === 'TODOS' || year === filterYear;
      
      return monthMatch && yearMatch;
    });
  }, [products, filterMonth, filterYear, statusFilter]); // 👈 Quitamos searchTerm de dependencias

  // --- KPI CALCULATIONS ---
  const { totalCostValue, totalSaleValue, globalMarginPercent } = useMemo(() => {
    let costValue = 0; let saleValue = 0;
    products.forEach(p => {
      const cost = Number(p.cost) || 0; const price = Number(p.price) || 0; const stock = Number(p.stock) || 0;
      costValue += (cost * stock); saleValue += (price * stock);
    });
    let margin = 0; if (saleValue > 0) { margin = ((saleValue - costValue) / saleValue) * 100; }
    return { totalCostValue: costValue, totalSaleValue: saleValue, globalMarginPercent: margin };
  }, [products]);

  // Handlers
  const handleEdit = (product) => { setSelectedProduct(product); setIsEditModalOpen(true); };
  const handleCloseEditModal = () => { setIsEditModalOpen(false); setSelectedProduct(null); loadProducts(); };
  const handleOpenAddStock = (product) => { setProductForStock(product); setIsAddStockModalOpen(true); };
  const handleCloseAddStockModal = () => { setIsAddStockModalOpen(false); setProductForStock(null); loadProducts(); };
  const handleOpenHistory = (product) => { setProductForHistory(product); setIsHistoryModalOpen(true); };
  
  const handleManualRefresh = () => { loadProducts(); setSearchTerm(''); };

  // 👇 NUEVO HANDLER PARA BUSCAR AL DAR ENTER
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
        searchProducts(searchTerm);
    }
  };

  return (
    <div style={styles.pageBackground}>
      
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📦 Inventario General</h1>
          <p style={styles.subtitle}>Gestión de existencias y valoración de stock.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={handleManualRefresh} style={styles.btnRefresh} disabled={loading} title="Recargar datos">
                <IconRefresh />
                <span>{loading ? '...' : 'Actualizar'}</span>
            </button>
            <div style={styles.totalBadge}>Mostrando {filteredProducts.length} productos</div>
        </div>
      </div>

      {/* KPI REPORTES */}
      <div style={styles.kpiWrapper}>
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCardCost}>
            <span style={styles.kpiLabel}>Valor Costo</span>
            <span style={styles.kpiValue}>S/ {totalCostValue.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
          </div>
          <div style={styles.kpiCardSale}>
            <span style={styles.kpiLabel}>Valor Venta</span>
            <span style={styles.kpiValue}>S/ {totalSaleValue.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
          </div>
          <div style={styles.kpiCardMargin}>
            <span style={styles.kpiLabel}>Margen Global</span>
            <span style={styles.kpiValue}>{globalMarginPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={styles.toolbar}>
        <div style={styles.searchContainer}>
          <div style={styles.searchIconWrapper}><IconSearch /></div>
          {/* 👇 INPUT MODIFICADO PARA BUSCAR EN SERVIDOR */}
          <input 
            type="text" 
            placeholder="Buscar y presionar ENTER..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown} // 👈 DETECTA ENTER
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filtersWrapper}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={statusFilter === 'ALL' ? styles.select : styles.selectActive}>
            <option value="ALL">Estado: Todos</option>
            <option value="ZERO_STOCK">⚠️ Sin Stock</option>
            <option value="SLOW_MOVING">🐢 Sin Mov.</option>
          </select>

          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={styles.selectMonth}>
            <option value="TODOS">Mes: Todos</option>
            {/* ... tus opciones de meses ... */}
            <option value="11">Noviembre</option>
            <option value="12">Diciembre</option>
          </select>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={styles.selectYear}>
             <option value="TODOS">Año</option>
             <option value="2024">2024</option>
             <option value="2025">2025</option>
          </select>
        </div>
      </div>

      {/* DATA GRID */}
      <div style={styles.tableCard}>
        {loading && <div style={{padding:'40px', textAlign:'center', color:'#64748b'}}>Buscando en base de datos...</div>}
        
        {!loading && filteredProducts.length === 0 && (
          <div style={{padding:'50px', textAlign:'center', color:'#94a3b8'}}>
            <p>No se encontraron productos.</p>
            {searchTerm && <button onClick={() => { setSearchTerm(''); loadProducts(); }} style={styles.btnClearFilter}>Borrar búsqueda</button>}
          </div>
        )}

        {!loading && filteredProducts.length > 0 && (
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>PRODUCTO / SKU</th>
                <th style={styles.th}>CATEGORÍA</th>
                <th style={styles.th}>KARDEX</th>
                <th style={styles.th}>PRECIOS Y MARGEN</th>
                <th style={styles.th}>STOCK</th>
                <th style={styles.th}>VALORIZADO</th>
                <th style={{...styles.th, textAlign:'center', width:'160px'}}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const totalInv = (p.cost || 0) * (p.stock || 0);
                let stockColor = '#10b981'; let stockBg = '#ecfdf5';
                if (p.stock < 5) { stockColor = '#f59e0b'; stockBg = '#fffbeb'; } 
                if (p.stock <= 0) { stockColor = '#ef4444'; stockBg = '#fef2f2'; } 

                let marginPercent = 0; if (p.price > 0) marginPercent = ((p.price - (p.cost || 0)) / p.price) * 100;
                let marginColorText = '#10b981'; if (marginPercent < 30) marginColorText = '#f59e0b'; if (marginPercent <= 0) marginColorText = '#ef4444'; 

                return (
                  <tr key={p.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{display:'flex', flexDirection:'column'}}>
                        <span style={styles.prodName}>{p.name}</span>
                        <span style={styles.prodCode}>{p.codes && p.codes.length > 0 ? p.codes[0] : 'S/C'}</span>
                      </div>
                    </td>
                    <td style={styles.td}><span style={styles.deptBadge}>{p.departmentName || p.department || 'GENERAL'}</span></td>
                    <td style={styles.td}><button onClick={() => handleOpenHistory(p)} style={styles.btnKardex}><IconKardex /> <span style={{fontWeight:'700', fontSize:'11px'}}>HISTORIAL</span></button></td>
                    <td style={styles.td}>
                      <div style={{fontSize:'13px', lineHeight:'1.5'}}>
                        <div style={{color:'#059669', fontWeight:'bold'}}>V: {Number(p.price).toFixed(2)}</div>
                        <div style={{color:'#64748b', fontSize:'11px'}}>C: {Number(p.cost).toFixed(2)}</div>
                        <div style={{color: marginColorText, fontSize:'11px', fontWeight:'800', marginTop:'2px'}}>Mg: {marginPercent.toFixed(1)}%</div>
                      </div>
                    </td>
                    <td style={styles.td}><div style={{...styles.stockBadge, color: stockColor, background: stockBg}}>{p.stock}</div></td>
                    <td style={styles.td}><span style={{fontWeight:'bold', color:'#334155'}}>S/ {totalInv.toFixed(2)}</span></td>
                    <td style={styles.td}>
                      <div style={styles.actionsContainer}>
                        <button onClick={() => handleOpenAddStock(p)} style={styles.btnActionAdjust} title="Ajustar Stock"><IconAdjust /></button>
                        <button onClick={() => handleEdit(p)} style={styles.btnActionEdit} title="Editar"><IconEdit /></button>
                        <button onClick={() => remove(p.id)} style={styles.btnActionDelete} title="Eliminar"><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      
      <EditProductModal show={isEditModalOpen} onClose={handleCloseEditModal} product={selectedProduct} />
      <AddStockModal show={isAddStockModalOpen} onClose={handleCloseAddStockModal} product={productForStock} onAddMovement={addMovement} />
      <HistoryModal show={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} product={productForHistory} />
    </div>
  );
}

// ... (MANTÉN TUS ESTILOS IGUAL QUE ANTES) ...
const styles = {
  pageBackground: { width: '100%', minHeight: '100vh', backgroundColor: '#f0f9ff', padding: '30px 40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, fontSize: '26px', color: '#0f172a', fontWeight: '800' },
  subtitle: { margin: '5px 0 0 0', color: '#64748b', fontSize: '14px' },
  totalBadge: { background: '#e0f2fe', color: '#0369a1', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px' },
  kpiWrapper: { maxWidth: '850px', width: '100%' }, 
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' },
  kpiCardCost: { background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', borderRadius: '12px', padding: '12px 16px', color: 'white', boxShadow: '0 2px 5px rgba(79, 70, 229, 0.2)' },
  kpiCardSale: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '12px', padding: '12px 16px', color: 'white', boxShadow: '0 2px 5px rgba(16, 185, 129, 0.2)' },
  kpiCardMargin: { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '12px', padding: '12px 16px', color: 'white', boxShadow: '0 2px 5px rgba(245, 158, 11, 0.2)' },
  kpiLabel: { display: 'block', fontSize: '13px', opacity: 0.95, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' },
  kpiValue: { display: 'block', fontSize: '26px', fontWeight: '800', marginBottom: '0px', lineHeight: '1.1' },
  toolbar: { display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '20px' },
  searchContainer: { flex: 1, position: 'relative', maxWidth: '500px' },
  searchIconWrapper: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
  searchInput: { width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' },
  filtersWrapper: { display: 'flex', gap: '10px' },
  select: { padding: '0 15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '13px', cursor: 'pointer', outline: 'none', height: '100%', minWidth: '150px', fontWeight: '500' },
  selectActive: { padding: '0 15px', borderRadius: '10px', border: '1px solid #ef4444', background: '#fef2f2', color:'#ef4444', fontSize: '13px', cursor: 'pointer', outline: 'none', height: '100%', minWidth: '150px', fontWeight: 'bold' },
  selectMonth: { padding: '0 15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '13px', cursor: 'pointer', outline: 'none', height: '100%', minWidth: '140px' },
  selectYear: { padding: '0 15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontSize: '13px', cursor: 'pointer', outline: 'none', height: '100%', minWidth: '100px' },
  tableCard: { background: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  theadRow: { background: '#1e293b', borderBottom: '2px solid #0f172a' },
  th: { padding: '16px 20px', textAlign: 'left', fontSize: '12px', color: '#f8fafc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s', cursor: 'default' },
  td: { padding: '16px 20px', verticalAlign: 'middle', color: '#334155' },
  prodName: { display: 'block', fontWeight: '600', color: '#1e293b', marginBottom:'2px' },
  prodCode: { fontSize: '11px', color: '#64748b', background:'#f1f5f9', padding:'2px 6px', borderRadius:'4px', width:'fit-content' },
  deptBadge: { background: '#f8fafc', border:'1px solid #e2e8f0', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  btnKardex: { background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '8px', padding:'6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#0284c7', transition:'all 0.2s', boxShadow:'0 1px 2px rgba(0,0,0,0.05)' },
  stockBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' },
  actionsContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' },
  btnActionAdjust: { background: '#f97316', border: 'none', width: '36px', height: '36px', borderRadius: '8px', color: 'white', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(249, 115, 22, 0.3)', padding: '4px' },
  btnActionEdit: { background: '#3b82f6', border: 'none', width: '36px', height: '36px', borderRadius: '8px', color: 'white', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)', padding: '4px' },
  btnActionDelete: { background: '#ef4444', border: 'none', width: '36px', height: '36px', borderRadius: '8px', color: 'white', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.3)', padding: '4px' },
  btnClearFilter: { marginTop:'10px', padding:'8px 16px', background:'#3b82f6', color:'white', border:'none', borderRadius:'6px', cursor:'pointer' },
  btnRefresh: { display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', padding: '8px 16px', borderRadius: '10px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', outline: 'none' }
};

export default ProductManager;