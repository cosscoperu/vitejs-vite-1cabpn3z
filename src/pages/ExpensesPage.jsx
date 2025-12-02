// fuente/pages/ExpensesPage.jsx
import React, { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import toast from 'react-hot-toast';

function formatDate(timestamp) {
  if (!timestamp) return 'Pendiente...';
  return timestamp.toDate().toLocaleDateString('es-PE');
}

function ExpensesPage() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const expensesQuery = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
  const [expensesSnapshot, loadingExpenses, errorExpenses] = useCollection(expensesQuery);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!description || !amount) {
      toast.error("Por favor, completa la descripción y el monto.");
      return;
    }
    
    setLoading(true);
    const loadingToast = toast.loading('Guardando gasto...');

    try {
      const expensesCollectionRef = collection(db, 'expenses');
      await addDoc(expensesCollectionRef, {
        description: description,
        amount: Number(amount),
        createdAt: serverTimestamp()
      });

      toast.dismiss(loadingToast);
      toast.success('¡Gasto registrado con éxito!');
      
      setDescription('');
      setAmount('');
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error("Error al registrar gasto: ", err);
      toast.error('Error al guardar el gasto.');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Registro de Gastos Operativos</h1>
      </header>
      
      <div style={styles.content}>
        <div style={styles.layout}>
          <div style={styles.formContainer}>
            <h3>Registrar Nuevo Gasto</h3>
            <p style={styles.subLabel}>Registra gastos operativos como alquiler, luz, sueldos, marketing, etc.</p>
            
            <form onSubmit={handleAddExpense} style={styles.form}>
              <input 
                type="text" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Descripción del gasto (ej. Alquiler de local)" 
                style={styles.input} 
                required 
              />
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                placeholder="Monto (ej. 1500.00)" 
                style={styles.input} 
                step="0.01" 
                min="0" 
                required 
              />
              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? 'Guardando...' : 'Registrar Gasto'}
              </button>
            </form>
          </div>

          <div style={styles.listContainer}>
            <h3>Últimos Gastos Registrados</h3>
            {loadingExpenses && <p>Cargando gastos...</p>}
            {errorExpenses && <p>Error al cargar gastos.</p>}
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Descripción</th>
                  <th style={styles.th}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {expensesSnapshot && expensesSnapshot.docs.map((doc, index) => ( // <-- Añadido 'index'
                  // --- ¡AÑADIDO EL ESTILO DE FILA DE CEBRA! ---
                  <tr key={doc.id} style={index % 2 === 0 ? styles.trEven : null}>
                    <td style={styles.td}>{formatDate(doc.data().createdAt)}</td>
                    <td style={styles.td}>{doc.data().description}</td>
                    <td style={{...styles.td, ...styles.amountCell}}>
                      S/ {doc.data().amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Estilos
const styles = {
  container: { width: '100%', height: '100%', },
  header: { padding: '20px 30px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderBottom: '1px solid #E0E0E0' },
  title: { color: '#1E2A3A', margin: '0', fontSize: '24px' },
  content: { padding: '20px 30px', },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr', 
    gap: '30px'
  },
  formContainer: { 
    padding: '20px 30px', 
    backgroundColor: '#f9f9f9', 
    borderRadius: '8px', 
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    alignSelf: 'start'
  },
  form: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '12px' 
  },
  input: { 
    padding: '12px', 
    fontSize: '15px', 
    borderRadius: '4px', 
    border: '1px solid #ccc' 
  },
  button: { 
    padding: '15px', 
    fontSize: '16px', 
    backgroundColor: '#dc3545', 
    color: 'white', 
    border: 'none', 
    borderRadius: '4px', 
    cursor: 'pointer', 
    marginTop: '10px',
    fontWeight: 'bold'
  },
  subLabel: { 
    fontSize: '14px', 
    color: '#555', 
    margin: '-5px 0 15px 0', 
    textAlign: 'center' 
  },
  listContainer: {
    padding: '20px 30px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: { borderBottom: '2px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f9f9f9', fontWeight: 'bold' },
  td: { padding: '12px', textAlign: 'left', verticalAlign: 'middle', borderBottom: '1px solid #eee' },
  // --- ¡NUEVO ESTILO FILA DE CEBRA! ---
  trEven: {
    backgroundColor: '#f9f9f9'
  },
  amountCell: {
    color: '#dc3545', 
    fontWeight: 'bold',
    textAlign: 'right'
  }
};

export default ExpensesPage;