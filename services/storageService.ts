import { ScanResult } from '../types';

const DB_NAME = 'DuplicateFinderDB';
const STORE_NAME = 'scan_history';
const VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
};

export const saveScanResult = async (result: ScanResult) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        // Don't store the full file objects (too large/complex), store a summary
        const summary = {
            date: new Date().toISOString(),
            totalFiles: result.totalFiles,
            totalSize: result.totalSize,
            wastedSpace: result.wastedSpace,
            duplicateCount: result.duplicates.length,
            // Store simplified duplicates for history if needed
            topDuplicates: result.duplicates.slice(0, 5).map(g => ({
                name: g.files[0].name,
                wasted: g.totalWastedSize
            }))
        };

        const request = store.add(summary);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getScanHistory = async () => {
    const db = await initDB();
    return new Promise<any[]>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};
