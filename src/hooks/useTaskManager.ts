import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Task, TaskFormData, ItemType, TaskStatus, Attachment, LinkAttachment } from '../types';
import { useClassStore } from '../store/appSettings';
import { saveTask, deleteTaskWithChildren, reorderTasks, cascadeParentChanges } from '../services/firestoreService';
import { auth } from '../firebase';
import { serverTimestamp } from 'firebase/firestore';

export interface UseTaskManagerProps {
    tasks: Task[];
    initialTaskId?: string;
    onSuccess?: (message: string) => void;
    onError?: (message: string) => void;
}

export const INITIAL_FORM_DATA: TaskFormData = {
    title: '',
    description: '',
    type: 'task',
    parentId: null,
    startDate: new Date().toISOString().split('T')[0] || '',
    endDate: new Date().toISOString().split('T')[0] || '',
    selectedRoomIds: [],
    links: [],
    attachments: [],
    structuredContent: null,
};

export const useTaskManager = ({ tasks, initialTaskId, onSuccess, onError }: UseTaskManagerProps) => {
    const { currentClassId } = useClassStore();

    // --- State ---
    const [editingTaskId, setEditingTaskId] = useState<string | null>(initialTaskId || null);
    const [formData, setFormData] = useState<TaskFormData>(INITIAL_FORM_DATA);
    const [isDirty, setIsDirty] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [filterType, setFilterType] = useState<ItemType | 'all'>('all');

    const isNewTask = !editingTaskId;

    // --- Utils ---
    const handleError = useCallback((message: string) => {
        toast.error(message);
        onError?.(message);
    }, [onError]);

    const handleSuccess = useCallback((message: string) => {
        toast.success(message);
        onSuccess?.(message);
    }, [onSuccess]);

    // --- Form Management ---
    const resetForm = useCallback((parentId: string | null = null, type: ItemType = 'task') => {
        setEditingTaskId(null);
        setFormData({
            ...INITIAL_FORM_DATA,
            parentId,
            type,
            selectedRoomIds: currentClassId ? [currentClassId] : [],
        });
        setIsDirty(false);
    }, [currentClassId]);

    const loadTask = useCallback((task: Task) => {
        setEditingTaskId(task.id);
        setFormData({
            title: task.title || '',
            description: task.description || '',
            type: task.type || 'task',
            parentId: task.parentId || null,
            startDate: task.startDate || '',
            endDate: task.endDate || '',
            selectedRoomIds: task.selectedRoomIds || [],
            links: task.links || [],
            attachments: task.attachments || [],
            status: task.status || 'todo',
            structuredContent: task.structuredContent || null,
        });
        setIsDirty(false);
    }, []);

    // --- Hierarchy & Filtering ---
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesText = task.title.toLowerCase().includes(filterText.toLowerCase()) ||
                (task.description?.toLowerCase().includes(filterText.toLowerCase()));
            const matchesType = filterType === 'all' || task.type === filterType;
            return matchesText && matchesType;
        });
    }, [tasks, filterText, filterType]);

    const hierarchicalTasks = useMemo(() => {
        // 1. Group by parentId to build adjacency list
        const childrenMap = new Map<string, Task[]>();
        const allIds = new Set(filteredTasks.map(t => t.id));
        const roots: Task[] = [];

        filteredTasks.forEach(t => {
            // A task is an effective root if:
            // a) It has no parentId (null/undefined)
            // b) Its parentId refers to a task that is NOT in the current filtered set (orphan)
            const isEffectiveRoot = !t.parentId || !allIds.has(t.parentId);

            if (isEffectiveRoot) {
                roots.push(t);
            } else {
                const pId = t.parentId as string;
                if (!childrenMap.has(pId)) {
                    childrenMap.set(pId, []);
                }
                childrenMap.get(pId)?.push(t);
            }
        });

        // 2. Sort roots by presentationOrder
        roots.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));

        // 3. Recursive build
        const buildList = (items: Task[]): Task[] => {
            let result: Task[] = [];
            for (const item of items) {
                result.push(item);
                const children = childrenMap.get(item.id);
                if (children) {
                    children.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
                    result.push(...buildList(children));
                }
            }
            return result;
        };

        return buildList(roots);
    }, [filteredTasks]);

    // --- Actions ---
    const handleSave = async (isAutoSave: boolean = false, cascadeToChildren: boolean = true) => {
        const user = auth.currentUser;
        if (!user) return;

        // Validation
        if (!isAutoSave) {
            if (!formData.title.trim()) {
                handleError("Please enter a title.");
                return;
            }
            if (formData.selectedRoomIds.length === 0) {
                handleError("Please assign at least one class.");
                return;
            }
        } else if (!formData.title.trim() && formData.selectedRoomIds.length === 0) {
            return;
        }

        setIsSubmitting(true);
        try {
            // Path and RootId resolution
            let path: string[] = [];
            let pathTitles: string[] = [];
            let rootId: string | null = null;

            if (formData.parentId) {
                const parent = tasks.find(t => t.id === formData.parentId);
                if (parent) {
                    path = [...(parent.path || []), parent.id];
                    pathTitles = [...(parent.pathTitles || []), parent.title];
                    rootId = parent.rootId || parent.id;
                }
            }

            // Determine status:
            // 1. Start with current form status or default to 'todo'
            // 2. If manual save (user clicked Save) and status is 'draft', promote to 'todo'
            let statusToSave = formData.status || 'todo';
            if (!isAutoSave && statusToSave === 'draft') {
                statusToSave = 'todo';
            }

            const taskToSave: Partial<Task> & { id?: string } = {
                ...formData,
                id: editingTaskId || undefined,
                teacherId: user.uid,
                rootId,
                path,
                pathTitles,
                status: statusToSave,
                updatedAt: serverTimestamp(),
            };

            // Calculate presentation order for new tasks
            if (isNewTask) {
                const siblings = tasks.filter(t => t.parentId === formData.parentId);
                taskToSave.presentationOrder = siblings.length > 0
                    ? Math.max(...siblings.map(t => t.presentationOrder || 0)) + 1
                    : 1;
            }

            const savedId = await saveTask(user.uid, taskToSave);

            // Cascade dates, status, and rooms to children when saving a parent
            // Only cascade if cascadeToChildren is true
            const taskId = editingTaskId || savedId;
            const hasChildren = tasks.some(t => t.parentId === taskId);
            if (cascadeToChildren && hasChildren && formData.startDate && formData.endDate) {
                await cascadeParentChanges(
                    user.uid,
                    taskId,
                    formData.startDate,
                    formData.endDate,
                    formData.selectedRoomIds,
                    statusToSave
                );
            }

            if (!isAutoSave) {
                handleSuccess(`Task ${isNewTask ? 'created' : 'updated'}!`);
                resetForm();
            } else if (isNewTask) {
                setEditingTaskId(savedId);
            } else {
                setIsDirty(false);
            }

            return savedId;
        } catch (error) {
            console.error("Error saving task:", error);
            if (!isAutoSave) handleError("Failed to save.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (taskId: string, deleteChildren: boolean = true, skipConfirm: boolean = false) => {
        const user = auth.currentUser;
        if (!user) return;

        // Check if task has children
        const hasChildren = tasks.some(t => t.parentId === taskId);

        // If not skipping confirm and task has children, just return - caller should show custom dialog
        if (!skipConfirm && hasChildren) {
            return 'has_children';
        }

        // For tasks without children or when skipConfirm is true
        if (!skipConfirm && !hasChildren) {
            if (!window.confirm("Delete this task?")) return;
        }

        setIsSubmitting(true);
        try {
            await deleteTaskWithChildren(user.uid, taskId, deleteChildren);
            handleSuccess("Task deleted.");
            if (editingTaskId === taskId) resetForm();
        } catch (error) {
            console.error("Error deleting task:", error);
            handleError("Failed to delete.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReorder = async (taskId: string, direction: 'up' | 'down') => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const siblings = tasks.filter(t => t.parentId === task.parentId);
        siblings.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));

        const currentIndex = siblings.findIndex(t => t.id === taskId);
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (targetIndex < 0 || targetIndex >= siblings.length) return;

        const targetTask = siblings[targetIndex];
        if (!targetTask) return;

        try {
            await reorderTasks(taskId, targetTask.id, siblings);
        } catch (error) {
            console.error("Failed to reorder:", error);
            handleError("Reordering failed.");
        }
    };

    const updateField = useCallback(<K extends keyof TaskFormData>(
        field: K,
        value: TaskFormData[K] | ((prev: TaskFormData[K]) => TaskFormData[K])
    ) => {
        setFormData(prev => {
            const newValue = typeof value === 'function'
                ? (value as (prev: TaskFormData[K]) => TaskFormData[K])(prev[field])
                : value;
            return { ...prev, [field]: newValue };
        });
        setIsDirty(true);
    }, []);

    const addLink = useCallback((link: Omit<LinkAttachment, 'addedAt'>) => {
        const newLink: LinkAttachment = {
            ...link,
            addedAt: new Date()
        };
        updateField('links', prev => [...(prev || []), newLink]);
    }, [updateField]);

    const removeLink = useCallback((linkId: string) => {
        updateField('links', prev => (prev || []).filter(l => l.id !== linkId));
    }, [updateField]);

    const addAttachments = useCallback((newAttachments: Attachment[]) => {
        updateField('attachments', prev => [...(prev || []), ...newAttachments]);
    }, [updateField]);

    const removeAttachment = useCallback((attachmentId: string) => {
        updateField('attachments', prev => (prev || []).filter(a => a.id !== attachmentId));
    }, [updateField]);

    return {
        editingTaskId,
        setEditingTaskId,
        formData,
        setFormData,
        updateField,
        isDirty,
        setIsDirty,
        isSubmitting,
        isNewTask,
        filterText,
        setFilterText,
        filterType,
        setFilterType,
        hierarchicalTasks,
        filteredTasks,
        loadTask,
        resetForm,
        handleSave,
        handleDelete,
        handleReorder,
        addLink,
        removeLink,
        addAttachments,
        removeAttachment
    };
};
