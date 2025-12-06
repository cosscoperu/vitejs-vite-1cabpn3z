// fuente/pages/InventoryPage.jsx
import React from 'react';
import ProductManager from '../components/management/ProductManager';

function InventoryPage() {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Gestión de Inventario</h1>
      </header>

      {/* Aquí mostramos el componente que ya teníamos */}
      <div style={styles.content}>
        <ProductManager />
      </div>
    </div>
  );
}

// Estilos para dar un encabezado a la página
const styles = {
  container: {
    width: '100%',
    height: '100%',
  },
  header: {
    padding: '20px 30px',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    borderBottom: '1px solid #E0E0E0',
  },
  title: {
    color: '#1E2A3A',
    margin: '0',
    fontSize: '24px',
  },
  content: {
    // El padding ya está en el ProductManager
  },
};

export default InventoryPage;
