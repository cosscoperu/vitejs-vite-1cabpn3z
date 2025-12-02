// fuente/hooks/useHotkeys.js
import { useEffect } from 'react';

// --- ¡HEMOS AÑADIDO UN PARÁMETRO 'enabled' (por defecto, true) ---
function useHotkeys(keyMap, deps = [], enabled = true) {
  
  useEffect(() => {
    // Si el hook está deshabilitado (ej. el modal está oculto), no hacemos nada
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event) => {
      const handler = keyMap[event.key];

      if (handler) {
        event.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    
  }, [keyMap, ...deps, enabled]); // <-- Añadimos 'enabled' a las dependencias
}

export default useHotkeys;