import React, { useState, useMemo, useRef, useEffect } from 'react';
import { db } from '../../../../firebase/config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useSales } from '../../../../hooks/useSales';
import { useShifts } from '../../../../hooks/useShifts';

// Iconos modernos
import { 
  Search, Trash2, Plus, Minus, Edit2, FileText, 
  Lock, Unlock, DollarSign, ShoppingCart, 
  CreditCard, Archive, RefreshCcw, XCircle 
} from 'lucide-react';

// Modales y Componentes (siguen aún en src/components)
import PaymentModal from '../modals/PaymentModal';
import QuickSaleModal from '../modals/QuickSaleModal';
import GlobalDiscountModal from '../modals/GlobalDiscountModal';
import DepartmentSelectorModal from '../modals/DepartmentSelectorModal';
import DailySalesModal from '../modals/DailySalesModal';
import OpenRegisterModal from '../modals/OpenRegisterModal';
import CloseRegisterModal from '../modals/CloseRegisterModal';
import ExpenseModal from '../../../../components/ExpenseModal';
// 👇 IMPORTAMOS EL TICKET DE LUJO
import LuxuryTicket from '../../../../components/LuxuryTicket';

import { generateReceipt } from '../../../../utils/ticketGenerator'; // Opcional si usas el de lujo
import { sendWhatsAppTicket } from '../../../../utils/whatsappGenerator'; // Opcional
import useHotkeys from '../../../../hooks/useHotkeys';
import toast from 'react-hot-toast';

