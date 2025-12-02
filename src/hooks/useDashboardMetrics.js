import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

// --- UTILIDAD: Calcular Ganancia ---
const calculateProfit = (sale) => {
  if (!sale || !sale.items) return 0;
  const totalCost = sale.items.reduce((acc, item) => {
    const cost = Number(item.cost) || 0;
    return acc + (cost * (Number(item.quantity) || 0));
  }, 0);
  return (sale.total || 0) - totalCost;
};

// --- UTILIDAD: Obtener rango de fechas ---
const getDateRange = (rangeType) => {
  const now = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0); // Por defecto: inicio de hoy

  if (rangeType === 'Semana') {
    start.setDate(now.getDate() - 7);
  } else if (rangeType === 'Mes') {
    start.setMonth(now.getMonth() - 1);
  }
  
  return start;
};

export const useDashboardMetrics = (dateRange) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawSales, setRawSales] = useState([]);

  // Definimos la función de carga fuera del useEffect para poder reutilizarla
  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = getDateRange(dateRange);
      
      const salesRef = collection(db, 'sales');
      const q = query(
        salesRef, 
        where('createdAt', '>=', Timestamp.fromDate(startDate))
      );

      const snapshot = await getDocs(q);
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setRawSales(salesData);
    } catch (err) {
      console.error("Error cargando dashboard:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Efecto inicial: Carga los datos al entrar o cambiar fecha
  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // --- PROCESAMIENTO DE DATOS ---
  const metrics = useMemo(() => {
    let revenue = 0;
    let profit = 0;
    let transactions = 0;
    const productMap = {}; 
    const timeMap = {}; 

    rawSales.forEach(sale => {
      // Ignorar ventas anuladas
      if (sale.status !== 'CANCELLED') { 
        revenue += (sale.total || 0);
        profit += calculateProfit(sale);
        transactions += 1;

        // Top Productos
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach(item => {
            const name = item.name || 'Desconocido';
            if (!productMap[name]) productMap[name] = 0;
            productMap[name] += (Number(item.quantity) || 0);
          });
        }

        // Gráfico de Tiempo
        const date = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date();
        let timeKey;
        
        if (dateRange === 'Hoy') {
          const hour = date.getHours().toString().padStart(2, '0');
          timeKey = `${hour}:00`;
        } else {
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          timeKey = `${day}/${month}`;
        }

        if (!timeMap[timeKey]) timeMap[timeKey] = 0;
        timeMap[timeKey] += (sale.total || 0);
      }
    });

    // Formateo para Recharts
    const chartData = Object.keys(timeMap).sort().map(key => ({
      name: key,
      total: timeMap[key]
    }));

    // Top 5 Productos con colores
    const topProducts = Object.keys(productMap)
      .map(name => ({ name, sales: productMap[name] }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
      .map((p, index) => ({
        ...p,
        color: index === 0 ? '#D4AF37' : index === 1 ? '#C0C0C0' : '#1a1a1a'
      }));

    const ticketPromedio = transactions > 0 ? revenue / transactions : 0;

    return {
      revenue,
      profit,
      transactions,
      ticketPromedio,
      chartData,
      topProducts
    };

  }, [rawSales, dateRange]);

  // Devolvemos las métricas y la función 'refresh'
  return { ...metrics, loading, error, refresh: fetchSales };
};