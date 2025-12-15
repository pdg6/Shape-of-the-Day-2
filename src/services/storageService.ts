/**
 * Storage Service - Secure local storage abstraction for student data
 * 
 * Features:
 * 1. Prefixed storage keys to isolate student data
 * 2. 24-hour auto-expiry for cached data
 * 3. Comprehensive clear function for sign-out
 * 4. IndexedDB support for larger datasets
 */

const STORAGE_PREFIX = 'sotd_student_';
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const DB_NAME = `${STORAGE_PREFIX}cache`;
const DB_VERSION = 1;

// ============================================================================
// Types
// ============================================================================

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

interface PendingOperation {
    id: string;
    type: 'status_update' | 'comment_update' | 'help_request';
    taskId: string;
    payload: Record<string, unknown>;
    timestamp: number;
    retryCount: number;
}

// ============================================================================
// IndexedDB Helpers
// ============================================================================

/**
 * Opens the IndexedDB database, creating object stores if needed
 */
const openDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Store for cached tasks
            if (!db.objectStoreNames.contains('tasks')) {
                db.createObjectStore('tasks', { keyPath: 'id' });
            }

            // Store for pending operations (offline queue)
            if (!db.objectStoreNames.contains('pendingOps')) {
                db.createObjectStore('pendingOps', { keyPath: 'id' });
            }

            // Store for telemetry logs
            if (!db.objectStoreNames.contains('logs')) {
                const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                logStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
};

// ============================================================================
// localStorage Helpers (with expiry)
// ============================================================================

/**
 * Sets a value in localStorage with expiry timestamp
 */
export const setLocalStorage = <T>(key: string, data: T): void => {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + EXPIRY_MS,
    };
    try {
        localStorage.setItem(prefixedKey, JSON.stringify(entry));
    } catch (error) {
        console.error('[Storage] Failed to save to localStorage:', error);
    }
};

/**
 * Gets a value from localStorage, checking expiry
 * Returns null if expired or not found
 */
export const getLocalStorage = <T>(key: string): T | null => {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    try {
        const raw = localStorage.getItem(prefixedKey);
        if (!raw) return null;

        const entry: CacheEntry<T> = JSON.parse(raw);

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            localStorage.removeItem(prefixedKey);
            console.log(`[Storage] Cache expired for key: ${key}`);
            return null;
        }

        return entry.data;
    } catch (error) {
        console.error('[Storage] Failed to read from localStorage:', error);
        return null;
    }
};

// ============================================================================
// IndexedDB Operations
// ============================================================================

/**
 * Saves data to IndexedDB with expiry
 */
export const setIndexedDB = async <T extends { id: string }>(
    storeName: string,
    data: T[]
): Promise<void> => {
    try {
        const db = await openDatabase();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        for (const item of data) {
            const entry: CacheEntry<T> = {
                data: item,
                timestamp: Date.now(),
                expiresAt: Date.now() + EXPIRY_MS,
            };
            store.put({ ...item, _cache: entry });
        }

        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });

        db.close();
    } catch (error) {
        console.error('[Storage] Failed to save to IndexedDB:', error);
    }
};

/**
 * Gets all non-expired data from an IndexedDB store
 */
export const getIndexedDB = async <T>(storeName: string): Promise<T[]> => {
    try {
        const db = await openDatabase();
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);

        const items = await new Promise<T[]>((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const results = request.result
                    .filter((item: { _cache?: CacheEntry<T> }) => {
                        if (!item._cache) return true; // No expiry, keep it
                        return Date.now() <= item._cache.expiresAt;
                    })
                    .map((item: { _cache?: CacheEntry<T> }) => {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { _cache, ...data } = item;
                        return data as T;
                    });
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });

        db.close();
        return items;
    } catch (error) {
        console.error('[Storage] Failed to read from IndexedDB:', error);
        return [];
    }
};

// ============================================================================
// Pending Operations Queue (for offline support)
// ============================================================================