function PosInterface({ cart, onCartChange, onSaleComplete, isActive, storeConfig }) {
  
  const currencySymbol = storeConfig?.currency || 'S/';
  const safeCart = Array.isArray(cart) ? cart : [];
  const [searchQuery, setSearchQuery] = useState('');
  const [localError, setLocalError] = useState(null);
  
  const { processSale, loading: loadingSale } = useSales();
  const { isShiftOpen, currentShift, openRegister, closeRegister, loading: loadingShift, refreshShift } = useShifts();
  
  // Modales
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isQuickSaleModalOpen, setIsQuickSaleModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDailySalesOpen, setIsDailySalesOpen] = useState(false);
  const [isOpenRegisterOpen, setIsOpenRegisterOpen] = useState(false);
  const [isCloseRegisterOpen, setIsCloseRegisterOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // 👇 ESTADO PARA EL TICKET DE LUJO
  const [saleForTicket, setSaleForTicket] = useState(null);

  const [editingPriceId, setEditingPriceId] = useState(null);
  const [globalDiscount, setGlobalDiscount] = useState(0);

  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isActive && !loadingShift && !isShiftOpen) {
      setIsOpenRegisterOpen(true);
    }
  }, [isActive, loadingShift, isShiftOpen]);

  useEffect(() => { if (safeCart.length === 0) setGlobalDiscount(0); }, [safeCart]);

  const returnFocusToSearch = () => {
    if (searchInputRef.current && isShiftOpen) searchInputRef.current.focus();
  };

  useEffect(() => {
    // Evitamos robar el foco si el Ticket de Lujo está abierto (saleForTicket)
    if (isActive && isShiftOpen && !isPaymentModalOpen && !isQuickSaleModalOpen && !isDiscountModalOpen && !isDeptModalOpen && !isCloseRegisterOpen && !isOpenRegisterOpen && !isDailySalesOpen && !isExpenseModalOpen && !saleForTicket) {
      setTimeout(returnFocusToSearch, 100);
    }
  }, [isActive, isShiftOpen, isPaymentModalOpen, isQuickSaleModalOpen, isDiscountModalOpen, isDeptModalOpen, isCloseRegisterOpen, isOpenRegisterOpen, isDailySalesOpen, isExpenseModalOpen, saleForTicket]);

  const handleOpenRegister = async (amount) => {
    const success = await openRegister(amount);
    if (success) {
      setIsOpenRegisterOpen(false);
      returnFocusToSearch();
    }
  };

  const handlePreCloseRegister = async () => {
      await refreshShift(); 
      setIsCloseRegisterOpen(true);
  };

  const handleCloseRegister = async (data) => {
    const success = await closeRegister(data);
    if (success) {
      setIsCloseRegisterOpen(false);
      onCartChange([]); 
      setGlobalDiscount(0);
    }
  };

  const checkLock = () => {
    if (!isShiftOpen) {
        toast.error("⛔ CAJA CERRADA.");
        setIsOpenRegisterOpen(true);
        return true; 
    }
    return false; 
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (checkLock()) return;
    
    const queryValue = searchInputRef.current ? searchInputRef.current.value : '';
    if (!queryValue) return;
    setLocalError(null);
    try {
      let q = query(collection(db, 'products'), where("codes", "array-contains", queryValue), limit(1));
      let querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) { 
          q = query(collection(db, 'products'), where("code", "==", queryValue), limit(1)); 
          querySnapshot = await getDocs(q); 
      }
      
      if (querySnapshot.empty) { 
          toast.error('No encontrado.'); 
          setLocalError('No encontrado.'); 
      } else { 
          const productData = { ...querySnapshot.docs[0].data(), id: querySnapshot.docs[0].id }; 
          addToCart(productData); 
      }
      setSearchQuery(''); 
      if (searchInputRef.current) searchInputRef.current.value = ''; 
      returnFocusToSearch();
    } catch (err) { toast.error('Error al buscar.'); }
  };

  const addToCart = (product) => {
    if (checkLock()) return;
    if (product.id && !product.id.startsWith('RAPIDO-')) { 
        if (product.stock <= 0) { toast.error('Sin stock.'); return; } 
    }
    
    const existingItem = safeCart.find(item => item.id === product.id);
    if (existingItem) {
      const newCart = safeCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      onCartChange(newCart);
    } else {
      const newItem = { 
          ...product, 
          id: product.id || `RAPIDO-${Date.now()}`, 
          quantity: 1, 
          cost: product.cost || 0, 
          originalPrice: product.price, 
          discount: 0, 
          discountPercent: 0, 
          stock: product.stock || 999 
      };
      onCartChange([...safeCart, newItem]);
    }
  };
  
  const removeFromCart = (productId) => { if (checkLock()) return; onCartChange(safeCart.filter(item => item.id !== productId)); };

  const clearCart = () => {
    if (safeCart.length === 0) return;
    toast((t) => (
      <div className="flex items-center gap-3">
        <span>¿Vaciar ticket?</span>
        <button className="px-3 py-1 bg-red-500 text-white rounded text-sm font-bold hover:bg-red-600" onClick={() => { onCartChange([]); setGlobalDiscount(0); toast.dismiss(t.id); returnFocusToSearch(); }}>Sí</button>
        <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300" onClick={() => toast.dismiss(t.id)}>No</button>
      </div>
    ), { duration: 4000, icon: '🗑️' });
  };

  const handleDiscountChange = (itemId, value, type) => {
    if (checkLock()) return;
    const item = safeCart.find(i => i.id === itemId); if (!item) return;
    let discount = 0; let discountPercent = 0;
    const price = item.price; const qty = item.quantity;
    const totalItemPrice = price * qty;
    if (totalItemPrice === 0) { discount = 0; discountPercent = 0; } 
    else if (type === 'percent') { discountPercent = parseFloat(value) || 0; discount = (totalItemPrice * (discountPercent / 100)); } 
    else { discount = parseFloat(value) || 0; if (discount > totalItemPrice) { discount = totalItemPrice; toast.error("Excede el total."); } discountPercent = (discount / totalItemPrice) * 100; }
    onCartChange(safeCart.map(i => { if (i.id === itemId) { return { ...i, discount: Math.max(0, parseFloat(discount.toFixed(2))), discountPercent: Math.max(0, parseFloat(discountPercent.toFixed(2))) }; } return i; }));
  };

  const handlePriceEdit = (itemId, newPrice) => {
    if (checkLock()) return;
    const price = parseFloat(newPrice) || 0;
    onCartChange(safeCart.map(i => { if (i.id === itemId) { return { ...i, price: price, discount: 0, discountPercent: 0 }; } return i; }));
    setEditingPriceId(null); returnFocusToSearch();
  };

  const updateQuantity = (productId, newQuantity) => {
    if (checkLock()) return;
    const qty = Number(newQuantity);
    const productInCart = safeCart.find(item => item.id === productId);
    if (productInCart.id && !productInCart.id.startsWith('RAPIDO-') && qty > productInCart.stock) { toast.error('Stock insuficiente.'); return; }
    if (qty <= 0) { removeFromCart(productId); } 
    else { onCartChange(safeCart.map(item => item.id === productId ? { ...item, quantity: qty, discount: 0, discountPercent: 0 } : item)); }
  };

  const { subtotal, itemDiscounts, total, totalItems } = useMemo(() => {
    let subtotal = 0; let itemDiscounts = 0; let totalItems = 0;
    safeCart.forEach(item => { 
        subtotal += (item.price * item.quantity); 
        itemDiscounts += (item.discount || 0);
        totalItems += item.quantity;
    });
    const totalBeforeGlobal = subtotal - itemDiscounts;
    const finalGlobalDiscount = Math.min(globalDiscount, totalBeforeGlobal);
    const total = Math.max(0, totalBeforeGlobal - finalGlobalDiscount);
    return { subtotal, itemDiscounts, total, totalItems };
  }, [safeCart, globalDiscount]);

  // --- CONFIRMACIÓN DE PAGO (Aquí integramos el Ticket de Lujo) ---
  const handlePaymentConfirmation = async (paymentDetails) => {
    if (checkLock()) return;
    const totalDiscounts = itemDiscounts + globalDiscount;
    
    const saleData = { 
        subtotal, itemDiscounts, globalDiscount, totalDiscounts, total, totalItems,
        payment: paymentDetails,
        shiftId: currentShift?.id,
        currency: currencySymbol 
    };

    // 1. Procesamos la venta en Firebase
    const result = await processSale(saleData, safeCart);

    if (result && result.success) {
      // 2. Preparamos los datos para el Ticket de Lujo
      const saleForTicketData = { 
        ...saleData, 
        id: result.id, 
        items: [...safeCart], // Clonamos el carrito actual
        createdAt: new Date(),
        customerName: paymentDetails.clientName || 'Cliente',
        customerPhone: paymentDetails.phone || '',
        // Lógica simple: Si es 'CREDITO' o paga parcial, es tipo 'BOLSITA'
        type: (paymentDetails.method === 'CREDITO' || (paymentDetails.amountPaid < total)) ? 'BOLSITA' : 'VENTA',
        deposit: paymentDetails.amountPaid || total // Cuánto pagó realmente
      };

      // 3. Mostramos el Ticket de Lujo (esto reemplaza al toast simple)
      setSaleForTicket(saleForTicketData);
      
      // 4. Limpieza interna
      onSaleComplete(); // Esto probablemente limpia el carrito en el padre
      setGlobalDiscount(0);
      setIsPaymentModalOpen(false); 
      
      // 5. Refrescamos caja
      await refreshShift();
    }
  };
  
  const openPaymentModal = () => { if (checkLock()) return; if (loadingSale) return; if (safeCart.length === 0) { toast("Agrega productos", {icon:'🛒'}); return; } setIsPaymentModalOpen(true); }
  
  useHotkeys({ 'F12': () => openPaymentModal() }, [safeCart, loadingSale, isPaymentModalOpen, isActive, isShiftOpen], isActive && isShiftOpen && !isPaymentModalOpen && !isQuickSaleModalOpen && !isDiscountModalOpen && !isDeptModalOpen && !isCloseRegisterOpen && !isOpenRegisterOpen && !isDailySalesOpen && !isExpenseModalOpen); 

  const handleClosePaymentModal = () => { setIsPaymentModalOpen(false); returnFocusToSearch(); }
  const handleCloseQuickSaleModal = () => { setIsQuickSaleModalOpen(false); returnFocusToSearch(); }
  const handleCloseDiscountModal = () => { setIsDiscountModalOpen(false); returnFocusToSearch(); }
  const handleCloseDeptModal = () => { setIsDeptModalOpen(false); returnFocusToSearch(); }
  const handleCloseDailySales = () => { setIsDailySalesOpen(false); returnFocusToSearch(); }
  const handleCloseOpenRegister = () => { setIsOpenRegisterOpen(false); returnFocusToSearch(); }
  const handleCloseCloseRegister = () => { setIsCloseRegisterOpen(false); returnFocusToSearch(); }
  const handleCloseExpenseModal = () => { setIsExpenseModalOpen(false); returnFocusToSearch(); }

  const handleSelectProductFromDept = (product) => { addToCart(product); handleCloseDeptModal(); };

  // Handler para cerrar el Ticket de Lujo
  const handleCloseLuxuryTicket = () => {
    setSaleForTicket(null);
    returnFocusToSearch();
  };

  return (
    <div className="flex h-full w-full bg-slate-50 font-sans">
      {/* --- SECCIÓN IZQUIERDA: TICKET Y PRODUCTOS --- */}
      <div className="flex-1 flex flex-col border-r border-slate-200">
        
        {/* Barra de Búsqueda y Herramientas */}
        <div className="p-3 bg-white border-b border-slate-200 shadow-sm flex gap-2">
          <form onSubmit={handleSearch} className="flex-1 flex relative">
            <input 
              ref={searchInputRef} 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Escanear código o buscar..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition-all text-slate-700 font-medium"
              autoFocus 
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </form>
          
          {/* Botones de Acción Rápida */}
          <div className="flex gap-1">
            <button type="button" onClick={() => { if(!checkLock()) setIsQuickSaleModalOpen(true) }} className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Venta Rápida / Manual"><Plus size={20} /></button>
            <button type="button" onClick={() => { if(!checkLock()) setIsDeptModalOpen(true) }} className="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors" title="Departamentos"><Archive size={20} /></button>
            <button type="button" onClick={clearCart} className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Limpiar Todo"><Trash2 size={20} /></button>
          </div>
        </div>

        {/* Mensaje de Error Local */}
        {localError && <div className="bg-red-100 text-red-700 px-4 py-2 text-sm font-medium text-center animate-pulse">{localError}</div>}
        
        {/* Encabezado de la Tabla */}
        <div className="flex items-center px-4 py-2 bg-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
          <div className="flex-[3]">Producto</div>
          <div className="flex-1 text-center">Precio</div>
          <div className="flex-[1.4] text-center">Cant.</div>
          <div className="flex-[1.2] text-center">Desc %</div>
          <div className="flex-[1.2] text-center">Desc {currencySymbol}</div>
          <div className="flex-[1.5] text-right pr-2">Total</div>
          <div className="w-8"></div>
        </div>
        
        {/* Lista de Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {!isShiftOpen ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 opacity-70">
              <Lock size={48} className="text-red-300 mb-2" />
              <p className="text-lg font-bold text-red-400">Caja Cerrada</p>
              <p className="text-sm">Abre turno para comenzar a vender</p>
            </div>
          ) : safeCart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3">
              <ShoppingCart size={64} strokeWidth={1.5} />
              <p className="text-lg font-medium">El ticket está vacío</p>
              <p className="text-sm">Escanea un producto para empezar</p>
            </div>
          ) : (
            safeCart.map(item => {
              const isEditingPrice = editingPriceId === item.id;
              const itemSubtotal = (item.price * item.quantity) - (item.discount || 0);
              
              return (
                <div key={item.id} className="flex items-center px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                  {/* Nombre y Código */}
                  <div className="flex-[3] overflow-hidden pr-2">
                    <div className="font-bold text-slate-800 truncate text-sm">{item.name}</div>
                    {!item.id.startsWith('RAPIDO-') && (
                      <div className="text-[10px] text-slate-400 font-mono">{item.codes ? item.codes[0] : 'N/A'}</div>
                    )}
                  </div>

                  {/* Precio Unitario */}
                  <div className="flex-1 flex justify-center">
                    {isEditingPrice ? ( 
                      <input 
                        type="number" 
                        defaultValue={item.price.toFixed(2)} 
                        className="w-16 px-1 py-0.5 text-center border border-blue-400 rounded text-sm focus:outline-none"
                        autoFocus 
                        onBlur={(e) => handlePriceEdit(item.id, e.target.value)} 
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} 
                      /> 
                    ) : ( 
                      <div onClick={() => setEditingPriceId(item.id)} className="cursor-pointer flex items-center gap-1 group/price"> 
                        <span className="text-sm font-medium text-slate-700">{item.price.toFixed(2)}</span>
                        <Edit2 size={10} className="text-blue-400 opacity-0 group-hover/price:opacity-100 transition-opacity" /> 
                      </div> 
                    )}
                  </div>

                  {/* Cantidad */}
                  <div className="flex-[1.4] flex items-center justify-center gap-1">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 transition-colors"><Minus size={12} /></button>
                    <input 
                      type="number" 
                      value={item.quantity} 
                      onChange={(e) => updateQuantity(item.id, e.target.value)} 
                      className="w-10 text-center text-sm font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-brand-gold focus:outline-none px-0"
                      min="1" 
                    />
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-green-100 hover:text-green-600 transition-colors"><Plus size={12} /></button>
                  </div>

                  {/* Descuento % */}
                  <div className="flex-[1.2] flex justify-center px-1">
                    <input 
                      type="text" 
                      placeholder="0%" 
                      value={item.discountPercent ? item.discountPercent.toFixed(0) : ''} 
                      onChange={(e) => handleDiscountChange(item.id, e.target.value.replace('%',''), 'percent')} 
                      className="w-12 text-center text-xs border border-slate-200 rounded py-1 text-slate-600 focus:border-brand-gold focus:outline-none" 
                    />
                  </div>

                  {/* Descuento Monto */}
                  <div className="flex-[1.2] flex justify-center px-1">
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={item.discount > 0 ? item.discount.toFixed(2) : ''} 
                      onChange={(e) => handleDiscountChange(item.id, e.target.value, 'amount')} 
                      className="w-16 text-center text-xs border border-slate-200 rounded py-1 text-slate-600 focus:border-brand-gold focus:outline-none" 
                    />
                  </div>

                  {/* Total Item */}
                  <div className="flex-[1.5] text-right font-bold text-slate-800 text-sm pr-2">
                    {itemSubtotal.toFixed(2)}
                  </div>

                  {/* Eliminar */}
                  <div className="w-8 flex justify-center">
                    <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><XCircle size={16} /></button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
      
      {/* --- SECCIÓN DERECHA: RESUMEN Y CONTROL --- */}
      <div className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col shadow-lg z-10">
        
        {/* Panel de Control Caja */}
        <div className="p-4 grid grid-cols-3 gap-2 border-b border-slate-200 bg-white">
          <button onClick={() => setIsOpenRegisterOpen(true)} className="flex flex-col items-center justify-center p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors gap-1">
            <Unlock size={18} />
            <span className="text-[10px] font-bold uppercase">Abrir</span>
          </button>
          <button onClick={() => { if(!checkLock()) setIsExpenseModalOpen(true) }} disabled={!isShiftOpen} className="flex flex-col items-center justify-center p-2 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors gap-1">
            <DollarSign size={18} />
            <span className="text-[10px] font-bold uppercase">Gasto</span>
          </button>
          <button onClick={handlePreCloseRegister} disabled={!isShiftOpen} className="flex flex-col items-center justify-center p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors gap-1">
            <Lock size={18} />
            <span className="text-[10px] font-bold uppercase">Cerrar</span>
          </button>
          <button onClick={() => setIsDailySalesOpen(true)} className="col-span-3 flex items-center justify-center gap-2 py-2 mt-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold uppercase transition-colors">
            <FileText size={14} /> Ver Historial del Día
          </button>
        </div>

        {/* Espaciador Flexible */}
        <div className="flex-1 bg-slate-50"></div>

        {/* Panel de Totales (Sticky Bottom) */}
        <div className="bg-white border-t border-slate-200 p-5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <h2 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Resumen de Venta</h2>
          
          <div className="space-y-2 mb-4 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800">{currencySymbol} {subtotal.toFixed(2)}</span>
            </div>
            
            {itemDiscounts > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Desc. Items:</span>
                <span>- {currencySymbol} {itemDiscounts.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center group">
              <div className="flex items-center gap-2">
                <span>Desc. Global:</span>
                <button 
                  onClick={() => { if(!checkLock()) setIsDiscountModalOpen(true) }} 
                  disabled={safeCart.length === 0}
                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors disabled:opacity-0"
                >
                  <Edit2 size={10} />
                </button>
              </div>
              <span className={`font-medium ${globalDiscount > 0 ? "text-red-500" : "text-slate-400"}`}>
                - {currencySymbol} {globalDiscount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-dashed border-slate-300 pt-4 mb-6">
            <span className="text-lg font-bold text-slate-700">TOTAL</span>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{currencySymbol} {total.toFixed(2)}</span>
          </div>

          <button 
            onClick={openPaymentModal}
            disabled={!isShiftOpen || safeCart.length === 0 || loadingSale}
            className="w-full py-4 bg-brand-gold hover:bg-yellow-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg shadow-brand-gold/30 hover:shadow-brand-gold/50 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loadingSale ? (
              <>
                <RefreshCcw className="animate-spin" size={20} /> PROCESANDO...
              </>
            ) : (
              <>
                <CreditCard size={20} /> COBRAR <span className="text-xs opacity-70 font-normal ml-1">(F12)</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Modales */}
      <PaymentModal show={isPaymentModalOpen} onClose={handleClosePaymentModal} totalAmount={total} onPaymentSuccess={handlePaymentConfirmation} storeConfig={storeConfig} />
      <QuickSaleModal show={isQuickSaleModalOpen} onClose={handleCloseQuickSaleModal} onAddProduct={addToCart} />
      <GlobalDiscountModal show={isDiscountModalOpen} onClose={handleCloseDiscountModal} currentTotal={subtotal - itemDiscounts} onApplyDiscount={setGlobalDiscount} />
      <DepartmentSelectorModal show={isDeptModalOpen} onClose={handleCloseDeptModal} onProductSelect={handleSelectProductFromDept} />
      <DailySalesModal show={isDailySalesOpen} onClose={handleCloseDailySales} />
      <OpenRegisterModal show={isOpenRegisterOpen} onClose={() => setIsOpenRegisterOpen(false)} onOpenShift={handleOpenRegister} isOpen={isShiftOpen} />
      <CloseRegisterModal show={isCloseRegisterOpen} onClose={() => setIsCloseRegisterOpen(false)} onCloseShift={handleCloseRegister} currentShift={currentShift} />
      <ExpenseModal show={isExpenseModalOpen} onClose={handleCloseExpenseModal} />

      {/* 👇 EL TICKET DE LUJO (Se muestra cuando hay una venta completa) */}
      {saleForTicket && (
        <LuxuryTicket 
          saleData={saleForTicket} 
          businessConfig={storeConfig || { name: 'Mi Tienda', phone: '' }} 
          onClose={handleCloseLuxuryTicket} 
        />
      )}
    </div>
  );
}

export default PosInterface;
