import { useState, useEffect, useCallback } from 'react';
import { getCurrentOpenShift, openShift as openShiftService, closeShift as closeShiftService } from '../services/shiftService';
import toast from 'react-hot-toast';

export const useShifts = () => {
  const [currentShift, setCurrentShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para verificar si hay turno abierto
  const checkShiftStatus = useCallback(async () => {
    setLoading(true);
    try {
      const shift = await getCurrentOpenShift();
      setCurrentShift(shift);
    } catch (err) {
      console.error(err);
      setError("Error verificando estado de caja.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificamos al cargar la página
  useEffect(() => {
    checkShiftStatus();
  }, [checkShiftStatus]);

  // Acción: Abrir Caja
  const openRegister = async (initialAmount) => {
    setLoading(true);
    try {
      const newShift = await openShiftService(initialAmount);
      setCurrentShift(newShift);
      toast.success("Caja abierta correctamente.");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("No se pudo abrir la caja.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Acción: Cerrar Caja
  const closeRegister = async (closingData) => {
    if (!currentShift) return;
    
    setLoading(true);
    try {
      await closeShiftService(currentShift.id, closingData);
      setCurrentShift(null); // Limpiamos el estado local
      toast.success("Caja cerrada y corte guardado.");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Error al cerrar caja.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    currentShift,
    isShiftOpen: !!currentShift, // Convertimos objeto a true/false
    loading,
    error,
    openRegister,
    closeRegister,
    refreshShift: checkShiftStatus
  };
};