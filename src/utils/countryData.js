// src/utils/countryData.js

export const COUNTRY_TEMPLATES = {
  PERU: {
    country: 'PERU',
    currency: 'S/',
    taxName: 'IGV',
    taxRate: 0.18,
    phoneCode: '+51',
    methods: [
      { id: 'EFECTIVO', label: 'Efectivo', icon: '💵', enabled: true, shortcut: 'F1' },
      { id: 'YAPE', label: 'Yape', icon: '🟣', enabled: true, shortcut: 'F2' },
      { id: 'PLIN', label: 'Plin', icon: '🔵', enabled: true, shortcut: 'F3' },
      { id: 'TARJETA', label: 'Tarjeta', icon: '💳', enabled: true, shortcut: 'F4' },
      { id: 'CREDITO', label: 'Crédito/Fiado', icon: '📝', enabled: true, shortcut: 'F5' }
    ]
  },
  COLOMBIA: {
    country: 'COLOMBIA',
    currency: '$',
    taxName: 'IVA',
    taxRate: 0.19,
    phoneCode: '+57',
    methods: [
      { id: 'EFECTIVO', label: 'Efectivo', icon: '💵', enabled: true, shortcut: 'F1' },
      { id: 'NEQUI', label: 'Nequi', icon: '🟣', enabled: true, shortcut: 'F2' },
      { id: 'DAVIPLATA', label: 'DaviPlata', icon: '🔴', enabled: true, shortcut: 'F3' },
      { id: 'TARJETA', label: 'Tarjeta', icon: '💳', enabled: true, shortcut: 'F4' }
    ]
  },
  ARGENTINA: {
    country: 'ARGENTINA',
    currency: '$',
    taxName: 'IVA',
    taxRate: 0.21,
    phoneCode: '+54',
    methods: [
      { id: 'EFECTIVO', label: 'Efectivo', icon: '💵', enabled: true, shortcut: 'F1' },
      { id: 'MERCADOPAGO', label: 'MercadoPago', icon: '🤝', enabled: true, shortcut: 'F2' },
      { id: 'TARJETA', label: 'Tarjeta', icon: '💳', enabled: true, shortcut: 'F4' }
    ]
  },
  MEXICO: {
    country: 'MEXICO',
    currency: '$',
    taxName: 'IVA',
    taxRate: 0.16,
    phoneCode: '+52',
    methods: [
      { id: 'EFECTIVO', label: 'Efectivo', icon: '💵', enabled: true, shortcut: 'F1' },
      { id: 'TRANSFERENCIA', label: 'Transferencia', icon: '🏦', enabled: true, shortcut: 'F2' },
      { id: 'TARJETA', label: 'Tarjeta', icon: '💳', enabled: true, shortcut: 'F4' }
    ]
  },
  CHILE: {
    country: 'CHILE',
    currency: '$',
    taxName: 'IVA',
    taxRate: 0.19,
    phoneCode: '+56',
    methods: [
      { id: 'EFECTIVO', label: 'Efectivo', icon: '💵', enabled: true, shortcut: 'F1' },
      { id: 'TRANSBANK', label: 'Transbank', icon: '💳', enabled: true, shortcut: 'F2' },
      { id: 'TRANSFERENCIA', label: 'Transferencia', icon: '🏦', enabled: true, shortcut: 'F3' }
    ]
  }
};