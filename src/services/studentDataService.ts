/**
 * Student Data Service - Offline-first data management for student view
 * 
 * Features:
 * 1. Pre-cache all tasks at join time for offline access
 * 2. 3-minute periodic sync with Firestore
 * 3. Offline write queue with automatic sync on reconnect
 * 4. Network status detection
 */

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Task } from '../types';
import {
    setIndexedDB,
    getIndexedDB,
    queuePendingOperation,
    getPendingOperations,
    removePendingOperation,
    setLocalStorage,
    getLocalStorage
} from './storageService';

// ============================================================================
// Configuration
// ============================================================================

const SYNC_INTERVAL_MS = 180000; // 3 minutes
const CACHE_KEY_TASKS = 'cached_tasks';
const CACHE_KEY_LAST_SYNC = 'last_sync_timestamp';
const CACHE_KEY_CLASS_ID = 'current_class_id';

// ============================================================================
// Types
// ============================================================================

export interface SyncStatus {
    isOnline: boolean;
    lastSyncTime: number | null;
    pendingOperations: number;
    isSyncing: boolean;
}

type SyncCallback = (status: SyncStatus) => void;

// ============================================================================
// Student Data Service Class
// ============================================================================

class StudentDataService {
    private classId: string | null = null;
    private syncInterval: ReturnType<typeof setInterval> | null = null;
    private isOnline: boolean = navigator.onLine;
    private isSyncing: boolean = false;
    private syncCallbacks: Set<SyncCallback> = new Set();

