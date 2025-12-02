// src/components/LuxuryTicket.jsx
import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { Share2, Download } from 'lucide-react';

const LuxuryTicket = ({ saleData, businessConfig, onClose }) => {
  const ticketRef = useRef(null);

  const handleGenerateImage = async (action) => {
    if (!ticketRef.current) return;
    const toastId = toast.loading('Generando ticket...');

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      const imageBlob = canvas.toDataURL('image/png');

      if (action === 'download') {
        const link = document.createElement('a');
        link.href = imageBlob;
        link.download = `Ticket-${saleData.id || 'venta'}.png`;
        link.click();
        toast.success('Ticket descargado', { id: toastId });
      } else if (action === 'whatsapp') {
        if (navigator.share) {
            try {
                const base64Response = await fetch(imageBlob);
                const blob = await base64Response.blob();
                const file = new File([blob], `Ticket.png`, { type: 'image/png' });
                await navigator.share({
                    files: [file],
                    title: 'Comprobante',
                    text: `Gracias por tu compra en ${businessConfig.name || 'Tienda'} ✨`
                });
                toast.success('Abriendo compartir...', { id: toastId });
            } catch (error) { toast.dismiss(toastId); }
        } else {
            const message = `Hola! Gracias por tu compra. Total: ${saleData.currency} ${saleData.total.toFixed(2)}`;
            const phone = saleData.customerPhone ? saleData.customerPhone.replace(/\D/g,'') : ''; 
            const link = document.createElement('a');
            link.href = imageBlob;
            link.download = `Ticket-${saleData.id}.png`;
            link.click();
            const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            window.open(waUrl, '_blank');
            toast.success('Imagen descargada. Adjúntala en WhatsApp.', { id: toastId });
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al generar imagen', { id: toastId });
    }
  };

  // --- LÓGICA DE DECISIÓN DE QR ---
  // ¿Tiene deuda? (Bolsita abierta)
  const hasDebt = (saleData.total - saleData.deposit) > 0.1; 
  
  // Si hay deuda -> Muestra QR Cobro. Si no -> Muestra QR Social.
  // Si no hay QR Social configurado, muestra el de Cobro por defecto (o nada).
  const targetQrImage = hasDebt 
      ? businessConfig.qrImage 
      : (businessConfig.socialQrImage || businessConfig.qrImage);

  const qrTitle = hasDebt ? "Escanea para pagar saldo" : "¡Síguenos en Redes!";
  const qrSubtitle = hasDebt ? "Yape / Plin" : "Para descuentos exclusivos";

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
      
      <div className="bg-white shadow-2xl overflow-hidden mb-6" style={{ width: '380px' }}>
        <div ref={ticketRef} className="bg-white p-8 text-slate-800 font-mono text-sm relative">
          
          <div className="absolute top-0 left-0 w-full h-2 opacity-50" style={{ background: businessConfig.themeColor || '#0f172a' }}></div>

          {/* HEADER */}
          <div className="text-center mb-6 mt-2">
            {businessConfig.logoUrl ? (
                <img src={businessConfig.logoUrl} alt="Logo" className="h-16 mx-auto mb-2 object-contain" crossOrigin="anonymous" />
            ) : (
                <h2 className="text-2xl font-black tracking-tighter uppercase mb-1">{businessConfig.name || 'TU TIENDA'}</h2>
            )}
            <p className="text-xs text-slate-400 uppercase tracking-widest">Luxury Experience</p>
            <div className="my-4 border-t border-dashed border-slate-300"></div>
            <p className="text-xs text-slate-500">
              Fecha: {saleData.createdAt?.toLocaleDateString ? saleData.createdAt.toLocaleDateString() : new Date().toLocaleDateString()} <br/>
              Hora: {saleData.createdAt?.toLocaleTimeString ? saleData.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
            </p>
          </div>

          {/* ITEMS */}
          <div className="mb-6">
            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase"><span>Item</span><span>Total</span></div>
            {saleData.items.map((item, idx) => (
              <div key={idx} className="flex justify-between mb-2 items-start">
                <div className="pr-4"><span className="block font-bold text-slate-700">{item.name}</span><span className="text-xs text-slate-400">x{item.quantity}</span></div>
                <span className="font-bold text-slate-800">{saleData.currency} {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* TOTALES */}
          <div className="border-t-2 border-slate-800 pt-4 mb-8">
            <div className="flex justify-between text-lg font-black"><span>TOTAL</span><span>{saleData.currency} {saleData.total.toFixed(2)}</span></div>
            
            {hasDebt && (
               <>
                <div className="flex justify-between text-sm text-emerald-600 mt-2 font-bold"><span>Abonado:</span><span>- {saleData.currency} {saleData.deposit.toFixed(2)}</span></div>
                <div className="flex justify-between text-base text-red-500 mt-1 font-black border-t border-dashed border-red-200 pt-1"><span>PENDIENTE:</span><span>{saleData.currency} {(saleData.total - saleData.deposit).toFixed(2)}</span></div>
               </>
            )}
          </div>

          {/* --- QR DINÁMICO --- */}
          <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
            <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider">{qrTitle}</p>
            
            <div className="mx-auto mb-2 flex items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm" style={{width:'140px', height:'140px'}}>
               {targetQrImage ? (
                   <img src={targetQrImage} alt="QR" className="w-full h-full object-cover" crossOrigin="anonymous" />
               ) : (
                   <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-[10px] p-2 text-center">
                       [SIN QR CONFIGURADO]
                   </div>
               )}
            </div>
            
            <p className="font-bold text-xs tracking-widest">{qrSubtitle}</p>
          </div>

          {/* FOOTER */}
          <div className="mt-8 text-center">
            <p className="text-xs font-bold mb-1">¡GRACIAS POR TU COMPRA!</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Etiquétanos en <span className="font-bold text-black text-sm">{businessConfig.instagram || '@tutienda'}</span>
            </p>
            <div className="mt-4 text-[9px] text-slate-300">ID: {saleData.id ? saleData.id.slice(-6).toUpperCase() : '---'}</div>
          </div>

        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={onClose} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-bold transition-colors">Cerrar</button>
        <button onClick={() => handleGenerateImage('download')} className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-900 rounded-full font-bold transition-colors flex items-center gap-2"><Download size={18} /> Descargar</button>
        <button onClick={() => handleGenerateImage('whatsapp')} className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold transition-colors flex items-center gap-2 shadow-lg shadow-green-500/30"><Share2 size={18} /> Enviar WhatsApp</button>
      </div>

    </div>
  );
};

export default LuxuryTicket;