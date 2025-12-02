// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importamos todas nuestras páginas
import LoginPage from './pages/LoginPage';
import DashboardModern from './pages/DashboardModern'; 

import PosPage from './pages/PosPage'; 
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import PurchasesPage from './pages/PurchasesPage';
import ExpensesPage from './pages/ExpensesPage';
import OrdersPage from './pages/OrdersPage';

// Importamos nuestros componentes de layout y protección
import MainLayout from './components/MainLayout';
import POSLayout from './components/POSLayout'; // <--- 1. NUEVO IMPORT
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Ruta Pública --- */}
        <Route path="/login" element={<LoginPage />} />

        {/* --- 1. RUTA STANDALONE: VENTAS (Optimizado con POSLayout) --- */}
        {/* Ahora /ventas vive dentro de POSLayout.
            Esto asegura que cargue el Logo y el QR antes de mostrar la caja.
        */}
        <Route
          element={
            <ProtectedRoute>
              <POSLayout />
            </ProtectedRoute>
          }
        >
           <Route path="/ventas" element={<PosPage />} />
        </Route>
        
        {/* --- 2. RUTAS ANIDADAS (ADMIN DASHBOARD) --- */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout /> 
            </ProtectedRoute>
          }
        >
          <Route index={true} element={<DashboardModern />} /> 
          
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