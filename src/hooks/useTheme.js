import { useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { hexToRgb } from '../utils/colors'; // <--- Importamos la nueva herramienta

export const useTheme = () => {
  useEffect(() => {
    // Función auxiliar para aplicar el tema
    const applyTheme = (hexColor) => {
      // 1. Convertimos el Hexadecimal (#D4AF37) a canales RGB limpios ("212 175 55")
      const rgbValues = hexToRgb(hexColor);
      
      // 2. Inyectamos los números en la variable CSS
      document.documentElement.style.setProperty('--color-primary', rgbValues);
    };

    const loadTheme = async () => {
      try {
        const docRef = doc(db, 'settings', 'company');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.brandColor) {
            applyTheme(data.brandColor);
          }
        }
      } catch (error) {
        console.error("Error cargando tema:", error);
      }
    };

    // Carga inicial
    loadTheme();
    
    // Escuchar cambios en vivo (para que el modal actualice al instante)
    const handleLocalChange = () => loadTheme();
    window.addEventListener('theme-changed', handleLocalChange);
    
    return () => window.removeEventListener('theme-changed', handleLocalChange);
  }, []);
};