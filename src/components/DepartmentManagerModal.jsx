// src/components/DepartmentManagerModal.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, query, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

function DepartmentManagerModal({ show, onClose, businessId = 'default_business' }) {
  const [allDepartments, setAllDepartments] = useState([]);
  const [currentParent, setCurrentParent] = useState(null); 
  const [departmentPath, setDepartmentPath] = useState([]); 
  const [loading, setLoading] = useState(false);

  // --- ESTADOS PARA LOS MICRO-MODALES (Adiós alertas feas) ---
  const [showInputModal, setShowInputModal] = useState(false);
  const [inputType, setInputType] = useState('CREATE'); // 'CREATE' | 'EDIT'
  const [inputValue, setInputValue] = useState('');
  const [targetDept, setTargetDept] = useState(null); // El depto a editar

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);

  const inputRef = useRef(null); // Para dar foco automático

  // --- 1. CARGA INICIAL ---
  useEffect(() => {
    if (show) {
      loadDepartments();
      setCurrentParent(null);
      setDepartmentPath([]);
    }
  }, [show]);

  // Auto-focus cuando se abre el modal de escribir
  useEffect(() => {
    if (showInputModal && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [showInputModal]);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'departments'));
      const snapshot = await getDocs(q);
      setAllDepartments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error(error);
      toast.error("Error cargando estructura");
    }
    setLoading(false);
  };

  // --- 2. LÓGICA RECURSIVA ---
  const currentLevelDepartments = useMemo(() => {
    return allDepartments
      .filter(dep => dep.parentId === currentParent)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allDepartments, currentParent]);

  const hasChildren = (deptId) => allDepartments.some(d => d.parentId === deptId);

  // --- 3. MANEJADORES DE UI (Abrir/Cerrar Micro-Modales) ---

  // A. PREPARAR CREACIÓN
  const openCreateModal = () => {
    setInputType('CREATE');
    setInputValue('');
    setShowInputModal(true);
  };

  // B. PREPARAR EDICIÓN
  const openEditModal = (dept) => {
    setInputType('EDIT');
    setInputValue(dept.name);
    setTargetDept(dept);
    setShowInputModal(true);
  };

  // C. PREPARAR BORRADO
  const openDeleteModal = (deptId) => {
    if (hasChildren(deptId)) {
      toast.error("⛔ No puedes borrar carpetas con contenido. Entra y borra los hijos primero.", { duration: 4000 });
      return;
    }
    setDeptToDelete(deptId);
    setShowDeleteModal(true);
  };

  // --- 4. ACCIONES REALES (Firebase) ---

  const handleSaveInput = async (e) => {
    e.preventDefault(); // Prevenir reload si es submit de form
    if (!inputValue.trim()) return;

    const nameUpper = inputValue.toUpperCase().trim();
    setShowInputModal(false); // Cerramos rápido para mejor UX

    try {
      if (inputType === 'CREATE') {
        const newDept = {
          name: nameUpper,
          parentId: currentParent,
          businessId,
          createdAt: new Date()
        };
        const docRef = await addDoc(collection(db, 'departments'), newDept);
        setAllDepartments([...allDepartments, { id: docRef.id, ...newDept }]);
        toast.success("Creado correctamente");
      } 
      else if (inputType === 'EDIT' && targetDept) {
        if (targetDept.name === nameUpper) return; // No cambió nada
        
        await updateDoc(doc(db, 'departments', targetDept.id), { name: nameUpper });
        
        const updatedList = allDepartments.map(d => 
          d.id === targetDept.id ? { ...d, name: nameUpper } : d
        );
        setAllDepartments(updatedList);
        toast.success("Nombre actualizado");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deptToDelete) return;
    setShowDeleteModal(false);

    try {
      await deleteDoc(doc(db, 'departments', deptToDelete));
      setAllDepartments(allDepartments.filter(d => d.id !== deptToDelete));
      toast.success("Eliminado correctamente");
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };


  // --- 5. NAVEGACIÓN ---
  const handleEnter = (dept) => {
    setCurrentParent(dept.id);
    setDepartmentPath([...departmentPath, dept]);
  };

  const handleBack = () => {
    const newPath = [...departmentPath];
    newPath.pop();
    setDepartmentPath(newPath);
    const prev = newPath[newPath.length - 1];
    setCurrentParent(prev ? prev.id : null);
  };

  if (!show) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <h3 style={{margin:0}}>📁 Gestión de Categorías</h3>
            <small style={{color:'#666'}}>Organiza tus departamentos</small>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>X</button>
        </div>

        {/* NAVEGACIÓN */}
        <div style={styles.navBar}>
           {currentParent && <button onClick={handleBack} style={styles.backLink}>⬅ Atrás</button>}
           <span style={{marginLeft: '10px', fontWeight: 'bold', color: '#0050b3'}}>
             {currentParent ? departmentPath.map(d => d.name).join(' > ') : 'PRINCIPAL (RAÍZ)'}
           </span>
        </div>

        {/* GRID PRINCIPAL */}
        <div style={styles.grid}>
          {/* Botón Crear */}
          <div style={styles.addCard} onClick={openCreateModal}>
            <span style={{fontSize: '28px', marginBottom:'5px'}}>➕</span>
            <span style={{fontWeight:'bold'}}>Crear Nuevo</span>
          </div>

          {currentLevelDepartments.map(dept => (
            <div key={dept.id} style={styles.card}>
              <div style={styles.cardContent} onClick={() => handleEnter(dept)}>
                <span style={styles.cardTitle}>{dept.name}</span>
                {hasChildren(dept.id) 
                  ? <span style={styles.badgeInfo}>📂 {allDepartments.filter(d => d.parentId === dept.id).length} items</span>
                  : <span style={styles.badgeEmpty}>📄 Vacío</span>
                }
              </div>
              <div style={styles.actions}>
                <button onClick={(e) => { e.stopPropagation(); openEditModal(dept); }} style={styles.editBtn} title="Editar">✏️</button>
                <button onClick={(e) => { e.stopPropagation(); openDeleteModal(dept.id); }} style={styles.deleteBtn} title="Borrar">🗑️</button>
              </div>
            </div>
          ))}
        </div>

        {/* --- MICRO-MODAL: INPUT (CREAR/EDITAR) --- */}
        {showInputModal && (
          <div style={styles.microOverlay}>
            <div style={styles.microModal}>
              <h4 style={{marginTop:0}}>{inputType === 'CREATE' ? 'Nueva Categoría' : 'Editar Nombre'}</h4>
              <form onSubmit={handleSaveInput}>
                <input 
                  ref={inputRef}
                  type="text" 
                  value={inputValue} 
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ej: ZAPATILLAS"
                  style={styles.input}
                />
                <div style={styles.microActions}>
                  <button type="button" onClick={() => setShowInputModal(false)} style={styles.btnCancel}>Cancelar</button>
                  <button type="submit" style={styles.btnSave}>Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- MICRO-MODAL: CONFIRM DELETE --- */}
        {showDeleteModal && (
          <div style={styles.microOverlay}>
            <div style={styles.microModal}>
              <h4 style={{marginTop:0, color:'#d9534f'}}>⚠️ Eliminar Categoría</h4>
              <p style={{fontSize:'14px'}}>¿Estás seguro de eliminar esta categoría permanentemente?</p>
              <div style={styles.microActions}>
                <button onClick={() => setShowDeleteModal(false)} style={styles.btnCancel}>Cancelar</button>
                <button onClick={handleConfirmDelete} style={styles.btnDeleteConfirm}>Sí, Eliminar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ESTILOS
const styles = {
  // Modal Principal
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 9000, display:'flex', justifyContent:'center', alignItems:'center' },
  modal: { background: '#f0f2f5', width: '700px', height: '600px', borderRadius: '12px', padding: '0', display:'flex', flexDirection:'column', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', position: 'relative' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px', background:'white', borderBottom:'1px solid #ddd' },
  closeBtn: { background:'none', border:'none', fontSize:'20px', cursor:'pointer', fontWeight:'bold', color: '#666' },
  navBar: { padding: '15px 20px', background: 'white', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center' },
  backLink: { background: '#e6f7ff', border: 'none', color: '#0050b3', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', padding: '20px', overflowY: 'auto' },
  
  // Cards
  card: { border: '1px solid #ddd', borderRadius: '10px', display:'flex', flexDirection:'column', background: 'white', transition: 'transform 0.1s', overflow: 'hidden' },
  cardContent: { padding: '15px', cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  cardTitle: { fontWeight: 'bold', fontSize: '14px', marginBottom: '5px', color: '#333' },
  addCard: { border: '2px dashed #bbb', borderRadius: '10px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor: 'pointer', color: '#666', minHeight: '100px', backgroundColor: 'rgba(255,255,255,0.5)' },
  badgeInfo: { fontSize:'11px', color:'#096dd9', backgroundColor: '#e6f7ff', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' },
  badgeEmpty: { fontSize:'11px', color:'#8c8c8c', backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' },
  actions: { display: 'flex', borderTop: '1px solid #eee' },
  editBtn: { flex: 1, background: 'white', border: 'none', borderRight: '1px solid #eee', padding: '10px', cursor: 'pointer', fontSize: '16px' },
  deleteBtn: { flex: 1, background: 'white', border: 'none', padding: '10px', cursor: 'pointer', fontSize: '16px', color: '#ff4d4f' },

  // MICRO-MODALES (Los nuevos estilos bonitos)
  microOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 9100, display:'flex', justifyContent:'center', alignItems:'center' },
  microModal: { background: 'white', padding: '25px', borderRadius: '8px', width: '300px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s' },
  input: { width: '100%', padding: '10px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' },
  microActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
  btnCancel: { padding: '8px 15px', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#555' },
  btnSave: { padding: '8px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  btnDeleteConfirm: { padding: '8px 15px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
};

export default DepartmentManagerModal;