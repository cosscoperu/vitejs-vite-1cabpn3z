import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { 
  collection, query, orderBy, where, limit, getDocs, onSnapshot 
} from 'firebase/firestore'; 
import { useCollection } from 'react-firebase-hooks/firestore';
import toast from 'react-hot-toast';

// Servicios
import { 
  createPendingOrder, 
  confirmPendingOrder, 
  cancelPendingOrder, 
  addToOpenBag,
  removeItemFromOrder, // Nuevo
  addPartialPayment   // Nuevo
} from '../../../services/orderService';

// Componentes
import ConfirmOrderModal from '../components/modals/ConfirmOrderModal';
import ClientInfoModal from '../components/modals/ClientInfoModal';

function OrdersPage() {
  const [viewMode, setViewMode] = useState('MANAGEMENT'); // 'MANAGEMENT' | 'LIVE'
  const [activeShiftId, setActiveShiftId] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);

  // POS State
  const [cart, setCart] = useState([]); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBagId, setSelectedBagId] = useState(null); 

  // UI States
  const [loadingAction, setLoadingAction] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedOrderToPay, setSelectedOrderToPay] = useState(null); 

  // F12 Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
        handleMainAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedBagId, viewMode]);

  // Caja
  useEffect(() => {
    const q = query(collection(db, 'shifts'), where('status', '==', 'open'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActiveShiftId(!snapshot.empty ? snapshot.docs[0].id : null);
      setLoadingShift(false);
    });
    return () => unsubscribe();
  }, []);

  // Data
  const pendingOrdersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50));
  const [ordersSnapshot, loadingOrders] = useCollection(pendingOrdersQuery);

  const selectedBagData = useMemo(() => {
    if (!selectedBagId || !ordersSnapshot) return null;
    const doc = ordersSnapshot.docs.find(d => d.id === selectedBagId);
    return doc ? { id: doc.id, ...doc.data() } : null;
  }, [selectedBagId, ordersSnapshot]);

  // Carrito Funciones
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const q = query(collection(db, 'products'), where("codes", "array-contains", searchQuery), limit(1));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        toast.error('Producto no encontrado');
      } else {
        const productDoc = querySnapshot.docs[0];
        addToCart({ ...productDoc.data(), id: productDoc.id });
      }
      setSearchQuery('');
    } catch (err) { toast.error('Error buscando'); }
  };

  const addToCart = (product) => {
    if (product.stock <= 0) { toast.error('Sin stock'); return; }
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      return [...prev, { ...product, quantity: 1, cost: Number(product.cost) || 0 }];
    });
  };

  const updateQuantity = (id, newQty) => {
    if (newQty < 1) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Number(newQty) } : item));
  };
  
  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));
  
  const subtotalNew = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);

  // --- LOGICA DE ELIMINAR ITEM (En Edición) ---
  const handleRemoveItem = async (index) => {
      if (!selectedBagId) return;
      if (!window.confirm("¿Quitar producto y devolver al stock?")) return;
      
      const toastId = toast.loading("Actualizando...");
      try {
          await removeItemFromOrder(selectedBagId, index);
          toast.success("Item removido", { id: toastId });
      } catch (error) {
          console.error(error);
          toast.error("Error", { id: toastId });
      }
  };

  // Main Action
  const handleMainAction = () => {
    if (cart.length === 0) return toast.error("Carrito vacío");
    if (selectedBagId) {
      handleAddToExistingBag();
    } else {
      setIsClientModalOpen(true);
    }
  };

  const handleAddToExistingBag = async () => {
    if(!selectedBagId) return;
    setLoadingAction(true);
    const toastId = toast.loading('Agregando...');
    try {
      await addToOpenBag(selectedBagId, cart, 0, activeShiftId);
      setCart([]);
      toast.success('Agregado', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Error', { id: toastId });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateOrder = async (clientData) => {
    if (clientData.advance > 0 && !activeShiftId) return toast.error("⛔ CAJA CERRADA");
    setIsClientModalOpen(false);
    setLoadingAction(true);
    const toastId = toast.loading('Creando...');
    try {
      await createPendingOrder(cart, subtotalNew, subtotalNew, clientData, activeShiftId);
      setCart([]);
      toast.success('Creado', { id: toastId });
    } catch (err) {
      toast.error('Error', { id: toastId });
    } finally {
      setLoadingAction(false);
    }
  };

  // --- LOGICA DE COBRO (Total o Parcial) ---
  const handlePaymentProcess = async (paymentMethod, amount, isPartial) => {
    if (!selectedOrderToPay || !activeShiftId) return;
    
    setLoadingAction(true);
    const toastId = toast.loading(isPartial ? 'Registrando abono...' : 'Cerrando venta...');
    const platform = selectedOrderToPay.orderInfo?.platform || 'whatsapp';

    try {
        if (isPartial) {
            // Abono Parcial
            await addPartialPayment(selectedOrderToPay.id, amount, paymentMethod, activeShiftId);
            toast.success(`Abono de S/ ${amount} registrado`, { id: toastId });
        } else {
            // Pago Total (Cierre)
            await confirmPendingOrder(
                selectedOrderToPay.id, selectedOrderToPay, paymentMethod, platform, activeShiftId, amount
            );
            toast.success('¡Venta Completada!', { id: toastId });
        }
        setIsConfirmModalOpen(false);
        setSelectedOrderToPay(null);
    } catch (err) {
        console.error(err);
        toast.error('Error en el proceso', { id: toastId });
    } finally {
        setLoadingAction(false);
    }
  };

  const selectBag = (id) => setSelectedBagId(selectedBagId === id ? null : id);

  const sendWhatsApp = (order) => {
      if (!order.orderInfo?.clientPhone) return toast.error("Sin teléfono");
      const itemsList = order.items.map(i => `• ${i.quantity} x ${i.name} (S/ ${(i.price * i.quantity).toFixed(2)})`).join('\n');
      const balance = order.total - (order.payment?.advance || 0);
      const text = `Hola *${order.orderInfo.clientName}*! 👋\nDesde *COSSCO* tu pedido:\n\n${itemsList}\n\n*Total: S/ ${order.total.toFixed(2)}*\nAbonado: S/ ${(order.payment?.advance || 0).toFixed(2)}\n------------------\n*SALDO: S/ ${balance.toFixed(2)}*`;
      window.open(`https://wa.me/51${order.orderInfo.clientPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isLive = viewMode === 'LIVE';
  const theme = {
    bg: isLive ? 'bg-slate-900' : 'bg-gray-50',
    text: isLive ? 'text-gray-100' : 'text-slate-800',
    cardBg: isLive ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
    headerBg: isLive ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200',
    tableHeader: isLive ? 'bg-slate-950 text-gray-400' : 'bg-gray-100 text-gray-500',
    tableRow: isLive ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-100 hover:bg-gray-50',
  };

  return (
    <div style={styles.container}>
      <header style={{...styles.header, backgroundColor: isLive ? '#111' : 'white'}}>
        <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
          <h1 style={{...styles.title, color: isLive ? 'white' : '#333'}}>
            {isLive ? '🎥 MODO LIVE' : '📦 Gestión Cossco'}
          </h1>
          <div style={styles.modeSwitchContainer}>
            <button 
              style={viewMode === 'MANAGEMENT' ? styles.modeBtnActive : styles.modeBtn}
              onClick={() => { setViewMode('MANAGEMENT'); setSelectedBagId(null); }}
            >
              🏢 Gestión
            </button>
            <button 
              style={viewMode === 'LIVE' ? {...styles.modeBtnActive, background:'#e91e63', color:'white'} : {...styles.modeBtn, color: isLive ? '#888' : '#666'}}
              onClick={() => { setViewMode('LIVE'); setSelectedBagId(null); }}
            >
              🎥 Live
            </button>
          </div>
        </div>
        <div style={{padding: '5px 12px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', backgroundColor: activeShiftId ? '#2ecc71' : '#e74c3c', color: 'white'}}>
            {activeShiftId ? 'CAJA ABIERTA' : 'CAJA CERRADA'}
        </div>
      </header>
      
      <div style={styles.content}>
        <div style={styles.layout}>
          {/* LEFT: WORKSPACE */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '15px', overflow: 'hidden'}}>
            
            {/* PANEL DE EDICIÓN */}
            {selectedBagId && selectedBagData && (
              <div style={styles.historyPanel}>
                <div style={styles.historyHeader}>
                   <span>📝 EDITANDO: <b>{selectedBagData.orderInfo.clientName}</b></span>
                   <button onClick={() => setSelectedBagId(null)} style={styles.closeHistoryBtn}>Terminar</button>
                </div>
                <div style={styles.historyList}>
                  {selectedBagData.items.map((item, idx) => (
                    <div key={idx} style={styles.historyItem}>
                      <span style={{flex:1}}>{item.name}</span>
                      <span style={{width:'40px'}}>x{item.quantity}</span>
                      <span style={{width:'60px'}}>S/ {(item.price * item.quantity).toFixed(2)}</span>
                      {/* BOTÓN QUITAR ITEM */}
                      <button 
                         onClick={() => handleRemoveItem(idx)}
                         style={{background:'none', border:'none', cursor:'pointer', marginLeft:'5px'}} 
                         title="Quitar y devolver stock"
                      >
                         🗑️
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{textAlign:'right', fontSize:'12px', marginTop:'5px', fontWeight:'bold', color:'#856404'}}>
                    Total en orden: S/ {selectedBagData.total.toFixed(2)}
                </div>
              </div>
            )}

            {/* POS */}
            <div style={styles.posContainer}>
              <div style={styles.ticketSide}>
                   <form onSubmit={handleSearch} style={styles.searchBar}>
                      <input 
                        type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
                        placeholder={selectedBagId ? "Escanea para AGREGAR..." : "Escanea producto..."}
                        style={{...styles.searchInput, borderColor: selectedBagId ? '#e91e63' : '#dfe1e5'}} autoFocus 
                      />
                   </form>
                   <div style={styles.ticketItems}>
                      {cart.map(item => (
                          <div key={item.id} style={styles.ticketItem}>
                              <div style={{flex:3}}>
                                  <div style={{fontWeight:'bold', color: '#333'}}>{item.name}</div>
                                  <div style={{fontSize:'12px', color:'#888'}}>S/ {item.price.toFixed(2)}</div>
                              </div>
                              <input type="number" value={item.quantity} onChange={(e)=>updateQuantity(item.id, e.target.value)} style={styles.quantityInput} />
                              <div style={{flex:1, textAlign:'right', fontWeight:'bold'}}>S/ {(item.price * item.quantity).toFixed(2)}</div>
                              <button onClick={()=>removeFromCart(item.id)} style={styles.deleteButton}>✕</button>
                          </div>
                      ))}
                      {cart.length === 0 && (
                        <div style={styles.emptyCart}>
                          <span style={{fontSize:'24px', opacity:0.3}}>➕</span>
                          <span>{selectedBagId ? 'Escanea para agregar más' : 'Carrito Vacío'}</span>
                        </div>
                      )}
                   </div>
              </div>

              <div style={styles.summarySide}>
                <div style={styles.summaryLine}>
                  <span>Total Nuevos:</span>
                  <span style={{fontSize:'20px', fontWeight:'bold', color: '#2c3e50'}}>S/ {subtotalNew.toFixed(2)}</span>
                </div>
                <button 
                  style={{...styles.endSaleButton, backgroundColor: selectedBagId ? '#e91e63' : '#3498db', opacity: (cart.length === 0 || loadingAction) ? 0.5 : 1}} 
                  disabled={cart.length === 0 || loadingAction}
                  onClick={handleMainAction}
                >
                  {loadingAction ? '...' : selectedBagId ? `AGREGAR (+ S/ ${subtotalNew})` : 'CREAR PEDIDO (F12)'}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: LIST */}
          <div style={styles.listContainer}>
            <div style={{padding:'12px 15px', borderBottom:'1px solid #eee', background: isLive ? '#222' : '#f8f9fa', color: isLive ? 'white' : '#333'}}>
               <h3 style={{margin:0, fontSize:'14px', textTransform:'uppercase'}}>
                 {isLive ? '⚡ Bolsitas Live' : '📋 Pedidos Web / Tienda'}
               </h3>
            </div>
            
            <div style={{overflowY: 'auto', flex: 1, backgroundColor: isLive ? '#111' : 'white'}}>
              <table style={styles.table}>
                <thead style={{background: isLive ? '#1a1a1a' : '#f8f9fa'}}>
                  <tr>
                    <th style={{...styles.th, color: isLive ? '#888' : '#666'}}>Cliente</th>
                    <th style={{...styles.th, color: isLive ? '#888' : '#666'}}>Saldo</th>
                    <th style={{...styles.th, color: isLive ? '#888' : '#666', textAlign:'right'}}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersSnapshot?.docs
                    .filter(doc => {
                        const data = doc.data();
                        // FILTRO ESTRICTO: Si es Live, solo muestra BagOpening. Si es Gestión, solo muestra No-BagOpening.
                        if (viewMode === 'LIVE') return data.orderInfo?.isBagOpening === true && data.status === 'PENDING';
                        return data.orderInfo?.isBagOpening !== true && data.status === 'PENDING';
                    })
                    .map((doc) => {
                    const order = doc.data();
                    const isSelected = selectedBagId === doc.id;
                    const balance = order.total - (order.payment?.advance || 0);

                    return (
                      <tr key={doc.id} style={{
                          ...styles.tr, 
                          backgroundColor: isSelected ? (isLive ? '#333' : '#e3f2fd') : (isLive ? 'transparent' : 'white'),
                          borderLeft: isSelected ? '4px solid #e91e63' : '4px solid transparent',
                          borderBottom: isLive ? '1px solid #333' : '1px solid #eee'
                      }}>
                        <td style={{...styles.td, color: isLive ? '#eee' : '#333'}}>
                          <div style={{fontWeight:'bold', fontSize:'13px'}}>
                             {order.orderInfo?.clientName}
                             <span style={styles.platformTag}>{order.orderInfo?.platform}</span>
                          </div>
                          <div style={{fontSize:'11px', color: isLive ? '#888' : '#666'}}>
                             {order.items.length} items • {order.createdAt?.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                          </div>
                        </td>
                        <td style={styles.td}>
                           <div style={{color: balance <= 0.1 ? '#2ecc71' : (isLive ? '#ff5252' : '#c0392b'), fontWeight:'bold', fontSize:'12px'}}>
                             {balance <= 0.1 ? 'PAGADO' : `Falta S/ ${balance.toFixed(2)}`}
                           </div>
                           {order.payment?.advance > 0 && <div style={{fontSize:'10px', color:'#2ecc71'}}>Abono: {order.payment.advance.toFixed(2)}</div>}
                        </td>
                        <td style={styles.td}>
                          <div style={{display:'flex', gap:'5px', justifyContent:'flex-end'}}>
                            <button onClick={() => selectBag(doc.id)} style={isSelected ? {...styles.btnAction, background:'#e91e63'} : {...styles.btnAction, background:'#ccc'}}>
                                ✏️
                            </button>
                            <button onClick={() => sendWhatsApp(order)} style={{...styles.btnAction, background:'#25D366'}}>
                                📱
                            </button>
                            <button 
                                style={{...styles.btnAction, background: activeShiftId ? '#2ecc71' : '#555'}} 
                                onClick={() => { 
                                  if(activeShiftId) { setSelectedOrderToPay({...order, id: doc.id}); setIsConfirmModalOpen(true); } 
                                  else { toast.error("Caja Cerrada"); }
                                }}
                            >
                                💰
                            </button>
                            <button style={{...styles.btnAction, background:'#ff5252'}} onClick={() => { if(window.confirm('¿Borrar?')) cancelPendingOrder(doc.id, order.items); }}>
                                ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ClientInfoModal 
        show={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onConfirm={handleCreateOrder} totalToPay={subtotalNew} 
      />
      <ConfirmOrderModal
        show={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} order={selectedOrderToPay} onConfirm={handlePaymentProcess}
      />
    </div>
  );
}

const styles = {
  container: { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5', fontFamily: 'Inter, system-ui, sans-serif' },
  header: { padding: '10px 20px', borderBottom: '1px solid #ddd', display:'flex', justifyContent:'space-between', alignItems:'center', transition: '0.3s', height: '55px' },
  title: { margin: 0, fontSize: '18px', fontWeight: '800' },
  modeSwitchContainer: { display:'flex', background:'#eee', borderRadius:'15px', padding:'3px', marginLeft:'20px' },
  modeBtn: { padding:'5px 12px', border:'none', background:'none', cursor:'pointer', borderRadius:'12px', fontWeight:'600', fontSize:'12px', color: '#777' },
  modeBtnActive: { padding:'5px 12px', border:'none', background:'white', cursor:'pointer', borderRadius:'12px', fontWeight:'bold', fontSize:'12px', boxShadow:'0 2px 4px rgba(0,0,0,0.1)', color: '#333' },
  content: { padding: '15px', flex: 1, overflow: 'hidden' },
  layout: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px', height: '100%' },
  
  historyPanel: { backgroundColor: '#fff3cd', borderRadius: '10px', padding: '15px', border: '1px solid #ffeeba', display: 'flex', flexDirection: 'column', maxHeight: '200px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  historyHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', fontSize:'13px', color:'#856404' },
  historyList: { overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:'5px', paddingRight:'5px' },
  historyItem: { display:'flex', justifyContent:'space-between', fontSize:'12px', borderBottom:'1px dashed #e6dbb9', paddingBottom:'4px', alignItems:'center' },
  closeHistoryBtn: { background:'white', border:'1px solid #d6d6d6', borderRadius:'4px', cursor:'pointer', fontSize:'10px', padding:'2px 8px' },

  posContainer: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e1e4e8' },
  ticketSide: { flex: 1, padding: '15px', overflowY: 'auto' },
  summarySide: { padding: '15px', backgroundColor: '#fafbfc', borderTop: '1px solid #eee' },
  searchBar: { display: 'flex', marginBottom: '10px' },
  searchInput: { flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid #dfe1e5', fontSize: '14px', outline:'none' },
  ticketItems: { display: 'flex', flexDirection: 'column', gap: '0' },
  ticketItem: { display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f4f4f4' },
  quantityInput: { width: '40px', padding: '5px', textAlign: 'center', borderRadius: '6px', border: '1px solid #dfe1e5', margin:'0 10px', fontWeight:'bold' },
  deleteButton: { background: 'none', border: 'none', color: '#ff5252', cursor: 'pointer', fontSize: '16px' },
  emptyCart: { textAlign:'center', color:'#b0b8c4', marginTop:'30px', fontWeight:'500', display:'flex', flexDirection:'column', gap:'5px', fontSize:'12px' },
  summaryLine: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  endSaleButton: { width: '100%', padding: '14px', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 3px 6px rgba(0,0,0,0.1)' },
  listContainer: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e1e4e8' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize:'11px', textTransform:'uppercase', fontWeight: '700' },
  tr: { transition: '0.2s' },
  td: { padding: '10px 12px', verticalAlign: 'middle' },
  btnAction: { border:'none', color:'white', padding:'5px 8px', borderRadius:'4px', cursor:'pointer', fontSize:'12px', fontWeight:'600' },
  platformTag: { fontSize:'9px', background:'#eee', color:'#555', padding:'1px 4px', borderRadius:'3px', marginLeft:'5px', textTransform:'uppercase' }
};

export default OrdersPage;