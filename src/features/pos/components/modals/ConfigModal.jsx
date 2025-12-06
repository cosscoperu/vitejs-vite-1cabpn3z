// src/components/ConfigModal.jsx
import React, { useState, useEffect } from 'react';
import { db, storage } from '../../../../firebase/config'; // <-- Importamos storage
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // <-- Funciones de Storage
import toast from 'react-hot-toast';
import { COUNTRY_TEMPLATES } from '../../../../utils/countryData';
import { Upload, Link as LinkIcon, Image as ImageIcon } from 'lucide-react'; // Iconos para la UI

const STORAGE_KEY = 'POS_GLOBAL_CONFIG';

function ConfigModal({ show, onClose }) {
  const [activeTab, setActiveTab] = useState('company'); 
  const [loading, setLoading] = useState(false);
  
  // Estado de carga específico para imágenes
  const [uploadingField, setUploadingField] = useState(null); 

  const [companyData, setCompanyData] = useState({
    name: '', ruc: '', address: '', phone: '', 
    logoUrl: '', 
    qrImage: '', 
    socialQrImage: '', 
    showLogoOnTicket: true, 
    paperSize: '80mm',
    socialFacebook: '', socialInstagram: '', socialTiktok: '', socialWeb: '',
    footerLines: ['¡Gracias por su compra!', 'Conserve este voucher.'],
    brandColor: '#D4AF37'
  });

  const [posConfig, setPosConfig] = useState(COUNTRY_TEMPLATES.PERU);

  useEffect(() => {
    if (show) loadSettings();
  }, [show]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'company');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const { posConfig: savedPosConfig, ...savedCompanyData } = data;
        setCompanyData(prev => ({ ...prev, ...savedCompanyData }));

        if (savedPosConfig) {
          setPosConfig(savedPosConfig);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPosConfig));
        } else {
            const local = localStorage.getItem(STORAGE_KEY);
            if(local) setPosConfig(JSON.parse(local));
        }
      } else {
        setCompanyData(prev => ({ ...prev, name: 'MI EMPRESA SAC', ruc: '20600000001', address: 'Av. Principal 123' }));
      }
    } catch (error) {
      console.error("Error cargando:", error);
      toast.error("Error al cargar configuración");
    }
    setLoading(false);
  };

  const handleCompanyChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setCompanyData({ ...companyData, [e.target.name]: value });
  };

  // --- LÓGICA DE SUBIDA DE IMÁGENES (NUEVO) ---
  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
        toast.error('Solo se permiten imágenes (JPG, PNG)');
        return;
    }

    setUploadingField(fieldName);
    const toastId = toast.loading('Subiendo imagen...');

    try {
        // Crear referencia: uploads/logo_TIMESTAMP.png
        const storageRef = ref(storage, `uploads/${fieldName}_${Date.now()}`);
        
        // Subir
        await uploadBytes(storageRef, file);
        
        // Obtener URL
        const downloadURL = await getDownloadURL(storageRef);
        
        // Actualizar estado
        setCompanyData(prev => ({ ...prev, [fieldName]: downloadURL }));
        
        toast.success('Imagen subida correctamente', { id: toastId });
    } catch (error) {
        console.error("Error subiendo:", error);
        toast.error('Error al subir imagen', { id: toastId });
    }
    setUploadingField(null);
  };

  // --- Helpers de Footer ---
  const addFooterLine = () => setCompanyData(prev => ({ ...prev, footerLines: [...prev.footerLines, ''] }));
  
  const updateFooterLine = (index, value) => {
    const newLines = [...companyData.footerLines];
    newLines[index] = value;
    setCompanyData(prev => ({ ...prev, footerLines: newLines }));
  };
  
  const removeFooterLine = (index) => {
    const newLines = [...companyData.footerLines];
    newLines.splice(index, 1);
    setCompanyData(prev => ({ ...prev, footerLines: newLines }));
  };

  const handleCountryChange = (countryCode) => {
    if (COUNTRY_TEMPLATES[countryCode]) setPosConfig({ ...COUNTRY_TEMPLATES[countryCode] });
  };

  const toggleMethod = (methodId) => {
    setPosConfig(prev => ({
      ...prev,
      methods: prev.methods.map(m => m.id === methodId ? { ...m, enabled: !m.enabled } : m)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fullConfigToSave = { ...companyData, posConfig: posConfig };
      await setDoc(doc(db, 'settings', 'company'), fullConfigToSave);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posConfig));
      window.dispatchEvent(new Event('theme-changed')); 
      window.dispatchEvent(new Event('pos-config-updated')); 
      toast.success("¡Configuración guardada!");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar.");
    }
    setLoading(false);
  };

  // --- COMPONENTE INTERNO: INPUT DE IMAGEN HÍBRIDO ---
  const ImageInput = ({ label, name, value, placeholder }) => (
    <div style={styles.imageInputContainer}>
        <label style={styles.label}>{label}</label>
        
        <div style={{display: 'flex', gap: '15px', alignItems: 'flex-start', marginTop: '5px'}}>
            {/* Previsualización */}
            <div style={styles.previewBox}>
                {value ? (
                    <img src={value} alt="Preview" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
                ) : (
                    <ImageIcon size={24} color="#cbd5e1" />
                )}
            </div>

            {/* Controles */}
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {/* Opción 1: Subir */}
                <label style={uploadingField === name ? styles.btnUploading : styles.btnUpload}>
                    <input 
                        type="file" 
                        hidden 
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, name)}
                        disabled={uploadingField !== null}
                    />
                    <Upload size={14} />
                    {uploadingField === name ? 'Subiendo...' : 'Subir imagen desde PC'}
                </label>

                {/* Separador */}
                <div style={{fontSize: '10px', color: '#94a3b8', textAlign: 'center'}}>— O PEGAR LINK —</div>

                {/* Opción 2: Link */}
                <div style={{position: 'relative'}}>
                    <LinkIcon size={14} style={{position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8'}} />
                    <input 
                        name={name} 
                        value={value} 
                        onChange={handleCompanyChange} 
                        style={{...styles.input, paddingLeft: '30px'}} 
                        placeholder={placeholder} 
                    />
                </div>
            </div>
        </div>
    </div>
  );

  if (!show) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        
        <div style={styles.headerContainer}>
          <div style={styles.headerTitle}>⚙️ Configuración del Sistema</div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.tabsHeader}>
          <button style={activeTab === 'company' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('company')}>🏢 Empresa & Marca</button>
          <button style={activeTab === 'ticket' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('ticket')}>🧾 Diseño Ticket</button>
          <button style={activeTab === 'pos' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('pos')}>💳 Pagos y Moneda</button>
        </div>

        <form onSubmit={handleSave} style={styles.formContent}>
          
          {/* --- TAB 1: EMPRESA --- */}
          {activeTab === 'company' && (
            <div style={styles.tabContent}>
               <div style={styles.alertBox}>
                 🎨 <b>Branding:</b> Configura la identidad visual de tu ticket y sistema.
               </div>

              <div style={styles.row}>
                <div style={{...styles.group, flex: 0.3}}>
                    <label style={styles.label}>Color Marca:</label>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        <input type="color" name="brandColor" value={companyData.brandColor} onChange={handleCompanyChange} style={{width: '50px', height: '40px', padding: 0, border: 'none', cursor: 'pointer'}} />
                    </div>
                </div>
                <div style={{...styles.group, flex: 1}}>
                  <label style={styles.label}>Nombre Comercial:</label>
                  <input name="name" value={companyData.name} onChange={handleCompanyChange} style={styles.input} required placeholder="Ej: Bodega Don Pepe"/>
                </div>
              </div>

              <div style={styles.row}>
                 <div style={styles.group}><label style={styles.label}>RUC / NIT / ID:</label><input name="ruc" value={companyData.ruc} onChange={handleCompanyChange} style={styles.input} required /></div>
                 <div style={styles.group}><label style={styles.label}>Teléfono:</label><input name="phone" value={companyData.phone} onChange={handleCompanyChange} style={styles.input} /></div>
              </div>

              <div style={styles.group}>
                <label style={styles.label}>Dirección Fiscal:</label>
                <input name="address" value={companyData.address} onChange={handleCompanyChange} style={styles.input} required />
              </div>

              {/* QR REDES SOCIALES */}
              <div style={{marginTop: '15px'}}>
                 <ImageInput 
                    label="QR Redes Sociales (Para tickets pagados):"
                    name="socialQrImage"
                    value={companyData.socialQrImage || ''}
                    placeholder="https://... (o sube imagen)"
                 />
              </div>
              
              <div style={styles.sectionDivider}>🌐 Redes Sociales</div>
              <div style={styles.row}>
                <div style={styles.group}><label style={styles.label}>Facebook:</label><input name="socialFacebook" value={companyData.socialFacebook || ''} onChange={handleCompanyChange} style={styles.input} /></div>
                <div style={styles.group}><label style={styles.label}>Instagram:</label><input name="socialInstagram" value={companyData.socialInstagram || ''} onChange={handleCompanyChange} style={styles.input} /></div>
              </div>
              <div style={styles.row}>
                <div style={styles.group}><label style={styles.label}>TikTok:</label><input name="socialTiktok" value={companyData.socialTiktok || ''} onChange={handleCompanyChange} style={styles.input} /></div>
                <div style={styles.group}><label style={styles.label}>Web:</label><input name="socialWeb" value={companyData.socialWeb || ''} onChange={handleCompanyChange} style={styles.input} /></div>
              </div>
            </div>
          )}

          {/* --- TAB 2: TICKET --- */}
          {activeTab === 'ticket' && (
            <div style={{...styles.tabContent, display: 'flex', gap: '20px'}}>
              <div style={{flex: 1, overflowY: 'auto', paddingRight: '10px'}}>
                <div style={styles.row}>
                   <div style={styles.group}>
                    <label style={styles.label}>Ancho Papel:</label>
                    <select name="paperSize" value={companyData.paperSize} onChange={handleCompanyChange} style={styles.select}>
                      <option value="80mm">80mm (Estándar)</option>
                      <option value="58mm">58mm (Pequeño)</option>
                    </select>
                  </div>
                  <div style={styles.group}>
                    <label style={styles.label}>Opciones:</label>
                    <label style={styles.toggleLabel}>
                      <input type="checkbox" name="showLogoOnTicket" checked={companyData.showLogoOnTicket} onChange={handleCompanyChange} />
                      <span style={{marginLeft: '8px'}}>Imprimir Logo</span>
                    </label>
                  </div>
                </div>

                {/* LOGO EMPRESA */}
                <div style={{marginTop: '10px'}}>
                    <ImageInput 
                        label="Logo de la Empresa:"
                        name="logoUrl"
                        value={companyData.logoUrl || ''}
                        placeholder="https://... (o sube imagen)"
                    />
                </div>

                <div style={styles.sectionDivider}>📝 Mensaje Pie de Página</div>
                <div style={styles.linesContainer}>
                  {companyData.footerLines && companyData.footerLines.map((line, index) => (
                    <div key={index} style={{display: 'flex', gap: '5px', marginBottom: '5px'}}>
                      <input value={line} onChange={(e) => updateFooterLine(index, e.target.value)} style={styles.input} placeholder={`Línea ${index + 1}`} />
                      <button type="button" onClick={() => removeFooterLine(index)} style={styles.btnIconDelete}>🗑️</button>
                    </div>
                  ))}
                  <button type="button" onClick={addFooterLine} style={styles.btnAddLine}>+ Agregar Línea</button>
                </div>
              </div>
              
              {/* PREVIEW SIMPLE */}
              <div style={{width: '240px', background: '#e0e0e0', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'center'}}>
                <div style={{background: 'white', width: '100%', padding: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', fontFamily: '"Courier New", Courier, monospace', fontSize: '10px', color: '#333', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '300px'}}>
                  {companyData.logoUrl ? (
                      <img src={companyData.logoUrl} alt="Logo" style={{maxWidth: '80%', maxHeight: '50px', marginBottom: '5px', objectFit:'contain'}} />
                  ) : <div style={{fontWeight:'bold', textAlign:'center', marginBottom:'10px'}}>[LOGO]</div>}
                  
                  <div style={{textAlign:'center'}}>{companyData.name}</div>
                  <div style={{textAlign:'center', marginTop:'20px'}}>... items ...</div>
                  <div style={{textAlign:'center', marginTop:'auto'}}>{companyData.footerLines[0]}</div>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 3: POS & PAGOS --- */}
          {activeTab === 'pos' && (
            <div style={styles.tabContent}>
               <div style={styles.group}>
                <label style={styles.label}>🌎 País de Operación:</label>
                <select value={posConfig.country} onChange={(e) => handleCountryChange(e.target.value)} style={styles.select}>
                   {Object.keys(COUNTRY_TEMPLATES).map(code => (
                      <option key={code} value={code}>{code}</option>
                   ))}
                </select>
              </div>

              {/* QR PAGO (YAPE) */}
              <div style={{marginTop: '20px'}}>
                 <ImageInput 
                    label="QR de COBRO (Yape/Plin) - Para Deudas:"
                    name="qrImage"
                    value={companyData.qrImage || ''}
                    placeholder="https://... (o sube imagen)"
                 />
              </div>

              <label style={{...styles.label, marginTop: '15px'}}>💳 Métodos de Pago Habilitados:</label>
              <div style={styles.methodsList}>
                {posConfig.methods.map(m => (
                  <label key={m.id} style={styles.methodItem}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      <span style={{fontSize:'20px'}}>{m.icon}</span>
                      <div>
                        <div style={{fontWeight:'bold', color:'#333'}}>{m.label}</div>
                        <div style={{fontSize:'10px', color:'#666'}}>Tecla: {m.shortcut}</div>
                      </div>
                    </div>
                    <input type="checkbox" checked={m.enabled} onChange={() => toggleMethod(m.id)} style={{width:'18px', height:'18px', cursor:'pointer'}} />
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={styles.footer}>
            <button type="button" onClick={onClose} style={styles.btnCancel}>Cancelar</button>
            <button type="submit" style={{...styles.btnSave, backgroundColor: companyData.brandColor}}>
              {loading ? 'Guardando...' : 'GUARDAR CONFIGURACIÓN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000, backdropFilter: 'blur(3px)' },
  modal: { background: 'white', borderRadius: '12px', width: '800px', boxShadow:'0 20px 50px rgba(0,0,0,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' },
  headerContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 25px', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' },
  headerTitle: { fontSize: '18px', fontWeight: 'bold', color: '#003366', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#666' },
  tabsHeader: { display: 'flex', borderBottom: '1px solid #ddd', backgroundColor: '#f0f2f5' },
  tab: { flex: 1, padding: '12px', border: 'none', background: 'none', cursor: 'pointer', color: '#666', fontWeight: '600', borderBottom: '3px solid transparent', fontSize: '14px' },
  tabActive: { flex: 1, padding: '12px', border: 'none', background: 'white', cursor: 'pointer', color: '#003366', fontWeight: 'bold', borderBottom: '3px solid #003366', fontSize: '14px' },
  formContent: { padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' },
  tabContent: { minHeight: '350px' },
  row: { display: 'flex', gap: '15px' },
  group: { flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' },
  label: { fontWeight: 'bold', fontSize: '13px', color: '#444' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box' },
  select: { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', backgroundColor: '#fff', width: '100%' },
  alertBox: { backgroundColor: '#e3f2fd', color: '#0d47a1', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px', borderLeft: '4px solid #2196f3' },
  methodsList: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '5px' },
  methodItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', border: '1px solid #eee', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'white' },
  toggleLabel: { display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', marginTop: '5px' },
  sectionDivider: { fontSize: '12px', fontWeight: 'bold', color: '#888', borderBottom: '1px solid #eee', paddingBottom: '5px', marginTop: '15px', marginBottom: '10px', textTransform: 'uppercase' },
  linesContainer: { display: 'flex', flexDirection: 'column', gap: '5px' },
  btnIconDelete: { background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', borderRadius: '4px', cursor: 'pointer', padding: '0 8px' },
  btnAddLine: { background: '#e8f5e9', color: '#2e7d32', border: '1px dashed #a5d6a7', borderRadius: '4px', cursor: 'pointer', padding: '8px', marginTop: '5px', fontSize: '12px', fontWeight: 'bold' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '15px' },
  btnCancel: { padding: '10px 20px', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', background: 'white', fontWeight:'bold', color: '#555' },
  btnSave: { padding: '10px 25px', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white', fontWeight: 'bold' },
  
  // ESTILOS NUEVOS PARA IMÁGENES
  imageInputContainer: { background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px dashed #cbd5e1' },
  previewBox: { width: '80px', height: '80px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  btnUpload: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#3b82f6', color: 'white', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  btnUploading: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#94a3b8', color: 'white', padding: '8px', borderRadius: '6px', cursor: 'not-allowed', fontSize: '13px' },
};

export default ConfigModal;