/**
 * Adds an operation to the offline queue
 */
export const queuePendingOperation = async (op: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> => {
    try {
        const db = await openDatabase();
        const tx = db.transaction('pendingOps', 'readwrite');
        const store = tx.objectStore('pendingOps');

        const pendingOp: PendingOperation = {
            ...op,
            id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            timestamp: Date.now(),
            retryCount: 0,
        };

        store.add(pendingOp);

        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });

        db.close();
        console.log('[Storage] Queued pending operation:', pendingOp.type);
    } catch (error) {
        console.error('[Storage] Failed to queue operation:', error);
    }
};

/**
 * Gets all pending operations from the queue
 */
export const getPendingOperations = async (): Promise<PendingOperation[]> => {
    return getIndexedDB<PendingOperation>('pendingOps');
};

/**
 * Removes a pending operation from the queue (after successful sync)
 */
export const removePendingOperation = async (id: string): Promise<void> => {
    try {
        const db = await openDatabase();
        const tx = db.transaction('pendingOps', 'readwrite');
        const store = tx.objectStore('pendingOps');

        store.delete(id);

        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });

        db.close();
    } catch (error) {
        console.error('[Storage] Failed to remove pending operation:', error);
    }
};

// ============================================================================
// CRITICAL: Clear All Student Data (for sign-out)
// ============================================================================

/**
 * Clears ALL student data from local storage
 * MUST be called on sign-out for privacy/security
 */
export const clearAllStudentData = async (): Promise<void> => {
    console.log('[Storage] Clearing all student data...');

    // 1. Clear prefixed localStorage items
    const localStorageKeys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
    localStorageKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`[Storage] Removed localStorage: ${key}`);
    });

    // 2. Clear ALL sessionStorage (student session data)
    sessionStorage.clear();
    console.log('[Storage] Cleared sessionStorage');

    // 3. Delete IndexedDB database entirely
    try {
        // Check if indexedDB.databases() is supported
        if (typeof indexedDB.databases === 'function') {
            const databases = await indexedDB.databases();
            const studentDbs = databases.filter(db => db.name?.startsWith(STORAGE_PREFIX));

            await Promise.all(
                studentDbs.map(db => new Promise<void>((resolve, reject) => {
                    if (!db.name) return resolve();
                    const request = indexedDB.deleteDatabase(db.name);
                    request.onsuccess = () => {
                        console.log(`[Storage] Deleted IndexedDB: ${db.name}`);
                        resolve();
                    };
                    request.onerror = () => reject(request.error);
                    request.onblocked = () => {
                        console.warn(`[Storage] IndexedDB delete blocked: ${db.name}`);
                        resolve(); // Continue anyway
                    };
                }))
            );
        } else {
            // Fallback: Delete the known database
            await new Promise<void>((resolve) => {
                const request = indexedDB.deleteDatabase(DB_NAME);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve(); // Continue even on error
                request.onblocked = () => resolve();
            });
        }
    } catch (error) {
        console.error('[Storage] Error clearing IndexedDB:', error);
    }

    console.log('[Storage] ✓ All student data cleared');
};

// ============================================================================
// Utility: Check if cache is expired
// ============================================================================

/**
 * Checks if cached data is still valid
 */
export const isCacheValid = (key: string): boolean => {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    try {
        const raw = localStorage.getItem(prefixedKey);
        if (!raw) return false;

        const entry: CacheEntry<unknown> = JSON.parse(raw);
        return Date.now() <= entry.expiresAt;
    } catch {
        return false;
    }
};

/**
 * Gets the cache age in milliseconds
 */
export const getCacheAge = (key: string): number | null => {
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    try {
        const raw = localStorage.getItem(prefixedKey);
        if (!raw) return null;

        const entry: CacheEntry<unknown> = JSON.parse(raw);
        return Date.now() - entry.timestamp;
    } catch {
        return null;
    }
};
