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
    doc,
    updateDoc,
    serverTimestamp,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Task, TaskStatus } from '../types';
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
    private isOnline: boolean = navigator.onLine;
    private isSyncing: boolean = false;
    private syncCallbacks: Set<SyncCallback> = new Set();
    private unsubscribeTasks: Unsubscribe | null = null;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private pendingOpsCount: number = 0;
    private taskCallbacks: Set<(tasks: Task[]) => void> = new Set();
    private currentTasks: Task[] = [];

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
    async initialize(classId: string): Promise<void> {
        console.log('[StudentData] Initializing for class:', classId);
        this.classId = classId;
        setLocalStorage(CACHE_KEY_CLASS_ID, classId);

        // Update initial pending ops count
        const pending = await getPendingOperations();
        this.pendingOpsCount = pending.length;

        // Process any pending offline operations if online
        if (this.isOnline) {
            await this.processPendingOperations();
        }

        // Start heartbeat
        this.startHeartbeat();

        // Note: Real-time subscription is started by the component via subscribeToTasks
    }

    /**
     * Clean up resources when student leaves
     */
    destroy(): void {
        console.log('[StudentData] Destroying service');
        this.stopHeartbeat();
        if (this.unsubscribeTasks) {
            this.unsubscribeTasks();
            this.unsubscribeTasks = null;
        }
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
            pendingOperations: this.pendingOpsCount,
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
     * Subscribe to tasks for the current class in real-time
     * This replaces the periodic sync and ensures the local cache is always up to date.
     * Supports multiple concurrent subscribers.
     */
    subscribeToTasks(callback: (tasks: Task[]) => void): () => void {
        if (!this.classId) {
            console.error('[StudentData] Cannot subscribe: no class ID');
            return () => { };
        }

        this.taskCallbacks.add(callback);

        // If we already have tasks, provide them immediately
        if (this.currentTasks.length > 0) {
            callback(this.currentTasks);
        }

        // Start Firestore listener if this is the first subscriber
        if (this.taskCallbacks.size === 1 && !this.unsubscribeTasks) {
            console.log('[StudentData] Starting real-time task subscription');
            this.isSyncing = true;
            this.notifySyncStatusChange();

            const tasksRef = collection(db, 'tasks');
            const q = query(
                tasksRef,
                where('selectedRoomIds', 'array-contains', this.classId)
            );

            this.unsubscribeTasks = onSnapshot(q, (snapshot) => {
                const tasks: Task[] = [];
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.status !== 'draft') {
                        tasks.push({
                            id: docSnap.id,
                            ...data
                        } as Task);
                    }
                });

                this.currentTasks = tasks;
                // Cache for offline use
                setIndexedDB('tasks', tasks);
                setLocalStorage(CACHE_KEY_LAST_SYNC, Date.now());

                this.isSyncing = false;
                this.notifySyncStatusChange();

                // Notify all subscribers
                this.taskCallbacks.forEach(cb => cb(tasks));
            }, (error) => {
                console.error('[StudentData] Task subscription error:', error);
                this.isSyncing = false;
                this.notifySyncStatusChange();
            });
        }

        return () => {
            this.taskCallbacks.delete(callback);
            // Stop Firestore listener if no more subscribers
            if (this.taskCallbacks.size === 0 && this.unsubscribeTasks) {
                console.log('[StudentData] Stopping real-time task subscription');
                this.unsubscribeTasks();
                this.unsubscribeTasks = null;
                this.currentTasks = [];
            }
        };
    }

    // ========================================================================
    // Periodic Sync
    // ========================================================================

    private startHeartbeat(): void {
        if (this.heartbeatInterval) return;

        console.log('[StudentData] Starting heartbeat (every 5m)');
        this.sendHeartbeat(); // Initial heartbeat
        this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 300000);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('[StudentData] Stopped heartbeat');
        }
    }

    /**
     * Force an immediate cache reload from local storage
     */
    async forceCacheReload(): Promise<Task[]> {
        return this.loadFromCache();
    }

    // ========================================================================
    // Offline Write Queue
    // ========================================================================

    /**
     * Update task status - queues for offline if needed
     * @param taskId - The task being updated
     * @param status - The new status
     * @param metrics - Progress metrics (completed count, active task IDs)
     * @param comment - Optional student comment
     */
    async syncProgress(
        taskId: string,
        status: TaskStatus,
        metrics: { completedCount: number; activeTasks: string[] },
        comment?: string
    ): Promise<boolean> {
        const currentUser = auth.currentUser;
        if (!currentUser || !this.classId) {
            console.error('[StudentData] Cannot sync: no user or class');
            return false;
        }

        const payload = {
            taskId,
            status,
            comment: comment || '',
            userId: currentUser.uid,
            classId: this.classId,
            metrics
        };

        if (this.isOnline) {
            try {
                await this.syncStatusToFirestore(payload);
                return true;
            } catch (error) {
                console.warn('[StudentData] Online sync failed, queueing:', error);
            }
        }

        await queuePendingOperation({
            type: 'status_update',
            taskId,
            payload,
        });

        const pending = await getPendingOperations();
        this.pendingOpsCount = pending.length;
        this.notifySyncStatusChange();
        return true;
    }

    /**
     * Send a heartbeat to update lastSeen/lastActive
     */
    async sendHeartbeat(): Promise<void> {
        const currentUser = auth.currentUser;
        if (!currentUser || !this.classId) return;

        try {
            const studentRef = doc(db, 'classrooms', this.classId, 'live_students', currentUser.uid);
            await updateDoc(studentRef, {
                lastSeen: serverTimestamp(),
                lastActive: serverTimestamp()
            });
        } catch (error) {
            console.error('[StudentData] Heartbeat failed:', error);
        }
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
        metrics?: { completedCount: number; activeTasks: string[] };
    }): Promise<void> {
        const studentRef = doc(
            db,
            'classrooms',
            payload.classId,
            'live_students',
            payload.userId
        );

        const updateData: any = {
            currentStatus: payload.status,
            currentTaskId: payload.taskId,
            [`taskStatuses.${payload.taskId}`]: payload.status,
            currentMessage: payload.comment,
            lastActive: serverTimestamp(),
        };

        if (payload.metrics) {
            updateData['metrics.tasksCompleted'] = payload.metrics.completedCount;
            updateData['metrics.activeTasks'] = payload.metrics.activeTasks;
        }

        await updateDoc(studentRef, updateData);
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
                        metrics?: { completedCount: number; activeTasks: string[] };
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

        const remaining = await getPendingOperations();
        this.pendingOpsCount = remaining.length;
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
