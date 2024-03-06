type Log = {
  file: string;
  status: "processed" | "skipped";
  createdAt: number;
};

const DB_NAME = "sound-annotation";
const STORE_NAME = "logs";

const useLog = () => {
  let db: IDBDatabase | null = null;

  const openDB = async () => {
    if (db) return db;
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const store = db.createObjectStore(STORE_NAME, { keyPath: "file" });
        store.createIndex("createdAtIndex", "createdAt", { unique: false });
      };

      request.onsuccess = (event) => {
        db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  };

  const checkNeededToProcess = async (file: string) => {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise<boolean>((resolve, reject) => {
      const request = store.get(file);
      request.onsuccess = () => resolve(!request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const insertLog = async (log: Log) => {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise<void>((resolve, reject) => {
      const request = store.put(log);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  const getLastInsertedLog = async () => {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("createdAtIndex");

    return new Promise<Log | undefined>((resolve) => {
      const request = index.openCursor(null, "prev");
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        resolve(cursor ? (cursor.value as Log) : undefined);
      };
    });
  };

  return { checkNeededToProcess, insertLog, getLastInsertedLog };
};

export default useLog;
