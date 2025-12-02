// fuente/pages/DashboardPage.jsx
import React, { useMemo } from 'react';
import { db } from '../firebase/config';
import { collection, query } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';

// --- 1. IMPORTAMOS LAS HERRAMIENTAS DE GRÁFICOS Y EL PLUGIN ---
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Pie, Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title 
} from 'chart.js';

// --- 2. REGISTRAMOS LOS COMPONENTES DE GRÁFICOS Y EL PLUGIN ---
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title,
  ChartDataLabels // ¡AÑADIDO!
);

// --- Función para calcular ganancia (Sin cambios) ---
function calculateSaleProfit(sale) {
  if (!sale || !sale.items) { return 0; }
  const totalCost = sale.items.reduce((acc, item) => {
    const cost = item.cost || 0;
    return acc + (cost * item.quantity);
  }, 0);
  return sale.total - totalCost;
}

// --- Componente de KPI Box (Rediseñado como en tu imagen de referencia) ---
function KpiBox({ label, value, color = '#28a745' }) {
  const styles = {
    kpiBox: {
      backgroundColor: color,
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
    kpiLabel: {
      display: 'block',
      fontSize: '16px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      opacity: 0.8
    },
    kpiValue: {
      display: 'block',
      fontSize: '36px',
      fontWeight: 'bold',
    }
  };
  return (
    <div style={styles.kpiBox}>
      <span style={styles.kpiLabel}>{label}</span>
      <span style={styles.kpiValue}>S/ {value.toFixed(2)}</span>
    </div>
  );
}

// --- 3. ¡AQUÍ ESTÁ EL ARREGLO! ---
// Definimos los 'styles' AFUERA de los componentes
// para que ambos (ChartWrapper y DashboardPage) puedan verlos.
const localStyles = {
  container: { width: '100%', height: '100%', },
  header: { padding: '20px 30px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderBottom: '1px solid #E0E0E0' },
  title: { color: '#1E2A3A', margin: '0', fontSize: '24px' },
  content: { padding: '20px 30px', },
  kpiContainer: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px', 
    marginBottom: '30px' 
  },
  chartsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '20px',
  },
  chartWrapper: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  chartTitle: {
    margin: 0,
    marginBottom: '15px',
    textAlign: 'center',
    color: '#333',
    fontSize: '18px'
  },
  chartContent: {
    position: 'relative',
    height: '300px' // Damos una altura fija
  }
};
// --- FIN DEL ARREGLO ---


// --- Componente de Gráfico (Ahora puede ver localStyles) ---
function ChartWrapper({ title, children }) {
  return (
    <div style={localStyles.chartWrapper}>
      <h3 style={localStyles.chartTitle}>{title}</h3>
      <div style={localStyles.chartContent}>
        {children}
      </div>
    </div>
  );
}