    constructor() {
        // Listen for online/offline events
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);
    }

    // ========================================================================
    // Initialization
    // ========================================================================

    /**
     * Initialize the service for a specific class
     * Pre-fetches all tasks and starts periodic sync
     */
    async initialize(classId: string): Promise<Task[]> {
        console.log('[StudentData] Initializing for class:', classId);
        this.classId = classId;
        setLocalStorage(CACHE_KEY_CLASS_ID, classId);

        // Try to load from cache first (instant)
        let tasks = await this.loadFromCache();

        // If online, fetch fresh data
        if (this.isOnline) {
            try {
                tasks = await this.fetchAndCacheTasks();
            } catch (error) {
                console.warn('[StudentData] Failed to fetch, using cache:', error);
                // Fall back to cached data
            }
        }

        // Start periodic sync
        this.startPeriodicSync();

        // Process any pending offline operations
        if (this.isOnline) {
            await this.processPendingOperations();
        }

        return tasks;
    }

    /**
     * Clean up resources when student leaves
     */
    destroy(): void {
        console.log('[StudentData] Destroying service');
        this.stopPeriodicSync();
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
        this.syncCallbacks.clear();
    }

    // ========================================================================
    // Sync Status Subscription
    // ========================================================================

    /**
     * Subscribe to sync status changes
     */
    onSyncStatusChange(callback: SyncCallback): () => void {
        this.syncCallbacks.add(callback);
        // Immediately notify with current status
        callback(this.getSyncStatus());

        return () => {
            this.syncCallbacks.delete(callback);
        };
    }

    /**
     * Get current sync status
     */
    getSyncStatus(): SyncStatus {
        const lastSync = getLocalStorage<number>(CACHE_KEY_LAST_SYNC);
        return {
            isOnline: this.isOnline,
            lastSyncTime: lastSync,
            pendingOperations: 0, // Will be updated async
            isSyncing: this.isSyncing,
        };
    }

    private notifySyncStatusChange(): void {
        const status = this.getSyncStatus();
        this.syncCallbacks.forEach(cb => cb(status));
    }

    // ========================================================================
    // Cache Operations
    // ========================================================================

    /**
     * Load tasks from IndexedDB cache
     */
    private async loadFromCache(): Promise<Task[]> {
        try {
            const tasks = await getIndexedDB<Task>('tasks');
            console.log('[StudentData] Loaded from cache:', tasks.length, 'tasks');
            return tasks;
        } catch (error) {
            console.error('[StudentData] Cache load error:', error);
            return [];
        }
    }

    /**
     * Fetch tasks from Firestore and cache them
     */
    private async fetchAndCacheTasks(): Promise<Task[]> {
        if (!this.classId) {
            throw new Error('No class ID set');
        }

        console.log('[StudentData] Fetching from Firestore...');
        this.isSyncing = true;
        this.notifySyncStatusChange();

        try {
            const tasksRef = collection(db, 'tasks');
            const q = query(
                tasksRef,
                where('assignedRooms', 'array-contains', this.classId)
            );

            const snapshot = await getDocs(q);
            const tasks: Task[] = [];

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                // Only include non-draft tasks
                if (data.status !== 'draft') {
                    tasks.push({
                        id: docSnap.id,
                        title: data.title || '',
                        description: data.description || '',
                        type: data.type || 'task',
                        status: data.status || 'todo',
                        startDate: data.startDate || '',
                        endDate: data.endDate || '',
                        dueDate: data.dueDate || '',
                        presentationOrder: data.presentationOrder || 0,
                        selectedRoomIds: data.selectedRoomIds || [],
                        assignedRooms: data.assignedRooms || [],
                        parentId: data.parentId || null,
                        rootId: data.rootId || null,
                        path: data.path || [],
                        pathTitles: data.pathTitles || [],
                        childIds: data.childIds || [],
                        links: data.links || [],
                        attachments: data.attachments || [],
                    } as Task);
                }
            });

            // Cache the tasks
            await setIndexedDB('tasks', tasks);
            setLocalStorage(CACHE_KEY_LAST_SYNC, Date.now());

            console.log('[StudentData] Cached', tasks.length, 'tasks');
            return tasks;

        } finally {
            this.isSyncing = false;
            this.notifySyncStatusChange();
        }
    }

    // ========================================================================
    // Periodic Sync
    // ========================================================================

    private startPeriodicSync(): void {
        if (this.syncInterval) return;

        console.log('[StudentData] Starting periodic sync (every 3 min)');
        this.syncInterval = setInterval(async () => {
            if (this.isOnline && !this.isSyncing) {
                try {
                    await this.fetchAndCacheTasks();
                    await this.processPendingOperations();
                } catch (error) {
                    console.error('[StudentData] Periodic sync failed:', error);
                }
            }
        }, SYNC_INTERVAL_MS);
    }

    private stopPeriodicSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('[StudentData] Stopped periodic sync');
        }
    }

    /**
     * Force an immediate sync (user-triggered refresh)
     */
    async forceSync(): Promise<Task[]> {
        if (!this.isOnline) {
            console.warn('[StudentData] Cannot sync while offline');
            return this.loadFromCache();
        }

        const tasks = await this.fetchAndCacheTasks();
        await this.processPendingOperations();
        return tasks;
    }

    // ========================================================================
    // Offline Write Queue
    // ========================================================================

    /**
     * Update task status - queues for offline if needed
     */
    async updateTaskStatus(
        taskId: string,
        status: 'todo' | 'in_progress' | 'done' | 'help',
        comment?: string
    ): Promise<boolean> {
        const currentUser = auth.currentUser;
        if (!currentUser || !this.classId) {
            console.error('[StudentData] Cannot update: no user or class');
            return false;
        }

        const payload = {
            taskId,
            status,
            comment: comment || '',
            userId: currentUser.uid,
            classId: this.classId,
        };

        if (this.isOnline) {
            // Try to sync immediately
            try {
                await this.syncStatusToFirestore(payload);
                return true;
            } catch (error) {
                console.warn('[StudentData] Online sync failed, queueing:', error);
                // Fall through to queue
            }
        }

        // Queue for later sync
        await queuePendingOperation({
            type: 'status_update',
            taskId,
            payload,
        });
        console.log('[StudentData] Queued status update for:', taskId);
        this.notifySyncStatusChange();
        return true;
    }

    /**
     * Sync a status update to Firestore
     */
    private async syncStatusToFirestore(payload: {
        taskId: string;
        status: string;
        comment: string;
        userId: string;
        classId: string;
    }): Promise<void> {
        const studentRef = doc(
            db,
            'classrooms',
            payload.classId,
            'live_students',
            payload.userId
        );

        await updateDoc(studentRef, {
            currentStatus: payload.status,
            currentTaskId: payload.taskId,
            currentMessage: payload.comment,
            lastActive: serverTimestamp(),
        });

        console.log('[StudentData] Synced status to Firestore:', payload.taskId);
    }

    /**
     * Process all pending operations from the queue
     */
    private async processPendingOperations(): Promise<void> {
        const pending = await getPendingOperations();

        if (pending.length === 0) return;

        console.log('[StudentData] Processing', pending.length, 'pending operations');

        for (const op of pending) {
            try {
                if (op.type === 'status_update') {
                    await this.syncStatusToFirestore(op.payload as {
                        taskId: string;
                        status: string;
                        comment: string;
                        userId: string;
                        classId: string;
                    });
                }

                // Remove from queue after successful sync
                await removePendingOperation(op.id);
                console.log('[StudentData] Processed pending op:', op.id);

            } catch (error) {
                console.error('[StudentData] Failed to process op:', op.id, error);
                // Leave in queue for next attempt
            }
        }

        this.notifySyncStatusChange();
    }

    // ========================================================================
    // Network Status Handlers
    // ========================================================================

    private handleOnline = async (): Promise<void> => {
        console.log('[StudentData] Network: ONLINE');
        this.isOnline = true;
        this.notifySyncStatusChange();

        // Sync pending operations
        await this.processPendingOperations();

        // Fetch latest data
        try {
            await this.fetchAndCacheTasks();
        } catch (error) {
            console.error('[StudentData] Failed to sync on reconnect:', error);
        }
    };

    private handleOffline = (): void => {
        console.log('[StudentData] Network: OFFLINE');
        this.isOnline = false;
        this.notifySyncStatusChange();
    };

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Check if currently online
     */
    getIsOnline(): boolean {
        return this.isOnline;
    }

    /**
     * Get tasks for a specific date range
     */
    async getTasksForDate(date: string): Promise<Task[]> {
        const allTasks = await this.loadFromCache();
        return allTasks.filter(task => {
            const start = task.startDate || '';
            const end = task.endDate || date;
            return date >= start && date <= end;
        });
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const studentDataService = new StudentDataService();
