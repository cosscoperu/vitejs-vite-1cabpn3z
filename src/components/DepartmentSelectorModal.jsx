import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
// Usamos los mismos iconos que tu POSInterface para mantener consistencia
import { Folder, Package, ChevronRight, ArrowLeft, X, Home, Search } from 'lucide-react';

function DepartmentSelectorModal({ show, onClose, onProductSelect, businessId = 'default_business' }) {
  
  // --- ESTADOS ---
  const [view, setView] = useState('departments'); // 'departments' | 'products'
  const [allDepartments, setAllDepartments] = useState([]); // Cache de categorías
  const [currentParent, setCurrentParent] = useState(null); // ID del padre actual
  const [departmentPath, setDepartmentPath] = useState([]); // Breadcrumbs
  
  const [products, setProducts] = useState([]); 
  const [selectedDeptName, setSelectedDeptName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);

  // --- EFECTOS ---
  useEffect(() => {
    if (show) {
      // Solo reseteamos la vista, pero si ya tenemos departamentos cargados, no los volvemos a pedir (Cache simple)
      setView('departments');
      setCurrentParent(null);
      setDepartmentPath([]);
      setProducts([]);
      
      if (allDepartments.length === 0) {
        fetchDepartments();
      }
    }
  }, [show]);

  // --- DATA FETCHING ---
  const fetchDepartments = async () => {
    setLoadingDepts(true);
    try {
      // Aquí traeríamos solo las categorías de este negocio
      const q = query(collection(db, 'departments')); 
      const snapshot = await getDocs(q);
      const depts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllDepartments(depts);
    } catch (error) {
      console.error("Error cargando departamentos:", error);
      toast.error("Error de conexión");
    }
    setLoadingDepts(false);
  };

  const fetchProducts = async (deptId, deptName) => {
    setLoading(true);
    setProducts([]);
    setSelectedDeptName(deptName);
    
    try {
      const q = query(
        collection(db, 'products'), 
        where('department', '==', deptId), // Asegúrate que en Firebase el campo se llame 'department' o 'categoryId'
        limit(50)
      );
      const snapshot = await getDocs(q);
      const productList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      setProducts(productList);
      setView('products');
    } catch (err) {
      console.error(err);
      toast.error('Error buscando productos');
    }
    setLoading(false);
  };

  // --- LÓGICA DE NAVEGACIÓN (Memory Tree) ---

  // Filtramos los hijos del nivel actual
  const currentLevelDepartments = useMemo(() => {
    return allDepartments.filter(dep => dep.parentId === currentParent);
  }, [allDepartments, currentParent]);

  // Verificamos si una categoría tiene subcarpetas
  const hasChildren = (deptId) => {
    return allDepartments.some(dep => dep.parentId === deptId);
  };

  const handleDeptClick = (dept) => {
    if (hasChildren(dept.id)) {
      // Navegar más profundo (Drill down)
      setCurrentParent(dept.id);
      setDepartmentPath([...departmentPath, dept]);
    } else {
      // Es una hoja (Leaf), cargar productos
      fetchProducts(dept.id, dept.name);
    }
  };

  // Navegar hacia atrás un nivel
  const handleBack = () => {
    if (view === 'products') {
      setView('departments');
      return;
    }
    if (currentParent) {
      const newPath = [...departmentPath];
      newPath.pop(); 
      setDepartmentPath(newPath);
      const prevDept = newPath[newPath.length - 1];
      setCurrentParent(prevDept ? prevDept.id : null);
    }
  };

  // Navegar usando Breadcrumbs (Saltar niveles)
  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      // Ir a Inicio
      setCurrentParent(null);
      setDepartmentPath([]);
      setView('departments');
      return;
    }
    // Ir a un nivel específico
    const targetDept = departmentPath[index];
    const newPath = departmentPath.slice(0, index + 1);
    setCurrentParent(targetDept.id);
    setDepartmentPath(newPath);
    setView('departments');
  };

  const handleProductClick = (product) => {
    onProductSelect(product);
    onClose();
  };

  if (!show) return null;

  // --- RENDERIZADO ---

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-50 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* HEADER MODAL */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {view === 'products' ? (
                <>
                  <Package className="text-indigo-500" /> Explorador de Productos
                </>
              ) : (
                <>
                  <Folder className="text-amber-500" /> Navegador de Categorías
                </>
              )}
            </h2>
            <p className="text-xs text-slate-400">Selecciona una categoría para ver sus items</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* BARRA DE NAVEGACIÓN (BREADCRUMBS) */}
        <div className="bg-slate-100 px-6 py-3 flex items-center gap-2 overflow-x-auto border-b border-slate-200">
          <button 
            onClick={() => handleBreadcrumbClick(-1)}
            className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded hover:bg-white transition-colors ${currentParent === null ? 'text-slate-800 bg-white shadow-sm' : 'text-slate-500'}`}
          >
            <Home size={14} /> Inicio
          </button>
          
          {departmentPath.map((dept, index) => (
            <React.Fragment key={dept.id}>
              <ChevronRight size={14} className="text-slate-400" />
              <button 
                onClick={() => handleBreadcrumbClick(index)}
                className={`text-sm font-medium px-2 py-1 rounded hover:bg-white transition-colors ${index === departmentPath.length - 1 && view === 'departments' ? 'text-slate-800 bg-white shadow-sm' : 'text-slate-500'}`}
              >
                {dept.name}
              </button>
            </React.Fragment>
          ))}

          {view === 'products' && (
            <>
              <ChevronRight size={14} className="text-slate-400" />
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                {selectedDeptName}
              </span>
            </>
          )}
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* VISTA DE DEPARTAMENTOS */}
          {view === 'departments' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {loadingDepts ? (
                 <div className="col-span-full text-center py-20 text-slate-400">Cargando estructura...</div>
              ) : currentLevelDepartments.length > 0 ? (
                currentLevelDepartments.map(dept => {
                  const isFolder = hasChildren(dept.id);
                  return (
                    <button
                      key={dept.id}
                      onClick={() => handleDeptClick(dept)}
                      className="group flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-amber-300 hover:-translate-y-1 transition-all duration-200 h-32"
                    >
                      <div className={`mb-3 p-3 rounded-full ${isFolder ? 'bg-amber-100 text-amber-500' : 'bg-indigo-50 text-indigo-500'}`}>
                        {isFolder ? <Folder size={32} fill="currentColor" className="opacity-80" /> : <Search size={24} />}
                      </div>
                      <span className="text-sm font-bold text-slate-700 text-center leading-tight group-hover:text-amber-700">
                        {dept.name}
                      </span>
                      {isFolder && <span className="text-[10px] text-slate-400 mt-1">Ver sub-categorías</span>}
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  <Folder size={48} className="mb-2 opacity-20" />
                  <p>Esta carpeta está vacía.</p>
                </div>
              )}
            </div>
          )}

          {/* VISTA DE PRODUCTOS */}
          {view === 'products' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              
              {/* Botón Volver (Tarjeta) */}
              <button onClick={handleBack} className="flex flex-col items-center justify-center p-4 bg-slate-200 border border-slate-300 rounded-xl hover:bg-slate-300 transition-colors h-full min-h-[140px]">
                <ArrowLeft size={24} className="text-slate-600 mb-2" />
                <span className="text-sm font-bold text-slate-700">Volver atrás</span>
              </button>

              {loading ? (
                <div className="col-span-full py-20 text-center text-slate-500">Buscando productos...</div>
              ) : products.length > 0 ? (
                products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className={`relative flex flex-col justify-between p-4 border rounded-xl text-left bg-white transition-all shadow-sm hover:shadow-lg group h-full min-h-[140px] ${product.stock <= 0 ? 'border-red-200 opacity-75' : 'border-slate-200 hover:border-indigo-400'}`}
                  >
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2 leading-tight">
                        {product.name}
                      </h4>
                      <p className="text-xs text-slate-400 mb-2 font-mono">
                        {product.code || 'S/C'}
                      </p>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-end">
                      <span className={`text-lg font-bold ${product.stock <= 0 ? 'text-slate-400' : 'text-emerald-600'}`}>
                        S/ {product.price?.toFixed(2)}
                      </span>
                    </div>

                    {/* Stock Badge */}
                    {product.stock <= 0 && (
                      <span className="absolute top-2 right-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        AGOTADO
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="col-span-full text-center py-20 text-slate-400">
                  <Package size={48} className="mx-auto mb-2 opacity-20" />
                  <p>No se encontraron productos en esta categoría.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <div className="text-xs text-slate-400">
            {view === 'departments' 
              ? `${currentLevelDepartments.length} categorías en este nivel`
              : `${products.length} productos encontrados`
            }
          </div>
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}

export default DepartmentSelectorModal;