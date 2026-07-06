const ProgressionDB = (() => {
  const DB_NAME = 'progression-wellness-v2';
  const DB_VERSION = 1;
  const STORES = [
    'messages',
    'dailyLogs',
    'timeline',
    'playbook',
    'memories',
    'habits',
    'meta'
  ];

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function tx(storeName, mode, callback) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const result = callback(store);
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    }).finally(() => db.close());
  }

  async function put(storeName, value) {
    await tx(storeName, 'readwrite', store => store.put(value));
    return value;
  }

  async function get(storeName, id) {
    const db = await openDB();
    try {
      return await requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).get(id));
    } finally {
      db.close();
    }
  }

  async function getAll(storeName) {
    const db = await openDB();
    try {
      return await requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());
    } finally {
      db.close();
    }
  }

  async function remove(storeName, id) {
    return tx(storeName, 'readwrite', store => store.delete(id));
  }

  async function clearStore(storeName) {
    return tx(storeName, 'readwrite', store => store.clear());
  }

  async function exportAll() {
    const data = { app: 'Progression Wellness', version: 2, exportedAt: new Date().toISOString(), stores: {} };
    for (const store of STORES) data.stores[store] = await getAll(store);
    return data;
  }

  async function importAll(payload) {
    if (!payload || !payload.stores) throw new Error('Invalid Progression export file.');
    for (const store of STORES) {
      await clearStore(store);
      const records = payload.stores[store] || [];
      for (const record of records) await put(store, record);
    }
  }

  async function clearAll() {
    for (const store of STORES) await clearStore(store);
  }

  return { put, get, getAll, remove, exportAll, importAll, clearAll };
})();
