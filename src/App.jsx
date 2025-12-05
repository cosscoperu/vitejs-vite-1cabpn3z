// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Páginas
import LoginPage from './pages/LoginPage';
import DashboardModern from './pages/DashboardModern';
import PosPage from './features/pos/pages/PosPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import PurchasesPage from './pages/PurchasesPage';
import ExpensesPage from './pages/ExpensesPage';
import OrdersPage from './pages/OrdersPage';

// Layouts y protección
import MainLayout from './components/MainLayout';
// ⬇️ NUEVO IMPORT: ahora el POSLayout vive en features/pos/components/layout
import POSLayout from './features/pos/components/layout/POSLayout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Ruta Pública --- */}
        <Route path="/login" element={<LoginPage />} />

        {/* --- Ruta independiente: Punto de Venta (POS) --- */}
        <Route
          element={
            <ProtectedRoute>
              <POSLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/ventas" element={<PosPage />} />
        </Route>

        {/* --- Rutas del panel de administración (Dashboard) --- */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardModern />} />

          <Route path="inventario" element={<InventoryPage />} />
          <Route path="reportes" element={<ReportsPage />} />
          <Route path="compras" element={<PurchasesPage />} />
          <Route path="gastos" element={<ExpensesPage />} />
          <Route path="pedidos" element={<OrdersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
