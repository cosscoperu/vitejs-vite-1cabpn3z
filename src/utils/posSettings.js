// ==========================================
// TEMPLATES DE PAÍSES (Base de Datos Estática)
// ==========================================
export const COUNTRY_TEMPLATES = {
  PERU: {
    country: 'PERU',
    currency: 'S/',
    methods: [
      { id: 'cash', label: 'Efectivo', type: 'CASH', icon: '💵', shortcut: 'F1', enabled: true, allowsOverpayment: true },
      { id: 'yape', label: 'Yape', type: 'DIGITAL', icon: '🟣', shortcut: 'F2', enabled: true, allowsOverpayment: false },
      { id: 'plin', label: 'Plin', type: 'DIGITAL', icon: '🔵', shortcut: 'F3', enabled: true, allowsOverpayment: false },
      { id: 'card', label: 'Izipay/Niubiz', type: 'CARD', icon: '💳', shortcut: 'F4', enabled: true, allowsOverpayment: false }
    ]
  },
  COLOMBIA: {
    country: 'COLOMBIA',
    currency: '$',
    methods: [
      { id: 'cash', label: 'Efectivo', type: 'CASH', icon: '💵', shortcut: 'F1', enabled: true, allowsOverpayment: true },
      { id: 'nequi', label: 'Nequi', type: 'DIGITAL', icon: '🟣', shortcut: 'F2', enabled: true, allowsOverpayment: false },
      { id: 'davi', label: 'DaviPlata', type: 'DIGITAL', icon: '🔴', shortcut: 'F3', enabled: true, allowsOverpayment: false },
      { id: 'bold', label: 'Bold / Redeban', type: 'CARD', icon: '💳', shortcut: 'F4', enabled: true, allowsOverpayment: false }
    ]
  },
  USA: {
    country: 'USA',
    currency: '$',
    methods: [
      { id: 'cash', label: 'Cash', type: 'CASH', icon: '💵', shortcut: 'F1', enabled: true, allowsOverpayment: true },
      { id: 'card', label: 'Credit Card', type: 'CARD', icon: '💳', shortcut: 'F2', enabled: true, allowsOverpayment: false },
      { id: 'apple', label: 'Apple Pay', type: 'DIGITAL', icon: '🍎', shortcut: 'F3', enabled: true, allowsOverpayment: false },
      { id: 'zelle', label: 'Zelle', type: 'BANK', icon: 'zq', shortcut: 'F4', enabled: true, allowsOverpayment: false }
    ]
  }
};

// Clave para guardar en el navegador
export const STORAGE_KEY = 'POS_GLOBAL_CONFIG';

// Función para obtener la configuración (o el default PERU)
export const getPosConfig = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return COUNTRY_TEMPLATES.PERU; // Default por defecto
};

// Función para guardar
export const savePosConfig = (config) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  // Disparar evento para que otras pestañas se enteren si es necesario
  window.dispatchEvent(new Event('storage'));
};