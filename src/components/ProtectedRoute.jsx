// fuente/components/ProtectedRoute.jsx
import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/config';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const [user, loading] = useAuthState(auth);

  // Muestra "Cargando..." mientras Firebase verifica la sesión
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        Cargando...
      </div>
    );
  }

  // Si no hay usuario, redirige al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si hay usuario, muestra la página solicitada
  return children;
}

export default ProtectedRoute;
