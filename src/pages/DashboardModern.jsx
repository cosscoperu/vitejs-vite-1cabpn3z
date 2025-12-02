import React, { useState } from 'react';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Users, Activity, Calendar as CalendarIcon, ArrowRight,
  RefreshCcw // <-- Icono nuevo
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { cn } from '../utils/cn'; 

// --- COMPONENTE SKELETON ---
const Skeleton = ({ className }) => (
  <div className={cn("animate-pulse bg-gray-200 rounded-lg", className)} />
);

// --- KPI CARD COMPONENT ---
const KpiCard = ({ title, value, icon: Icon, delay, loading }) => {
  if (loading) return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 h-full">
      <div className="flex justify-between mb-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
      <Skeleton className="w-24 h-4 mb-2" />
      <Skeleton className="w-32 h-8" />
    </div>
  );

  return (
    <div className={cn(
      "bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300",
      "flex flex-col justify-between h-full animate-in fade-in slide-in-from-bottom-4"
    )} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-gray-50 rounded-xl">
          <Icon className="w-6 h-6 text-gray-700" />
        </div>
        <div className="flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">
           <TrendingUp size={14} /> +0%
        </div>
      </div>
      <div>
        <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

// --- DASHBOARD PRINCIPAL ---
const DashboardModern = () => {
  const [dateRange, setDateRange] = useState('Hoy');
  
  // Obtenemos datos y la función refresh
  const { 
    revenue, profit, transactions, ticketPromedio, 
    chartData, topProducts, loading, 
    refresh 
  } = useDashboardMetrics(dateRange);

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hola, Cossco Admin 👋</h1>
          <p className="text-gray-500">Resumen de rendimiento en tiempo real.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* BOTÓN REFRESH */}
          <button 
            onClick={refresh}
            disabled={loading}
            className={cn(
              "p-2.5 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-yellow-600 hover:border-yellow-500 transition-all shadow-sm active:scale-95",
              loading && "animate-spin text-yellow-600 border-yellow-500"
            )}
            title="Actualizar datos"
          >
            <RefreshCcw size={20} />
          </button>

          {/* SELECTOR DE FECHA */}
          <div className="bg-white rounded-lg p-1 border border-gray-200 flex items-center shadow-sm">
            {['Hoy', 'Semana', 'Mes'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all",
                  dateRange === range 
                    ? "bg-gray-900 text-white shadow-md" 
                    : "text-gray-500 hover:bg-gray-50"
                )}
              >
                {range}
              </button>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-2"></div>
            <div className="px-3 py-2 text-gray-500">
              <CalendarIcon size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* KPI CARDS */}
        <KpiCard 
          loading={loading}
          title="Ventas Totales" 
          value={`S/ ${revenue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          icon={DollarSign} 
          delay={0} 
        />
        <KpiCard 
          loading={loading}
          title="Transacciones" 
          value={transactions} 
          icon={ShoppingBag} 
          delay={100} 
        />
        <KpiCard 
          loading={loading}
          title="Ticket Promedio" 
          value={`S/ ${ticketPromedio.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          icon={Users} 
          delay={200} 
        />
        <KpiCard 
          loading={loading}
          title="Ganancia Neta" 
          value={`S/ ${profit.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} 
          icon={Activity} 
          delay={300} 
        />

        {/* GRÁFICO PRINCIPAL */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Evolución de Ventas ({dateRange})</h3>
          </div>
          <div className="h-[300px] w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full flex-col gap-2">
                 <RefreshCcw className="animate-spin text-gray-300" size={30} />
                 <p className="text-gray-400 text-sm">Cargando gráfico...</p>
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(value) => `S/${value}`} />
                  <Tooltip 
                    formatter={(value) => [`S/ ${value}`, 'Venta']}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                  />
                  <Area type="monotone" dataKey="total" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No hay ventas registradas en este periodo
              </div>
            )}
          </div>
        </div>

        {/* TOP PRODUCTOS */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Top Productos</h3>
          <div className="flex-1 overflow-y-auto pr-2">
            {loading ? (
              [1,2,3].map(i => <Skeleton key={i} className="h-12 w-full mb-4" />)
            ) : topProducts.length > 0 ? (
              topProducts.map((product, idx) => (
                <div key={idx} className="mb-6 last:mb-0 group">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700 truncate w-32">{product.name}</span>
                    <span className="font-bold text-gray-900">{product.sales} und.</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="h-2.5 rounded-full transition-all duration-1000 group-hover:opacity-80" 
                      style={{ width: `100%`, backgroundColor: product.color }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm text-center mt-10">Sin datos aún</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardModern;