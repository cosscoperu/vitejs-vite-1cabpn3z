// fuente/firebase/config.js

import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage'; // <--- 1. NUEVO IMPORT

// Tu código de Firebase "pos cossco"
const firebaseConfig = {
  apiKey: 'AIzaSyAZK6L6CSYCGxY8z5Veno7P6dsUTtG-1xI',
  authDomain: 'pos-cossco.firebaseapp.com',
  projectId: 'pos-cossco',
  storageBucket: 'pos-cossco.firebasestorage.app',
  messagingSenderId: '621473837237',
  appId: '1:621473837237:web:f1c718e8522971ee988efc',
};

// --- NO CAMBIES NADA DEBAJO DE ESTA LÍNEA ---

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // <--- 2. INICIALIZAR STORAGE

// *** ¡AQUÍ ESTÁ LA MAGIA OFFLINE! ***
// Nota: Storage no tiene persistencia offline igual que Firestore,
// pero Firestore seguirá funcionando offline sin problemas.
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('¡Persistencia offline habilitada con éxito!');
  })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn(
        'Error al habilitar persistencia: Múltiples pestañas abiertas.'
      );
    } else if (err.code == 'unimplemented') {
      console.error('Error: Este navegador no soporta persistencia offline.');
    }
  });

// Exportamos la base de datos, autenticación y storage
export { db, auth, storage }; // <--- 3. EXPORTAR