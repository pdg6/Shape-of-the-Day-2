/**
 * useStudentData Hook - React integration for student data service
 * 
 * Provides:
 * - Automatic initialization/cleanup
 * - Task data with caching
 * - Sync status for UI indicators
 * - Offline-aware status updates
 */

import { useState, useEffect, useCallback } from 'react';
import { studentDataService, SyncStatus } from '../services/studentDataService';
import { Task } from '../types';

interface UseStudentDataResult {
    tasks: Task[];
    isLoading: boolean;
    syncStatus: SyncStatus;
    updateTaskStatus: (taskId: string, status: 'todo' | 'in_progress' | 'done' | 'help', comment?: string) => Promise<boolean>;
    refreshTasks: () => Promise<void>;
    getTasksForDate: (date: string) => Promise<Task[]>;
}

export function useStudentData(classId: string): UseStudentDataResult {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        isOnline: navigator.onLine,
        lastSyncTime: null,
        pendingOperations: 0,
        isSyncing: false,
    });

    // Initialize service and subscribe to status changes
    useEffect(() => {
        if (!classId) {
            setIsLoading(false);
            return;
        }

        let mounted = true;

        const initialize = async () => {
            setIsLoading(true);
            try {
                const fetchedTasks = await studentDataService.initialize(classId);
                if (mounted) {
                    setTasks(fetchedTasks);
                }
            } catch (error) {
                console.error('[useStudentData] Initialization error:', error);
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        // Subscribe to sync status changes
        const unsubscribe = studentDataService.onSyncStatusChange((status) => {
            if (mounted) {
                setSyncStatus(status);
            }
        });

        initialize();

        return () => {
            mounted = false;
            unsubscribe();
            studentDataService.destroy();
        };
    }, [classId]);

    // Update task status (offline-aware)
    const updateTaskStatus = useCallback(async (
        taskId: string,
        status: 'todo' | 'in_progress' | 'done' | 'help',
        comment?: string
    ): Promise<boolean> => {
        return studentDataService.updateTaskStatus(taskId, status, comment);
    }, []);

    // Force refresh tasks
    const refreshTasks = useCallback(async () => {
        try {
            const freshTasks = await studentDataService.forceSync();
            setTasks(freshTasks);
        } catch (error) {
            console.error('[useStudentData] Refresh error:', error);
        }
    }, []);

    // Get tasks for a specific date
    const getTasksForDate = useCallback(async (date: string): Promise<Task[]> => {
        return studentDataService.getTasksForDate(date);
    }, []);

    return {
        tasks,
        isLoading,
        syncStatus,
        updateTaskStatus,
        refreshTasks,
        getTasksForDate,
    };
}
