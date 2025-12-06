// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Páginas
import LoginPage from './pages/LoginPage';
import DashboardModern from './pages/DashboardModern';
import PosPage from './features/pos/pages/PosPage';
import InventoryPage from './features/pos/pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import PurchasesPage from './features/pos/pages/PurchasesPage';
import ExpensesPage from './pages/ExpensesPage';
import OrdersPage from './features/pos/pages/OrdersPage';

// Layouts y protección
import MainLayout from './features/pos/components/layout/MainLayout';
import POSLayout from './features/pos/components/layout/POSLayout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* --- Ruta pública --- */}
        <Route path="/login" element={<LoginPage />} />

        {/* --- Ventana exclusiva del Punto de Venta (POS) --- */}
        <Route
          path="/ventas"
          element={
            <ProtectedRoute>
              <POSLayout />
            </ProtectedRoute>
          }
        >
          {/* /ventas */}
          <Route index element={<PosPage />} />
        </Route>

        {/* --- Panel de administración (dashboard + módulos) --- */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* / */}
          <Route index element={<DashboardModern />} />

          {/* /inventario */}
          <Route path="inventario" element={<InventoryPage />} />

          {/* /reportes */}
          <Route path="reportes" element={<ReportsPage />} />

          {/* /compras */}
          <Route path="compras" element={<PurchasesPage />} />

          {/* /gastos */}
          <Route path="gastos" element={<ExpensesPage />} />

          {/* /pedidos */}
          <Route path="pedidos" element={<OrdersPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
