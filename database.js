(() => {
  const DB_NAME = 'portia-local-database';
  const DB_VERSION = 1;
  const STORES = ['profiles', 'portfolios', 'integrations', 'githubSnapshots'];
  let databasePromise;

  function openDatabase() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB no está disponible en este navegador.'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        STORES.forEach((store) => {
          if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store);
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('No se pudo abrir la base local.'));
    });
    return databasePromise;
  }

  async function get(storeName, key) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('No se pudo leer la base local.'));
    });
  }

  async function set(storeName, key, value) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(storeName, 'readwrite').objectStore(storeName).put(value, key);
      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error || new Error('No se pudo guardar en la base local.'));
    });
  }

  async function remove(storeName, key) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(storeName, 'readwrite').objectStore(storeName).delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('No se pudo borrar de la base local.'));
    });
  }

  window.PortiaDB = { get, set, remove };
})();
