/**
 * Debounce Utility - Prevents rapid-fire function calls
 * 
 * Used for:
 * 1. Status update sync (prevent multiple Firestore writes)
 * 2. Comment auto-save (wait for user to stop typing)
 */

// ============================================================================
// Types
// ============================================================================

interface DebouncedFunction<T extends (...args: Parameters<T>) => ReturnType<T>> {
    (...args: Parameters<T>): void;
    cancel: () => void;
    flush: () => void;
}

// ============================================================================
// Debounce Implementation
// ============================================================================

/**
 * Creates a debounced version of a function.
 * The function will only be called after it stops being called for `wait` milliseconds.
 * 
 * @param fn - The function to debounce
 * @param wait - Milliseconds to wait before calling
 * @param immediate - If true, call on the leading edge instead of trailing
 * @returns Debounced function with cancel and flush methods
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
    fn: T,
    wait: number,
    immediate: boolean = false
): DebouncedFunction<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastArgs: Parameters<T> | null = null;

    const debounced = (...args: Parameters<T>): void => {
        lastArgs = args;

        const callNow = immediate && !timeoutId;

        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            timeoutId = null;
            if (!immediate && lastArgs) {
                fn(...lastArgs);
            }
        }, wait);

        if (callNow) {
            fn(...args);
        }
    };

    debounced.cancel = (): void => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        lastArgs = null;
    };

    debounced.flush = (): void => {
        if (timeoutId && lastArgs) {
            clearTimeout(timeoutId);
            timeoutId = null;
            fn(...lastArgs);
            lastArgs = null;
        }
    };

    return debounced;
}

// ============================================================================
// Throttle Implementation
// ============================================================================

/**
 * Creates a throttled version of a function.
 * The function will be called at most once per `wait` milliseconds.
 * 
 * @param fn - The function to throttle
 * @param wait - Minimum milliseconds between calls
 * @returns Throttled function
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
    fn: T,
    wait: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastArgs: Parameters<T> | null = null;

    return (...args: Parameters<T>): void => {
        const now = Date.now();
        const remaining = wait - (now - lastCall);

        lastArgs = args;

        if (remaining <= 0) {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            lastCall = now;
            fn(...args);
        } else if (!timeoutId) {
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                timeoutId = null;
                if (lastArgs) {
                    fn(...lastArgs);
                }
            }, remaining);
        }
    };
}

// ============================================================================
// Deduplication Queue
// ============================================================================

interface QueuedOperation<T> {
    key: string;
    data: T;
    timestamp: number;
}

/**
 * Creates a deduplication queue that only keeps the latest operation per key.
 * Useful for rapid status updates where only the final state matters.
 */
export class DeduplicationQueue<T> {
    private queue = new Map<string, QueuedOperation<T>>();
    private processing = false;
    private processor: (key: string, data: T) => Promise<void>;
    private debounceMs: number;
    private timeoutId: ReturnType<typeof setTimeout> | null = null;

    constructor(
        processor: (key: string, data: T) => Promise<void>,
        debounceMs: number = 300
    ) {
        this.processor = processor;
        this.debounceMs = debounceMs;
    }

    /**
     * Add an operation to the queue.
     * If an operation with the same key exists, it will be replaced.
     */
    enqueue(key: string, data: T): void {
        this.queue.set(key, {
            key,
            data,
            timestamp: Date.now(),
        });

        // Debounce processing
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        this.timeoutId = setTimeout(() => this.processQueue(), this.debounceMs);
    }

    /**
     * Process all queued operations.
     */
    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.size === 0) return;

        this.processing = true;

        // Take a snapshot of current queue and clear it
        const operations = Array.from(this.queue.values());
        this.queue.clear();

        // Process all operations
        for (const op of operations) {
            try {
                await this.processor(op.key, op.data);
                console.log(`[DedupeQueue] Processed: ${op.key}`);
            } catch (error) {
                console.error(`[DedupeQueue] Failed: ${op.key}`, error);
                // Re-queue failed operations
                this.queue.set(op.key, op);
            }
        }

        this.processing = false;

        // If new operations were added during processing, process again
        if (this.queue.size > 0) {
            this.timeoutId = setTimeout(() => this.processQueue(), this.debounceMs);
        }
    }

    /**
     * Get the number of pending operations.
     */
    get pendingCount(): number {
        return this.queue.size;
    }

    /**
     * Force immediate processing of the queue.
     */
    flush(): Promise<void> {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        return this.processQueue();
    }
}
