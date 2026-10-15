// IndexedDB storage helper for user background image
// Avoids localStorage size limits (BGI-014)

const DB_NAME = 'dawvix_vault_theme_db';
const DB_VERSION = 1;
const STORE_NAME = 'background_image';
const IMAGE_KEY = 'custom_bg';

interface StoredImageRecord {
  id: string;
  dataUrl: string;
  updatedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save image file to IndexedDB as an optimized Data URL.
 */
export async function saveBackgroundImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const record: StoredImageRecord = {
          id: IMAGE_KEY,
          dataUrl,
          updatedAt: Date.now(),
        };

        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve(dataUrl);
        putRequest.onerror = () => reject(putRequest.error);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Load the stored background image Data URL from IndexedDB.
 */
export async function loadBackgroundImage(): Promise<string | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(IMAGE_KEY);

      getRequest.onsuccess = () => {
        const record = getRequest.result as StoredImageRecord | undefined;
        resolve(record ? record.dataUrl : null);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (err) {
    console.error('Failed to load background image from IndexedDB', err);
    return null;
  }
}

/**
 * Remove the stored background image from IndexedDB.
 */
export async function removeBackgroundImage(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const deleteRequest = store.delete(IMAGE_KEY);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  } catch (err) {
    console.error('Failed to delete background image from IndexedDB', err);
  }
}