function DashboardPage() {
  // --- LEEMOS VENTAS Y GASTOS (Sin cambios) ---
  const [salesSnapshot, loadingSales, errorSales] = useCollection(collection(db, 'sales'));
  const [expensesSnapshot, loadingExpenses, errorExpenses] = useCollection(collection(db, 'expenses'));

  // --- CALCULAR MÉTRICAS (Sin cambios) ---
  const metrics = useMemo(() => {
    let revenue = 0, profit = 0, expenses = 0, onlineRevenue = 0;
    const paymentBreakdown = { efectivo: 0, tarjeta: 0, yape: 0, banco: 0, otro: 0 };
    const platformBreakdown = { fb: 0, ig: 0, tiktok: 0, otro: 0 };

    if (salesSnapshot) {
      salesSnapshot.docs.forEach(doc => {
        const sale = doc.data();
        if (!sale || !sale.total || !sale.payment) return;
        revenue += sale.total;
        profit += calculateSaleProfit(sale);
        if (sale.orderInfo && sale.orderInfo.type === 'Online') {
          onlineRevenue += sale.total;
          if(platformBreakdown.hasOwnProperty(sale.orderInfo.platform)) {
            platformBreakdown[sale.orderInfo.platform] += sale.total;
          }
        }
        if (sale.payment.payments) {
          sale.payment.payments.forEach(p => {
            if (paymentBreakdown.hasOwnProperty(p.method)) {
              paymentBreakdown[p.method] += p.amount;
            }
          });
        } else if (sale.payment.method) {
          if (paymentBreakdown.hasOwnProperty(sale.payment.method)) {
            paymentBreakdown[sale.payment.method] += sale.total;
          }
        }
      });
    }
    if (expensesSnapshot) {
      expensesSnapshot.docs.forEach(doc => {
        const expense = doc.data();
        if (expense && expense.amount) {
          expenses += expense.amount;
        }
      });
    }
    const netProfit = profit - expenses;
    return { revenue, profit, expenses, netProfit, onlineRevenue, paymentBreakdown, platformBreakdown };
  }, [salesSnapshot, expensesSnapshot]);

  // --- 4. PREPARAMOS LOS DATOS PARA LOS GRÁFICOS (Sin cambios) ---
  const paymentChartData = {
    labels: ['Efectivo', 'Yape', 'Tarjeta', 'Banco'],
    datasets: [{
      label: 'Ingresos por Pago',
      data: [
        metrics.paymentBreakdown.efectivo,
        metrics.paymentBreakdown.yape,
        metrics.paymentBreakdown.tarjeta,
        metrics.paymentBreakdown.banco
      ],
      backgroundColor: ['#28a745', '#007bff', '#ffc107', '#dc3545'],
      borderColor: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'],
      borderWidth: 1,
    }]
  };
  
  const profitChartData = {
    labels: ['Resumen Financiero'],
    datasets: [
      {
        label: 'Ganancia Bruta',
        data: [metrics.profit],
        backgroundColor: '#007bff',
      },
      {
        label: 'Gastos Operativos',
        data: [metrics.expenses],
        backgroundColor: '#dc3545',
      },
      {
        label: 'Ganancia Neta',
        data: [metrics.netProfit],
        backgroundColor: '#28a745',
      },
    ]
  };
  
  // --- 5. OPCIONES DE GRÁFICOS CON ETIQUETAS ---
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', },
      // Configuramos el plugin de datalabels
      datalabels: {
        color: '#333', // Color del texto de las etiquetas
        anchor: 'end',
        align: 'end',
        offset: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 4,
        font: { weight: 'bold' },
        formatter: (value) => {
          if (value === 0) return '';
          return 'S/ ' + value.toFixed(0); // Mostramos sin decimales
        }
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', },
      datalabels: {
        color: '#333', // Color del texto de las etiquetas
        anchor: 'end',
        align: 'top',
        offset: 5,
        font: { weight: 'bold' },
        formatter: (value) => {
          if (value === 0) return '';
          return 'S/ ' + value.toFixed(0);
        }
      }
    }
  };

  // --- BLOQUE DE CARGA (Arreglado) ---
  if (loadingSales || loadingExpenses) {
    return (
      <div style={localStyles.container}>
        <header style={localStyles.header}><h1 style={localStyles.title}>Dashboard de Negocio</h1></header>
        <div style={localStyles.content}><p>Calculando métricas...</p></div>
      </div>
    );
  }
  
  if (errorSales || errorExpenses) {
    return <div style={localStyles.container}><p>Error al cargar los datos.</p></div>
  }

  // --- VISTA RENDERIZADA ---
  return (
    <div style={localStyles.container}>
      <header style={localStyles.header}>
        <h1 style={localStyles.title}>Dashboard de Negocio</h1>
      </header>
      
      <div style={localStyles.content}>
        {/* --- Fila 1: KPIs (Inspirado en tu imagen) --- */}
        <div style={localStyles.kpiContainer}>
          <KpiBox label="Ventas Totales" value={metrics.revenue} color="#007bff" />
          <KpiBox label="Ganancia Bruta" value={metrics.profit} color="#17a2b8" />
          <KpiBox label="Gastos Operativos" value={metrics.expenses} color="#dc3545" />
          <KpiBox label="Ganancia Neta" value={metrics.netProfit} color="#28a745" />
        </div>
        
        {/* --- Fila 2: Gráficos (Aplicamos las nuevas opciones) --- */}
        <div style={localStyles.chartsContainer}>
          <ChartWrapper title="Ingresos por Método de Pago">
            <Pie data={paymentChartData} options={pieChartOptions} />
          </ChartWrapper>
          
          <ChartWrapper title="Resumen de Ganancias">
            <Bar data={profitChartData} options={barChartOptions} />
          </ChartWrapper>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;