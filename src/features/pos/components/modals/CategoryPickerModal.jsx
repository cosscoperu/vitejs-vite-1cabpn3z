import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../../firebase/config';
// 👇 IMPORTANTE: Agregamos addDoc para poder guardar
import { collection, query, getDocs, addDoc } from 'firebase/firestore'; 
import toast from 'react-hot-toast';

// --- ICONOS SVG (Los mismos que tenías + IconPlus) ---
const IconSparkles = ({ color = '#0ea5e9', size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
);
const IconHome = ({ color = '#64748b', size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const IconFolder = ({ color = '#3b82f6', size = 32 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
);
const IconTag = ({ color = '#10b981', size = 32 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
);
const IconArrowLeft = ({ color = 'currentColor', size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
const IconChevronRight = ({ color = '#cbd5e1', size = 14 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
const IconCheck = ({ color = '#10b981', size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
);
const IconClose = ({ color = '#64748b', size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
// Nuevo Icono Plus para crear
const IconPlus = ({ size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
);

function CategoryPickerModal({ show, onClose, onSelect }) {
  const [allDepartments, setAllDepartments] = useState([]);
  const [currentParent, setCurrentParent] = useState(null);
  const [departmentPath, setDepartmentPath] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  // Estados para CREAR NUEVA CATEGORÍA
  const [isCreating, setIsCreating] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creatingLoading, setCreatingLoading] = useState(false);

  // --- 1. CARGA DE DATOS ---
  useEffect(() => {
    if (show) {
      loadDepartments();
      // Resetear navegación al abrir
      setCurrentParent(null);
      setDepartmentPath([]);
      setIsCreating(false);
    }
  }, [show]);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'departments'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllDepartments(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar categorías");
    }
    setLoading(false);
  };

  // --- 2. FILTRADO ---
  const currentLevelItems = useMemo(() => {
    return allDepartments
      .filter(dep => dep.parentId === currentParent)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allDepartments, currentParent]);

  const hasChildren = (deptId) => allDepartments.some(d => d.parentId === deptId);

  // --- 3. CREACIÓN DE CATEGORÍA (NUEVO) ---
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setCreatingLoading(true);
    try {
      // Guardamos en Firebase con el parentId actual (la carpeta donde estamos parados)
      const docRef = await addDoc(collection(db, 'departments'), {
        name: newCatName.trim(),
        parentId: currentParent, // <--- AQUÍ ESTÁ LA MAGIA DE LA JERARQUÍA
        createdAt: new Date()
      });

      // Actualizamos el estado local para verlo al instante
      const newDept = {
        id: docRef.id,
        name: newCatName.trim(),
        parentId: currentParent
      };

      setAllDepartments([...allDepartments, newDept]);
      toast.success('Categoría creada');
      setNewCatName('');
      setIsCreating(false);
    } catch (error) {
      console.error(error);
      toast.error('Error al crear');
    }
    setCreatingLoading(false);
  };

  // --- 4. NAVEGACIÓN ---
  const handleEnter = (dept) => {
    if (hasChildren(dept.id)) {
      setCurrentParent(dept.id);
      setDepartmentPath([...departmentPath, dept]);
    } else {
      confirmSelection(dept);
    }
  };

  const handleBack = () => {
    const newPath = [...departmentPath];
    newPath.pop();
    setDepartmentPath(newPath);
    const prev = newPath[newPath.length - 1];
    setCurrentParent(prev ? prev.id : null);
  };

  // --- 5. SELECCIÓN ---
  const confirmSelection = (dept) => {
    const fullPathArray = [...departmentPath, dept];
    const fullPathString = fullPathArray.map(d => d.name).join(' > ');
    
    onSelect({
      id: dept.id,
      name: dept.name,
      fullPath: fullPathString
    });
    onClose();
  };

  const selectCurrentFolder = () => {
    if (departmentPath.length === 0) return;
    const currentDept = departmentPath[departmentPath.length - 1];
    
    onSelect({
      id: currentDept.id,
      name: currentDept.name,
      fullPath: departmentPath.map(d => d.name).join(' > ')
    });
    onClose();
  };

  if (!show) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* HEADER */}
        <div style={styles.header}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
             <IconSparkles />
             <div>
                <h3 style={styles.title}>Seleccionar Categoría</h3>
                <p style={styles.subtitle}>Navega o crea nuevas carpetas.</p>
             </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <IconClose />
          </button>
        </div>

        {/* BARRA DE ACCIÓN Y NAVEGACIÓN */}
        <div style={styles.navBar}>
           {/* Botón Atrás */}
           {currentParent ? (
             <button onClick={handleBack} style={styles.backBtn}>
               <IconArrowLeft color="#334155" /> Atrás
             </button>
           ) : (
             <span style={styles.rootIcon}><IconHome /></span>
           )}
           
           {/* Breadcrumbs */}
           <div style={styles.breadcrumbs}>
             <span style={currentParent ? styles.pathTextInactive : styles.pathTextActive}>
               {currentParent ? 'Inicio' : 'Todas'}
             </span>
             {departmentPath.map((dept, index) => (
                <React.Fragment key={dept.id}>
                  <span style={styles.separator}><IconChevronRight /></span>
                  <span style={index === departmentPath.length - 1 ? styles.pathTextActive : styles.pathTextInactive}>
                    {dept.name}
                  </span>
                </React.Fragment>
             ))}
           </div>

           {/* ESPACIADOR */}
           <div style={{flex:1}}></div>

           {/* BOTÓN CREAR NUEVA (Lado derecho) */}
           <button 
             onClick={() => setIsCreating(!isCreating)} 
             style={isCreating ? styles.btnCancelCreate : styles.btnNewFolder}
           >
             {isCreating ? 'Cancelar' : (
               <><IconPlus /> Nueva Carpeta</>
             )}
           </button>
        </div>

        {/* AREA DE CREACIÓN (Se muestra si isCreating es true) */}
        {isCreating && (
          <form onSubmit={handleCreateCategory} style={styles.createForm}>
             <span style={{fontSize:'13px', color:'#334155'}}>
               Crear carpeta dentro de: <strong>{departmentPath.length > 0 ? departmentPath[departmentPath.length-1].name : 'Inicio (Raíz)'}</strong>
             </span>
             <div style={{display:'flex', gap:'8px', marginTop:'8px'}}>
               <input 
                 autoFocus
                 type="text" 
                 placeholder="Nombre de la nueva categoría..." 
                 value={newCatName}
                 onChange={(e) => setNewCatName(e.target.value)}
                 style={styles.inputCreate}
               />
               <button type="submit" disabled={creatingLoading} style={styles.btnSaveCreate}>
                 {creatingLoading ? '...' : 'Guardar'}
               </button>
             </div>
          </form>
        )}

        {/* GRID DE CONTENIDO */}
        <div style={styles.gridBg}>
            <div style={styles.grid}>
            {loading && <p style={{textAlign:'center', color:'#64748b', width:'100%', gridColumn:'1/-1'}}>Cargando...</p>}
            
            {/* Estado Vacío */}
            {!loading && currentLevelItems.length === 0 && !isCreating && (
                <div style={styles.emptyState}>
                <IconFolder size={48} color="#cbd5e1" />
                <p style={{margin:'15px 0', fontWeight:'600', color:'#334155'}}>Esta carpeta está vacía.</p>
                <button onClick={() => setIsCreating(true)} style={styles.btnCreateEmpty}>
                  + Crear primera categoría aquí
                </button>
                {currentParent && (
                    <button onClick={selectCurrentFolder} style={styles.btnSelectThis}>
                    ✅ Seleccionar carpeta actual "{departmentPath[departmentPath.length-1]?.name}"
                    </button>
                )}
                </div>
            )}

            {currentLevelItems.map(dept => {
                const isFolder = hasChildren(dept.id);
                const isHovered = hoveredId === dept.id;
                
                // Si es carpeta, se ve azulita. Si no, verde.
                const cardStyle = isFolder 
                    ? (isHovered ? {...styles.cardFolder, ...styles.cardHover} : styles.cardFolder)
                    : (isHovered ? {...styles.cardLeaf, ...styles.cardHover} : styles.cardLeaf);

                return (
                <div 
                    key={dept.id} 
                    style={cardStyle}
                    onClick={() => handleEnter(dept)}
                    onMouseEnter={() => setHoveredId(dept.id)}
                    onMouseLeave={() => setHoveredId(null)}
                >
                    <div style={styles.iconContainer}>
                      {isFolder ? <IconFolder /> : <IconTag />}
                    </div>
                    <span style={styles.cardText}>
                    {dept.name}
                    </span>
                    
                    <span style={styles.arrowIndicator}>
                        {isFolder ? <IconChevronRight color={isHovered ? '#0ea5e9' : '#cbd5e1'} /> : <IconCheck />}
                    </span>

                    {/* Botón flotante "Usar" solo al hacer hover en carpeta */}
                    {isFolder && isHovered && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); confirmSelection(dept); }}
                        style={styles.miniSelectBtn}
                        title={`Seleccionar "${dept.name}"`}
                    >
                        Usar
                    </button>
                    )}
                </div>
                )
            })}
            </div>
        </div>

        <div style={styles.footer}>
           <button onClick={onClose} style={styles.btnCloseFooter}>
              Cerrar
           </button>
        </div>

      </div>
    </div>
  );
}

// --- ESTILOS ---
const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display:'flex', justifyContent:'center', alignItems:'center', backdropFilter: 'blur(4px)' },
  modal: { background: 'white', width: '680px', height: '650px', borderRadius: '20px', display:'flex', flexDirection:'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow:'hidden' },
  
  header: { padding: '20px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'start', background: 'white' },
  title: { margin: 0, fontSize: '22px', color: '#0f172a', fontWeight: '800' },
  subtitle: { margin: '5px 0 0 0', color: '#64748b', fontSize: '14px' },
  closeBtn: { background:'#f8fafc', border:'none', cursor:'pointer', borderRadius:'50%', width:'36px', height:'36px', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' },
  
  // NavBar Mejorada
  navBar: { padding: '10px 30px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '60px' },
  backBtn: { background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', padding: '6px 12px', fontWeight: '700', color:'#334155', fontSize:'12px', display:'flex', alignItems:'center', gap:'6px', boxShadow:'0 1px 2px rgba(0,0,0,0.05)' },
  rootIcon: { display:'flex', alignItems:'center' },
  breadcrumbs: { display:'flex', alignItems:'center', flexWrap:'wrap', gap:'6px', maxWidth: '350px' },
  separator: { display:'flex', alignItems:'center' },
  pathTextInactive: { color: '#64748b', fontSize: '13px', fontWeight:'600' },
  pathTextActive: { color: '#0ea5e9', fontSize: '13px', fontWeight:'800' },

  // Botones de Crear
  btnNewFolder: { display:'flex', alignItems:'center', gap:'6px', background:'#0ea5e9', color:'white', border:'none', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', fontSize:'13px', boxShadow:'0 2px 4px rgba(14, 165, 233, 0.3)' },
  btnCancelCreate: { background:'#ef4444', color:'white', border:'none', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', fontSize:'13px' },

  // Formulario de Creación
  createForm: { padding: '15px 30px', background: '#f0f9ff', borderBottom: '1px solid #bae6fd' },
  inputCreate: { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd', outline:'none' },
  btnSaveCreate: { background:'#0284c7', color:'white', border:'none', padding:'0 20px', borderRadius:'8px', cursor:'pointer', fontWeight:'bold' },

  // Grid
  gridBg: { flex: 1, background: '#f0f9ff', padding:'25px', overflowY:'auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px', alignContent: 'start' },
  
  // Footer
  footer: { padding: '15px 30px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', background: 'white' },
  btnCloseFooter: { padding: '10px 24px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' },

  // Tarjetas
  cardBase: { borderRadius: '16px', padding: '15px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor: 'pointer', transition: 'all 0.2s ease-in-out', position: 'relative', minHeight: '130px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' },
  cardHover: { transform: 'translateY(-3px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' },
  get cardFolder() { return { ...this.cardBase, background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)', border: '2px solid #bae6fd' } },
  get cardLeaf() { return { ...this.cardBase, background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)', border: '2px solid #6ee7b7' } },
  
  iconContainer: { marginBottom:'10px' },
  cardText: { fontWeight:'700', textAlign:'center', lineHeight:'1.2', color:'#334155', fontSize:'13px' },
  arrowIndicator: { position:'absolute', bottom:'10px', right:'12px', display:'flex', alignItems:'center' },
  
  miniSelectBtn: { position: 'absolute', top: '-8px', left:'50%', transform:'translateX(-50%)', fontSize: '10px', padding: '4px 10px', background: '#0ea5e9', color:'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight:'bold', boxShadow:'0 4px 10px rgba(14, 165, 233, 0.3)', whiteSpace:'nowrap', zIndex:2 },
  
  // Empty State
  emptyState: { gridColumn:'1/-1', textAlign:'center', color:'#64748b', padding:'30px', background:'white', borderRadius:'16px', border:'2px dashed #cbd5e1', display:'flex', flexDirection:'column', alignItems:'center' },
  btnSelectThis: { padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight:'bold', marginTop:'10px', fontSize:'13px' },
  btnCreateEmpty: { padding: '10px 20px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight:'bold', fontSize:'13px' },
};

export default CategoryPickerModal;