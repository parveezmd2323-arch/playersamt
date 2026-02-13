
import { AppState } from '../types';

const DB_NAME = 'SPSIB_LEDGER_DB';
const STORE_NAME = 'app_state';
const DB_VERSION = 1;

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };
  });
};

export const saveState = async (state: AppState): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(state, 'current_state');

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save state'));
  });
};

export const loadState = async (): Promise<AppState | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('current_state');

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error('Failed to load state'));
  });
};
