// src/features/pos/components/modals/DepartmentSelectorModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { db } from "../../../../firebase/config";
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import useHotkeys from "../../../../hooks/useHotkeys";
import toast from 'react-hot-toast';

// Íconos consistentes con tu POS
import { Folder, Package, ChevronRight, ArrowLeft, X, Home, Search } from 'lucide-react';

function DepartmentSelectorModal({ show, onClose, onProductSelect, businessId = 'default_business' }) {
  
  // ESTADOS
  const [view, setView] = useState('departments'); 
  const [allDepartments, setAllDepartments] = useState([]);
  const [currentParent, setCurrentParent] = useState(null);
  const [departmentPath, setDepartmentPath] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedDeptName, setSelectedDeptName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);

  // EFECTO AL ABRIR
  useEffect(() => {
    if (show) {
      setView("departments");
      setCurrentParent(null);
      setDepartmentPath([]);
      setProducts([]);

      if (allDepartments.length === 0) {
        fetchDepartments();
      }
    }
  }, [show]);

  // CARGAR TODAS LAS CATEGORÍAS
  const fetchDepartments = async () => {
    setLoadingDepts(true);
    try {
      const q = query(collection(db, "departments"));
      const snapshot = await getDocs(q);
      const depts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllDepartments(depts);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando categorías");
    }
    setLoadingDepts(false);
  };

  // CARGAR PRODUCTOS DE UNA CATEGORÍA
  const fetchProducts = async (deptId, deptName) => {
    setLoading(true);
    setProducts([]);
    setSelectedDeptName(deptName);

    try {
      const q = query(
        collection(db, "products"),
        where("department", "==", deptId),
        limit(50)
      );

      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setProducts(list);
      setView("products");
    } catch (err) {
      console.error(err);
      toast.error("Error cargando productos");
    }

    setLoading(false);
  };

  // DEPARTAMENTOS DEL NIVEL ACTUAL
  const currentLevelDepartments = useMemo(() => {
    return allDepartments.filter(d => d.parentId === currentParent);
  }, [allDepartments, currentParent]);

  // VERIFICAR SUBCATEGORÍAS
  const hasChildren = (deptId) => {
    return allDepartments.some(dep => dep.parentId === deptId);
  };

  // CLICK EN CATEGORÍA
  const handleDeptClick = (dept) => {
    if (hasChildren(dept.id)) {
      setCurrentParent(dept.id);
      setDepartmentPath([...departmentPath, dept]);
    } else {
      fetchProducts(dept.id, dept.name);
    }
  };

  // BACK
  const handleBack = () => {
    if (view === "products") {
      setView("departments");
      return;
    }

    const newPath = [...departmentPath];
    newPath.pop();

    setDepartmentPath(newPath);

    const prev = newPath[newPath.length - 1];
    setCurrentParent(prev ? prev.id : null);
  };

  // BREADCRUMBS
  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      setCurrentParent(null);
      setDepartmentPath([]);
      setView("departments");
      return;
    }

    const newPath = departmentPath.slice(0, index + 1);
    setDepartmentPath(newPath);
    setCurrentParent(newPath[newPath.length - 1].id);
    setView("departments");
  };

  // CLICK PRODUCTO
  const handleProductClick = (product) => {
    onProductSelect(product);
    onClose();
  };

  // ATAJO ESC
  useHotkeys({ Escape: onClose }, [onClose], show);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">

      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl border overflow-hidden flex flex-col">

        {/* HEADER */}
        <div className="px-6 py-4 border-b flex justify-between bg-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {view === "departments"
              ? (<><Folder className="text-amber-500" /> Categorías</>)
              : (<><Package className="text-indigo-500" /> Productos</>)
            }
          </h2>

          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={22} />
          </button>
        </div>

        {/* BREADCRUMBS */}
        <div className="px-6 py-3 bg-slate-100 border-b flex items-center gap-2 overflow-x-auto">

          {/* HOME */}
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className={`px-2 py-1 rounded flex items-center gap-1 text-sm font-medium ${
              currentParent === null ? "bg-white shadow text-slate-800" : "text-slate-500"
            }`}>
            <Home size={14} /> Inicio
          </button>

          {departmentPath.map((dept, index) => (
            <React.Fragment key={dept.id}>
              <ChevronRight size={14} className="text-slate-400" />
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`px-2 py-1 rounded text-sm font-medium ${
                  index === departmentPath.length - 1 && view === "departments"
                    ? "bg-white shadow text-slate-800"
                    : "text-slate-500"
                }`}>
                {dept.name}
              </button>
            </React.Fragment>
          ))}

          {view === "products" && (
            <>
              <ChevronRight size={14} />
              <span className="px-2 py-1 text-sm font-bold text-indigo-600 bg-indigo-50 rounded border">
                {selectedDeptName}
              </span>
            </>
          )}
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">

          {/* CATEGORÍAS */}
          {view === "departments" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">

              {loadingDepts ? (
                <div className="col-span-full text-center py-20 text-slate-400">Cargando…</div>
              ) : currentLevelDepartments.length === 0 ? (
                <div className="col-span-full text-center py-20 text-slate-400">
                  <Folder size={40} className="mx-auto mb-2 opacity-20" />
                  No hay categorías aquí.
                </div>
              ) : (
                currentLevelDepartments.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => handleDeptClick(dept)}
                    className="group bg-white border rounded-xl p-6 flex flex-col items-center
                               hover:-translate-y-1 hover:shadow transition">

                    <div className={`p-3 rounded-full mb-3 ${
                      hasChildren(dept.id)
                      ? "bg-amber-100 text-amber-500"
                      : "bg-indigo-50 text-indigo-500"
                    }`}>
                      {hasChildren(dept.id) ? <Folder size={32} /> : <Search size={24} />}
                    </div>

                    <span className="font-bold text-sm text-center">{dept.name}</span>

                    {hasChildren(dept.id) && (
                      <span className="text-[10px] text-slate-400 mt-1">
                        Ver subcategorías
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* PRODUCTOS */}
          {view === "products" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">

              {/* Tarjeta volver */}
              <button
                onClick={handleBack}
                className="bg-slate-200 border rounded-xl p-4 flex flex-col items-center justify-center hover:bg-slate-300">

                <ArrowLeft size={24} className="mb-2 text-slate-600" />
                <span className="font-bold text-sm">Volver</span>
              </button>

              {loading ? (
                <div className="col-span-full py-20 text-center text-slate-400">Cargando productos…</div>
              ) : products.length === 0 ? (
                <div className="col-span-full text-center py-20 text-slate-400">
                  <Package size={40} className="mx-auto mb-2 opacity-20" />
                  No hay productos aquí.
                </div>
              ) : (
                products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className={`p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition relative
                                ${product.stock <= 0 ? "opacity-70 border-red-200" : "border-slate-200 hover:border-indigo-400"}
                                flex flex-col justify-between min-h-[140px]`}>

                    <div>
                      <h4 className="font-bold text-sm mb-1 line-clamp-2">{product.name}</h4>
                      <p className="text-xs text-slate-400 font-mono">{product.code || "S/C"}</p>
                    </div>

                    <div className="pt-2 border-t flex justify-between">
                      <span className={`text-lg font-bold ${
                        product.stock <= 0 ? "text-slate-400" : "text-emerald-600"
                      }`}>
                        S/ {product.price?.toFixed(2)}
                      </span>
                    </div>

                    {product.stock <= 0 && (
                      <span className="absolute top-2 right-2 bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        AGOTADO
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-50 border-t text-xs text-slate-500 flex justify-between">
          <span>
            {view === "departments"
              ? `${currentLevelDepartments.length} categorías`
              : `${products.length} productos`
            }
          </span>
          <button onClick={onClose} className="px-5 py-2 bg-slate-200 rounded-lg hover:bg-slate-300 font-bold">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}

export default DepartmentSelectorModal;
