/**
 * Telemetry Service - Local logging and error tracking
 * 
 * Features:
 * 1. Structured logging with context
 * 2. Persistent storage in IndexedDB (cleared on sign-out)
 * 3. Error capture with stack traces
 * 4. Performance metrics
 * 
 * PRIVACY: All data stored locally, cleared on sign-out via clearAllStudentData
 */

// ============================================================================
// Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    id?: number;
    timestamp: number;
    level: LogLevel;
    message: string;
    context?: Record<string, unknown>;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

export interface PerformanceMetric {
    name: string;
    duration: number;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// Configuration
// ============================================================================

const DB_NAME = 'sotd_student_telemetry';
const DB_VERSION = 1;
const LOGS_STORE = 'logs';
const METRICS_STORE = 'metrics';
const MAX_LOGS = 500; // Keep last 500 logs
const MAX_METRICS = 100; // Keep last 100 metrics

// Log level filter for console output (development)
const CONSOLE_LOG_LEVEL: LogLevel = 'debug';

// ============================================================================
// IndexedDB Helpers
// ============================================================================

let dbInstance: IDBDatabase | null = null;

const openDatabase = async (): Promise<IDBDatabase> => {
    if (dbInstance) return dbInstance;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Logs store with timestamp index for cleanup
            if (!db.objectStoreNames.contains(LOGS_STORE)) {
                const logStore = db.createObjectStore(LOGS_STORE, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                logStore.createIndex('timestamp', 'timestamp', { unique: false });
                logStore.createIndex('level', 'level', { unique: false });
            }

            // Metrics store
            if (!db.objectStoreNames.contains(METRICS_STORE)) {
                const metricStore = db.createObjectStore(METRICS_STORE, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                metricStore.createIndex('name', 'name', { unique: false });
                metricStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
};

// ============================================================================
// Logging Functions
// ============================================================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/**
 * Log a message at the specified level.
 */
export const log = async (
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
): Promise<void> => {
    const entry: LogEntry = {
        timestamp: Date.now(),
        level,
        message,
        context,
        error: error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
        } : undefined,
    };

    // Console output for development
    if (LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[CONSOLE_LOG_LEVEL]) {
        const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
        console[consoleMethod](
            `[${level.toUpperCase()}] ${message}`,
            context || '',
            error || ''
        );
    }

    // Persist to IndexedDB
    try {
        const db = await openDatabase();
        const tx = db.transaction(LOGS_STORE, 'readwrite');
        const store = tx.objectStore(LOGS_STORE);
        store.add(entry);

        // Cleanup old logs
        await cleanupOldLogs(store);
    } catch (e) {
        // Fail silently - don't break the app for telemetry
        console.error('[Telemetry] Failed to persist log:', e);
    }
};

/**
 * Remove logs older than MAX_LOGS.
 */
const cleanupOldLogs = async (store: IDBObjectStore): Promise<void> => {
    return new Promise((resolve) => {
        const countRequest = store.count();
        countRequest.onsuccess = () => {
            const count = countRequest.result;
            if (count > MAX_LOGS) {
                // Get oldest entries and delete them
                const index = store.index('timestamp');
                const deleteCount = count - MAX_LOGS;
                let deleted = 0;

                index.openCursor().onsuccess = (event) => {
                    const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                    if (cursor && deleted < deleteCount) {
                        cursor.delete();
                        deleted++;
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
            } else {
                resolve();
            }
        };
    });
};

// ============================================================================
// Convenience Logging Methods
// ============================================================================

export const logDebug = (message: string, context?: Record<string, unknown>) =>
    log('debug', message, context);

export const logInfo = (message: string, context?: Record<string, unknown>) =>
    log('info', message, context);

export const logWarn = (message: string, context?: Record<string, unknown>) =>
    log('warn', message, context);

export const logError = (message: string, error?: Error, context?: Record<string, unknown>) =>
    log('error', message, context, error);

// ============================================================================
// Performance Metrics
// ============================================================================

const activeTimers = new Map<string, number>();

/**
 * Start a performance timer.
 */
export const startTimer = (name: string): void => {
    activeTimers.set(name, performance.now());
};

/**
 * End a performance timer and record the metric.
 */
export const endTimer = async (name: string, metadata?: Record<string, unknown>): Promise<number> => {
    const startTime = activeTimers.get(name);
    if (!startTime) {
        console.warn(`[Telemetry] No timer found for: ${name}`);
        return 0;
    }

    const duration = performance.now() - startTime;
    activeTimers.delete(name);

    const metric: PerformanceMetric = {
        name,
        duration,
        timestamp: Date.now(),
        metadata,
    };

    // Persist metric
    try {
        const db = await openDatabase();
        const tx = db.transaction(METRICS_STORE, 'readwrite');
        const store = tx.objectStore(METRICS_STORE);
        store.add(metric);
    } catch (e) {
        console.error('[Telemetry] Failed to persist metric:', e);
    }

    logDebug(`Performance: ${name}`, { durationMs: duration.toFixed(2), ...metadata });
    return duration;
};

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

export interface RetryOptions {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Execute a function with exponential backoff retry.
 */
export const withRetry = async <T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> => {
    const {
        maxRetries = 3,
        baseDelayMs = 1000,
        maxDelayMs = 10000,
        onRetry,
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt === maxRetries) {
                logError(`Failed after ${maxRetries} attempts`, lastError);
                throw lastError;
            }

            // Calculate delay with exponential backoff + jitter
            const delay = Math.min(
                baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100,
                maxDelayMs
            );

            logWarn(`Attempt ${attempt} failed, retrying in ${delay.toFixed(0)}ms`, {
                error: lastError.message,
            });

            onRetry?.(attempt, lastError);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
};

// ============================================================================
// Log Retrieval (for debugging)
// ============================================================================

/**
 * Get recent logs (for debugging purposes).
 */
export const getRecentLogs = async (limit: number = 50): Promise<LogEntry[]> => {
    try {
        const db = await openDatabase();
        const tx = db.transaction(LOGS_STORE, 'readonly');
        const store = tx.objectStore(LOGS_STORE);
        const index = store.index('timestamp');

        return new Promise((resolve) => {
            const logs: LogEntry[] = [];
            index.openCursor(null, 'prev').onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor && logs.length < limit) {
                    logs.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(logs);
                }
            };
        });
    } catch (e) {
        console.error('[Telemetry] Failed to retrieve logs:', e);
        return [];
    }
};
