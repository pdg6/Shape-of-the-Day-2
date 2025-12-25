import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Task, TaskFormData, ItemType, TaskStatus, Attachment, LinkAttachment } from '../types';
import { useClassStore } from '../store/classStore';
import { saveTask, deleteTaskWithChildren, reorderTasks } from '../services/firestoreService';
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

    const buildHierarchy = useCallback((parentId: string | null): Task[] => {
        const directChildren = filteredTasks.filter(t => {
            // Treat null and undefined parentId as root-level tasks
            if (parentId === null) {
                return t.parentId === null || t.parentId === undefined;
            }
            return t.parentId === parentId;
        });

        // Sort by presentationOrder
        directChildren.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));

        let sortedHierarchy: Task[] = [];
        for (const child of directChildren) {
            sortedHierarchy.push(child);
            sortedHierarchy = sortedHierarchy.concat(buildHierarchy(child.id));
        }
        return sortedHierarchy;
    }, [filteredTasks]);

    const hierarchicalTasks = useMemo(() => buildHierarchy(null), [buildHierarchy]);

    // --- Actions ---
    const handleSave = async (isAutoSave: boolean = false) => {
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

            const statusToSave: TaskStatus = isAutoSave ? 'draft' : 'todo';

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

    const handleDelete = async (taskId: string, deleteChildren: boolean = true) => {
        const message = deleteChildren
            ? "Are you sure? This will delete the item and all its children."
            : "Are you sure? Children will become standalone root items.";

        if (!window.confirm(message)) return;

        setIsSubmitting(true);
        try {
            await deleteTaskWithChildren(taskId, deleteChildren);
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
