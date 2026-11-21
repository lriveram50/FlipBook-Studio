/* FlipBook Studio - IndexedDB: proyectos y documentos PDF originales */
(function () {
  const DB_NAME = "FlipBookStudioDB";
  const DB_VERSION = 2;
  let dbPromise;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("Este navegador no admite IndexedDB."));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("projects")) {
          const store = db.createObjectStore("projects", { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("exports")) {
          db.createObjectStore("exports", { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("No se pudo abrir la base de datos."));
    });
    return dbPromise;
  }

  async function run(storeName, mode, action) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let request;
      try { request = action(store); }
      catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = () => reject(tx.error || new Error("Error de almacenamiento."));
      tx.onabort = () => reject(tx.error || new Error("Operación cancelada."));
    });
  }

  window.FlipBookDB = {
    getProjects: () => run("projects", "readonly", store => store.getAll()),
    getProject: id => run("projects", "readonly", store => store.get(id)),
    saveProject: project => run("projects", "readwrite", store => store.put(project)),
    deleteProject: id => run("projects", "readwrite", store => store.delete(id)),
    clearProjects: () => run("projects", "readwrite", store => store.clear()),
    getExports: () => run("exports", "readonly", store => store.getAll()),
    saveExport: item => run("exports", "readwrite", store => store.put(item)),
    async healthCheck() {
      const db = await openDB();
      return { ok: true, name: db.name, version: db.version };
    }
  };
})();