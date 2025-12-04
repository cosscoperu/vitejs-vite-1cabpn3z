// src/components/LuxuryTicket.jsx
import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import { Share2, Download, Printer } from 'lucide-react';

const LuxuryTicket = ({ saleData, businessConfig, onClose }) => {
  const ticketRef = useRef(null);

  // --- CONFIGURACIÓN DE IMPRESIÓN OPTIMIZADA ---
  const handlePrint = useReactToPrint({
    content: () => ticketRef.current,
    documentTitle: `Ticket-${saleData.id || 'venta'}`,
    onAfterPrint: () => toast.success('Ticket enviado a impresora'),
    removeAfterPrint: true,
  });

  const handleGenerateImage = async (action) => {
    if (!ticketRef.current) return;
    const toastId = toast.loading('Procesando...');

    try {
      // Espera breve para asegurar renderizado
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(ticketRef.current, {
        scale: 3, // Mayor escala para mejor calidad de imagen
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      const imageBlob = canvas.toDataURL('image/png');

      if (action === 'download') {
        const link = document.createElement('a');
        link.href = imageBlob;
        link.download = `Ticket-${saleData.id || 'venta'}.png`;
        link.click();
        toast.success('Descargado', { id: toastId });
      } else if (action === 'whatsapp') {
        // Lógica de WhatsApp (igual a tu original)
        const message = `Hola! Gracias por tu compra. Total: ${saleData.currency} ${saleData.total.toFixed(2)}`;
        const phone = saleData.customerPhone ? saleData.customerPhone.replace(/\D/g,'') : ''; 
        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
        
        // Descargamos la imagen para que el usuario la adjunte manualmente (limitación web)
        const link = document.createElement('a');
        link.href = imageBlob;
        link.download = `Ticket-${saleData.id}.png`;
        link.click();
        
        toast.success('Imagen lista. Pégala en WhatsApp.', { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al generar imagen', { id: toastId });
    }
  };

  // Lógica QR
  const hasDebt = (saleData.total - saleData.deposit) > 0.1; 
  const targetQrImage = hasDebt ? businessConfig.qrImage : (businessConfig.socialQrImage || businessConfig.qrImage);
  const qrTitle = hasDebt ? "Escanea para pagar saldo" : "¡Síguenos!";
  const qrSubtitle = hasDebt ? "Yape / Plin" : "Novedades y Ofertas";

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 print:p-0 print:bg-white print:static print:block">
      
      {/* CONTENEDOR VISUAL VS IMPRESIÓN 
          - En pantalla: Ancho fijo 380px, sombra, bordes redondeados.
          - En impresión: Ancho 100%, sin sombra, sin bordes, fondo blanco puro.
      */}
      <div 
        className="bg-white shadow-2xl overflow-hidden mb-6 print:shadow-none print:mb-0 print:w-full print:rounded-none" 
        style={{ width: '380px' }} // Este estilo inline se sobrescribe con CSS @media print si es necesario, pero mejor controlarlo con clases
      >
        
        {/* ÁREA IMPRIMIBLE */}
        <div 
          ref={ticketRef} 
          className="bg-white p-6 text-slate-900 font-mono text-xs relative print:p-2 print:text-black print:w-full"
        >
          
          {/* Decoración superior (Solo pantalla) */}
          <div className="absolute top-0 left-0 w-full h-2 opacity-50 print:hidden" style={{ background: `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--color-primary')})` }}></div>

          {/* HEADER */}
          <div className="text-center mb-4 mt-2">
            {businessConfig.logoUrl ? (
                <img src={businessConfig.logoUrl} alt="Logo" className="h-14 mx-auto mb-2 object-contain grayscale-0 print:grayscale" crossOrigin="anonymous" />
            ) : (
                <h2 className="text-xl font-black tracking-tighter uppercase mb-1">{businessConfig.name || 'TU TIENDA'}</h2>
            )}
            
            <div className="my-2 border-t border-dashed border-slate-300 print:border-black"></div>
            
            <div className="flex justify-between text-[10px] text-slate-500 print:text-black uppercase">
               <span>{saleData.createdAt?.toLocaleDateString()}</span>
               <span>{saleData.createdAt?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <p className="text-[10px] text-slate-400 print:text-black mt-1">Ticket #{saleData.id ? saleData.id.slice(-6).toUpperCase() : '---'}</p>
          </div>

          {/* ITEMS */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] font-bold border-b border-slate-200 pb-1 mb-2 print:border-black print:text-black uppercase">
                <span>Cant. / Descrip.</span>
                <span>Importe</span>
            </div>
            
            {saleData.items.map((item, idx) => (
              <div key={idx} className="flex justify-between mb-1 items-start text-[11px]">
                <div className="pr-2 flex-1">
                    <span className="font-bold mr-1">{item.quantity}</span> 
                    <span className="text-slate-700 print:text-black">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 print:text-black whitespace-nowrap">
                    {saleData.currency} {(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* TOTALES */}
          <div className="border-t-2 border-slate-800 pt-2 mb-6 print:border-black">
            <div className="flex justify-between text-base font-black print:text-black">
                <span>TOTAL</span>
                <span>{saleData.currency} {saleData.total.toFixed(2)}</span>
            </div>
            
            {hasDebt && (
               <div className="mt-2 text-xs border-t border-dashed border-slate-300 pt-1 print:border-black">
                <div className="flex justify-between text-emerald-700 print:text-black"><span>Abonado:</span><span>{saleData.currency} {saleData.deposit.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-red-600 print:text-black mt-1"><span>PENDIENTE:</span><span>{saleData.currency} {(saleData.total - saleData.deposit).toFixed(2)}</span></div>
               </div>
            )}
          </div>

          {/* QR (Optimizado para B/N) */}
          <div className="flex flex-col items-center justify-center mb-4">
            <p className="text-[9px] uppercase tracking-wider mb-1 print:text-black text-slate-500">{qrTitle}</p>
            {targetQrImage && (
                <div className="p-1 bg-white border border-slate-200 print:border-black rounded">
                    <img src={targetQrImage} alt="QR" className="w-24 h-24 object-contain print:contrast-150" /> 
                    {/* print:contrast-150 ayuda a que el QR salga más negro si es una imagen grisácea */}
                </div>
            )}
            <p className="text-[9px] mt-1 font-bold print:text-black">{qrSubtitle}</p>
          </div>

          {/* FOOTER */}
          <div className="text-center text-[10px]">
            <p className="font-bold mb-1 print:text-black">¡GRACIAS POR SU PREFERENCIA!</p>
            {businessConfig.address && <p className="text-slate-500 print:text-black scale-90">{businessConfig.address}</p>}
            <p className="mt-2 text-[9px] text-slate-400 print:text-black">Sistema: Cossco POS</p>
          </div>

        </div>
      </div>

      {/* BOTONES (No se imprimen gracias a 'print:hidden' en el padre o porque están fuera del ref) */}
      <div className="flex gap-3 flex-wrap justify-center print:hidden">
        <button onClick={onClose} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-bold text-sm">
            Cerrar
        </button>
        
        {/* Botón Principal de Impresión */}
        <button onClick={handlePrint} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold flex items-center gap-2 text-sm shadow-lg shadow-blue-500/30">
            <Printer size={16} /> Imprimir Ticket
        </button>

        <button onClick={() => handleGenerateImage('download')} className="px-5 py-2.5 bg-white text-slate-900 rounded-full font-bold flex items-center gap-2 text-sm hover:bg-slate-100">
            <Download size={16} /> Imagen
        </button>
        <button onClick={() => handleGenerateImage('whatsapp')} className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold flex items-center gap-2 text-sm shadow-lg shadow-green-500/30">
            <Share2 size={16} /> WhatsApp
        </button>
      </div>

    </div>
  );
};

export default LuxuryTicket;