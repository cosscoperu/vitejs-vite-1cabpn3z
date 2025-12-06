// src/features/pos/components/modals/PaymentModal.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Banknote, CreditCard, Smartphone,
  CheckCircle, Printer, MessageCircle, ArrowRight,
  Trash2, AlertCircle, Plus, Wallet, Landmark, Check, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

const classNames = (...classes) => classes.filter(Boolean).join(' ');

const money = {
  toCents: (amount) => Math.round(Number(amount) * 100),
  fromCents: (cents) => cents / 100,
};

function PaymentModal({ show, onClose, totalAmount, onPaymentSuccess, storeConfig }) {
  // --- CONFIGURACIÓN ---
  const activeMethods = useMemo(
    () => (storeConfig?.methods || []).filter((m) => m.enabled),
    [storeConfig]
  );

  const currencySymbol = storeConfig?.currency || 'S/';

  // --- ESTADOS ---
  const [payments, setPayments] = useState([]);
  const [currentAmount, setCurrentAmount] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('TICKET');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState(null);

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // Método seleccionado (memo)
  const selectedMethod = useMemo(
    () =>
      activeMethods.find((m) => m.id === selectedMethodId) ||
      activeMethods[0] ||
      null,
    [activeMethods, selectedMethodId]
  );

  // --- CÁLCULOS ---
  const totalAmountCents = money.toCents(totalAmount);
  const totalPaidCents = payments.reduce(
    (acc, p) => acc + money.toCents(p.amount),
    0
  );
  const amountInInputCents = money.toCents(currentAmount || 0);
  const totalWithInputCents = totalPaidCents + amountInInputCents;
  const changeCents = Math.max(0, totalWithInputCents - totalAmountCents);
  const change = money.fromCents(changeCents);
  const isCovered = totalWithInputCents >= totalAmountCents;
  const pendingCents = Math.max(0, totalAmountCents - totalPaidCents);

  // --- INICIALIZACIÓN ---
  useEffect(() => {
    if (show && activeMethods.length > 0) {
      setPayments([]);
      setIsProcessing(false);
      setDeliveryMethod('TICKET');
      setWhatsappNumber('');

      setCurrentAmount(totalAmount.toFixed(2));
      setSelectedMethodId(activeMethods[0].id);

      const focusInput = () => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      };

      setTimeout(focusInput, 50);
      setTimeout(focusInput, 150);
      setTimeout(focusInput, 300);

      if (containerRef.current) {
        containerRef.current.focus();
      }
    }
  }, [show, totalAmount, activeMethods]);

  // --- AGREGAR PAGO POR MÉTODO ---
  const handleMethodSelect = (methodId) => {
    const methodConfig = activeMethods.find((m) => m.id === methodId);
    if (!methodConfig) return;

    setSelectedMethodId(methodId);

    const amountCents = money.toCents(currentAmount);
    if (isNaN(amountCents) || amountCents <= 0) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      return;
    }

    const amountFloat = money.fromCents(amountCents);

    if (!methodConfig.allowsOverpayment) {
      const currentPendingCents = Math.max(0, totalAmountCents - totalPaidCents);
      if (amountCents > currentPendingCents) {
        toast.error(
          `Máximo: ${currencySymbol} ${money
            .fromCents(currentPendingCents)
            .toFixed(2)}`
        );
        setCurrentAmount(
          money.fromCents(currentPendingCents).toFixed(2)
        );
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
          }
        }, 50);
        return;
      }
    }

    const newPayment = {
      method: methodConfig.label,
      type: methodConfig.type,
      iconEmoji: methodConfig.icon,
      amount: amountFloat,
      id: Date.now(),
    };

    const newPaymentsList = [...payments, newPayment];
    setPayments(newPaymentsList);

    const newTotalPaidCents = newPaymentsList.reduce(
      (acc, p) => acc + money.toCents(p.amount),
      0
    );
    const remainingCents = Math.max(0, totalAmountCents - newTotalPaidCents);
    const newAmount =
      remainingCents > 0 ? money.fromCents(remainingCents).toFixed(2) : '';
    setCurrentAmount(newAmount);

    if (remainingCents > 0) {
      const currentIndex = activeMethods.findIndex(
        (m) => m.id === methodId
      );
      const nextMethod =
        activeMethods[currentIndex + 1] || activeMethods[0];
      if (nextMethod) setSelectedMethodId(nextMethod.id);
    }

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
  };

  const removePayment = (index) => {
    const newPayments = [...payments];
    newPayments.splice(index, 1);
    setPayments(newPayments);

    const newPaid = newPayments.reduce(
      (acc, p) => acc + money.toCents(p.amount),
      0
    );
    const remaining = Math.max(0, totalAmountCents - newPaid);
    setCurrentAmount(money.fromCents(remaining).toFixed(2));

    if (activeMethods.length > 0) {
      setSelectedMethodId(activeMethods[0].id);
    }

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
  };

  // --- BOTONES RÁPIDOS DE BILLETES ---
  const handleQuickCashClick = (value) => {
    const add = Number(value) || 0;
    if (add <= 0) return;

    setCurrentAmount((prev) => {
      const prevNum = parseFloat(prev) || 0;
      const newVal = prevNum + add;
      return newVal.toFixed(2);
    });

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 40);
  };

  // --- CONFIRMAR ---
  const handleConfirm = async () => {
    let finalPayments = [...payments];
    const currentInputCents = money.toCents(currentAmount || 0);

    if (finalPayments.length === 0 && currentInputCents >= totalAmountCents) {
      const currentMethod =
        activeMethods.find((m) => m.id === selectedMethodId) ||
        activeMethods[0];
      if (currentMethod) {
        finalPayments.push({
          method: currentMethod.label,
          type: currentMethod.type,
          amount: money.fromCents(currentInputCents),
        });
      }
    }

    const finalTotalPaidCents = finalPayments.reduce(
      (acc, p) => acc + money.toCents(p.amount),
      0
    );

    if (finalTotalPaidCents < totalAmountCents) {
      const missing = money.fromCents(
        totalAmountCents - finalTotalPaidCents
      );
      toast.error(
        `Falta cubrir: ${currencySymbol} ${missing.toFixed(2)}`
      );
      return;
    }

    if (deliveryMethod === 'WHATSAPP' && !whatsappNumber) {
      toast.error('Ingresa el número de WhatsApp');
      return;
    }

    setIsProcessing(true);

    let finalMethodName = 'MIXTO';
    if (finalPayments.length === 1) {
      finalMethodName = finalPayments[0].method;
    }

    const paymentDetails = {
      method: finalMethodName,
      amountReceived: money.fromCents(finalTotalPaidCents),
      change: money.fromCents(finalTotalPaidCents - totalAmountCents),
      delivery: deliveryMethod,
      phone: whatsappNumber,
      multiPayments: finalPayments,
      currency: currencySymbol,
    };

    try {
      await onPaymentSuccess(paymentDetails);
    } catch (error) {
      console.error(error);
      toast.error('Error al procesar');
      setIsProcessing(false);
    }
  };

  // --- ATAJOS DE TECLADO INTERNOS ---
  const handleKeyDown = (e) => {
    if (e.target.type === 'tel') return;

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'F12' || (e.key === 'Enter' && isCovered && payments.length === 0)) {
      e.preventDefault();
      handleConfirm();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const currentInputCents = money.toCents(currentAmount || 0);

      if (payments.length === 0 && currentInputCents >= totalAmountCents) {
        handleConfirm();
      } else if (currentAmount && selectedMethodId) {
        handleMethodSelect(selectedMethodId);
      }
      return;
    }

    const shortcutMethod = activeMethods.find((m) => m.shortcut === e.key);
    if (shortcutMethod) {
      e.preventDefault();
      handleMethodSelect(shortcutMethod.id);
    }
  };

  if (!show) return null;

  const showQuickCashButtons =
    selectedMethod &&
    (selectedMethod.type === 'CASH' ||
      (selectedMethod.label || '').toLowerCase().includes('efectivo'));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md transition-all"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={containerRef}
    >
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[620px] max-h[90vh]">
        {/* COLUMNA IZQUIERDA */}
        <div className="w-full md:w-[340px] bg-gradient-to-br from-slate-50 to-white p-6 flex flex-col border-r border-slate-100">
          {/* Total */}
          <div className="mb-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Total a Pagar
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg text-slate-400 font-semibold">
                {currencySymbol}
              </span>
              <span className="text-5xl font-black text-slate-900 tracking-tight leading-none">
                {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Lista de pagos */}
          <div className="flex-1 mb-5 overflow-hidden flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Pagos
              </p>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {payments.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
              {payments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-8">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                    <Wallet size={20} className="opacity-30" />
                  </div>
                  <p className="text-xs font-medium">Sin pagos</p>
                  <p className="text-[10px] mt-0.5 text-center">
                    Click en método
                  </p>
                </div>
              ) : (
                payments.map((p, index) => (
                  <div
                    key={p.id}
                    className="group flex justify-between items-center p-2.5 bg-white rounded-xl border border-slate-100 hover:border-red-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                        {p.iconEmoji}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs leading-tight">
                          {p.method}
                        </p>
                        <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">
                          {p.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {currencySymbol} {p.amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => removePayment(index)}
                        className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        tabIndex={-1}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Vuelto / Pendiente */}
          <div
            className={classNames(
              'p-3.5 rounded-xl transition-all duration-300 mb-4',
              isCovered
                ? 'bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200'
                : 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200'
            )}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div
                  className={classNames(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-base',
                    isCovered ? 'bg-emerald-100' : 'bg-amber-100'
                  )}
                >
                  {isCovered ? '💰' : '⏳'}
                </div>
                <span
                  className={classNames(
                    'text-[10px] font-bold uppercase tracking-wide',
                    isCovered ? 'text-emerald-700' : 'text-amber-700'
                  )}
                >
                  {isCovered ? 'Vuelto' : 'Pendiente'}
                </span>
              </div>
              <div className="text-right">
                <span
                  className={classNames(
                    'text-2xl font-black',
                    isCovered ? 'text-emerald-600' : 'text-amber-600'
                  )}
                >
                  {isCovered
                    ? change.toFixed(2)
                    : money.fromCents(pendingCents).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Entrega */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Entrega
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeliveryMethod('TICKET')}
                className={classNames(
                  'flex-1 py-2 px-3 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all',
                  deliveryMethod === 'TICKET'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                )}
                tabIndex={-1}
              >
                <Printer size={12} /> Ticket
              </button>
              <button
                onClick={() => setDeliveryMethod('WHATSAPP')}
                className={classNames(
                  'flex-1 py-2 px-3 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all',
                  deliveryMethod === 'WHATSAPP'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                )}
                tabIndex={-1}
              >
                <MessageCircle size={12} /> WhatsApp
              </button>
            </div>
            {deliveryMethod === 'WHATSAPP' && (
              <input
                type="tel"
                placeholder="Número"
                className="w-full p-2 text-xs border border-green-200 rounded-lg focus:outline-none focus:border-green-400 bg-green-50/50 text-green-900 placeholder:text-green-600/50 font-medium transition-all"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="flex-1 p-6 flex flex-col bg-white relative">
          {/* Cerrar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all z-10"
            tabIndex={-1}
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="mb-5">
            <h2 className="text-xl font-black text-slate-900 mb-0.5 flex items-center gap-2">
              Ingresar Pago
              <Zap size={18} className="text-amber-400" />
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Click •{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">
                F1-F5
              </kbd>{' '}
              shortcuts •{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">
                F12
              </kbd>{' '}
              finalizar
            </p>
          </div>

          {/* Métodos */}
          <div className="grid grid-cols-4 gap-2.5 mb-5">
            {activeMethods.map((method) => {
              const isSelected = selectedMethodId === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => handleMethodSelect(method.id)}
                  className={classNames(
                    'relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 outline-none group',
                    isSelected
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-200/50 scale-[1.03]'
                      : 'bg-slate-50 text-slate-600 hover:bg-white hover:shadow-md hover:scale-[1.03] border border-slate-100'
                  )}
                >
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
                      <Check
                        size={12}
                        className="text-blue-600"
                        strokeWidth={3}
                      />
                    </div>
                  )}
                  <span
                    className={classNames(
                      'text-2xl mb-1 transition-transform',
                      isSelected ? 'scale-105' : 'group-hover:scale-105'
                    )}
                  >
                    {method.icon}
                  </span>
                  <span
                    className={classNames(
                      'text-[10px] font-bold text-center leading-tight',
                      isSelected ? 'text-white' : 'text-slate-700'
                    )}
                  >
                    {method.label}
                  </span>
                  <span
                    className={classNames(
                      'absolute bottom-1 right-1 text-[8px] font-mono px-1.5 py-0.5 rounded font-bold',
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-500'
                    )}
                  >
                    {method.shortcut}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Área de monto */}
          <div className="flex-1 flex flex-col justify-center mb-4">
            <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl p-5 border border-slate-100 shadow-inner">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Monto
                </label>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  {selectedMethod?.label || 'Método'}
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">
                  {currencySymbol}
                </span>
                <input
                  ref={inputRef}
                  type="number"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 text-5xl font-black text-slate-900 bg-white rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-200"
                  placeholder="0.00"
                  step="0.01"
                  autoFocus
                />
              </div>

              {/* Botones rápidos de billetes */}
              {showQuickCashButtons && (
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  {[10, 20, 50, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickCashClick(val)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                    >
                      {currencySymbol} {val}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-slate-400 mt-3 text-center font-medium">
                {payments.length === 0
                  ? '💡 Enter o click para agregar'
                  : '✨ Más métodos o F12 finalizar'}
              </p>
            </div>
          </div>

          {/* Botón Finalizar */}
          <button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            disabled={!isCovered || isProcessing}
            className={classNames(
              'w-full py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2.5 relative overflow-hidden',
              isCovered && !isProcessing
                ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 text-white shadow-xl shadow-emerald-200/50 hover:shadow-emerald-300/50 active:scale-[0.98]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            {isCovered && !isProcessing && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></span>
            )}

            <span className="relative z-10 flex items-center gap-2.5">
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle size={22} strokeWidth={2.5} />
                  <span>FINALIZAR VENTA</span>
                  <kbd className="bg-white/20 px-2.5 py-1 rounded-lg text-sm font-mono font-bold">
                    F12
                  </kbd>
                </>
              )}
            </span>
          </button>

          {/* Info vuelto */}
          {isCovered && change > 0 && payments.length === 0 && (
            <div className="mt-3 text-center">
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200">
                <CheckCircle size={14} className="text-emerald-500" />
                <span className="text-xs font-bold">
                  Vuelto: {currencySymbol} {change.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}

export default PaymentModal;
