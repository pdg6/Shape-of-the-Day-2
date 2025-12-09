import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';

import { createPortal } from 'react-dom';
import 'react-day-picker/style.css';

import {
    Calendar as CalendarIcon,
    Link as LinkIcon,
    Plus,
    Check,
    Upload,
    Loader,
    ChevronLeft,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    FolderOpen,
    FileText,
    ListChecks,
    CheckSquare,
    X,
    File as FileIcon,
    Trash2
} from 'lucide-react';
import { Select, SelectOption } from '../shared/Select';
import { DateRangePicker } from '../shared/DateRangePicker';
import { RichTextEditor } from '../shared/RichTextEditor';

import { handleError, handleSuccess } from '../../utils/errorHandler';
import { toDateString } from '../../utils/dateHelpers';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, updateDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage } from '../../firebase';
import { Classroom, ItemType, Task, TaskFormData, TaskStatus, ALLOWED_CHILD_TYPES, ALLOWED_PARENT_TYPES, Attachment } from '../../types';
import { useClassStore } from '../../store/classStore';

// --- Constants ---

const INITIAL_FORM_STATE: TaskFormData = {
    title: '',
    description: '',
    type: 'task',
    parentId: null,
    linkURL: '',
    startDate: toDateString(),
    endDate: toDateString(),
    selectedRoomIds: [],
    attachments: []
};

// Allowed file types for attachments
const ALLOWED_FILE_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Generate unique ID for cards


// Get type-specific icon
const getTypeIcon = (type: ItemType) => {
    switch (type) {
        case 'project': return FolderOpen;
        case 'assignment': return FileText;
        case 'task': return ListChecks;
        case 'subtask': return CheckSquare;
    }
};

// Get type label
const getTypeLabel = (type: ItemType): string => {
    switch (type) {
        case 'project': return 'Project';
        case 'assignment': return 'Assignment';
        case 'task': return 'Task';
        case 'subtask': return 'Subtask';
    }
};

// Get type color classes
const getTypeColorClasses = (type: ItemType): string => {
    switch (type) {
        case 'project': return 'text-purple-500 border-purple-500';
        case 'assignment': return 'text-blue-500 border-blue-500';
        case 'task': return 'text-green-500 border-green-500';
        case 'subtask': return 'text-orange-500 border-orange-500';
    }
};

// Get type hex color for icons
const getTypeHexColor = (type: ItemType): string => {
    switch (type) {
        case 'project': return '#a855f7';
        case 'assignment': return '#3b82f6';
        case 'task': return '#22c55e';
        case 'subtask': return '#f97316';
    }
};

// Build type options for Select component
const TYPE_OPTIONS: SelectOption<ItemType>[] = [
    { value: 'project', label: 'Project', icon: FolderOpen, iconColor: '#a855f7' },
    { value: 'assignment', label: 'Assignment', icon: FileText, iconColor: '#3b82f6' },
    { value: 'task', label: 'Task', icon: ListChecks, iconColor: '#22c55e' },
    { value: 'subtask', label: 'Subtask', icon: CheckSquare, iconColor: '#f97316' },
];

interface TaskManagerProps {
    initialTask?: Task;
}

// HMR refresh timestamp: 2025-12-08T19:30
export default function TaskManager({ initialTask }: TaskManagerProps) {
    // --- Store ---
    const { currentClassId } = useClassStore();

    // --- State ---
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0, origin: 'top left' });
    const calendarButtonRef = useRef<HTMLButtonElement>(null);
    const calendarPopoverRef = useRef<HTMLDivElement>(null);

    // Update calendar position
    const updateCalendarPosition = useCallback(() => {
        if (calendarButtonRef.current) {
            const rect = calendarButtonRef.current.getBoundingClientRect();
            // Estimate size (captured from typical rendering)
            const popoverHeight = 320;
            const popoverWidth = 280;

            // Default: Bottom-left aligned (viewport coordinates because position: fixed)
            let top = rect.bottom + 4;
            let left = rect.left;
            let origin = 'top left';

            // Vertical positioning
            const spaceBelow = window.innerHeight - rect.bottom;
            // If not enough space below AND more space above, flip up
            if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
                top = rect.top - popoverHeight - 4;
                origin = 'bottom left';
            }

            // Horizontal positioning (keep on screen)
            if (left + popoverWidth > window.innerWidth) {
                // If overflows right, align to right edge of window with padding
                left = window.innerWidth - popoverWidth - 16;

                // If flipping alignment, update origin to pivot from right
                if (origin === 'top left') origin = 'top right';
                else origin = 'bottom right';
            }

            // Ensure strictly non-negative
            if (left < 4) left = 4;

            // Ensure top is on screen (clamping)
            if (top < 4) top = 4;

            setCalendarPosition({ top, left, origin });
        }
    }, []);

    // Handle click outside for calendar
    useEffect(() => {
        if (!isCalendarOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (
                calendarPopoverRef.current &&
                !calendarPopoverRef.current.contains(e.target as Node) &&
                calendarButtonRef.current &&
                !calendarButtonRef.current.contains(e.target as Node)
            ) {
                setIsCalendarOpen(false);
            }
        };

        const handleResize = () => {
            if (isCalendarOpen) updateCalendarPosition();
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
        };
    }, [isCalendarOpen, updateCalendarPosition]);

    const [rooms, setRooms] = useState<Classroom[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);

    // Task Data (all tasks from Firestore)
    const [tasks, setTasks] = useState<Task[]>([]);
    const [_loadingTasks, setLoadingTasks] = useState(true);

    // Single form editor state (replaces multi-card system)
    const [formData, setFormData] = useState<TaskFormData>(() => {
        try {
            const stored = sessionStorage.getItem('taskManager.formData');
            if (stored) {
                return JSON.parse(stored) as TaskFormData;
            }
        } catch (e) {
            console.warn('Failed to restore form data from sessionStorage:', e);
        }
        return { ...INITIAL_FORM_STATE };
    });
    const [editingTaskId, setEditingTaskId] = useState<string | null>(() => {
        try {
            const stored = sessionStorage.getItem('taskManager.editingTaskId');
            if (stored) {
                return stored === 'null' ? null : stored;
            }
        } catch (e) {
            console.warn('Failed to restore editing task ID from sessionStorage:', e);
        }
        return null;
    });
    const [isDirty, setIsDirty] = useState(false);

    // UI State
    const [selectedDate, setSelectedDate] = useState<string>(toDateString());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle'); // Auto-save feedback

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Calendar State


    // --- Computed ---
    // For compatibility with existing code, create an activeFormData alias
    const activeFormData = formData;
    const isNewTask = editingTaskId === null;

    // --- Effects ---

    // Fetch Classrooms
    useEffect(() => {
        const fetchClassrooms = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(collection(db, 'classrooms'), where('teacherId', '==', auth.currentUser.uid));
                const snapshot = await getDocs(q);
                const roomData: Classroom[] = [];
                snapshot.forEach(doc => {
                    roomData.push({ id: doc.id, ...doc.data() } as Classroom);
                });
                setRooms(roomData);
            } catch (error) {
                console.error("Failed to fetch classrooms:", error);
            } finally {
                setLoadingRooms(false);
            }
        };
        fetchClassrooms();
    }, []);

    // Fetch Tasks (Real-time)
    useEffect(() => {
        if (!auth.currentUser) return;

        const q = query(
            collection(db, 'tasks'),
            where('teacherId', '==', auth.currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const taskData: Task[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                taskData.push({
                    id: doc.id,
                    ...data,
                    type: data.type || 'task', // Default to 'task' for legacy items
                    parentId: data.parentId || null,
                    rootId: data.rootId || null,
                    path: data.path || [],
                    pathTitles: data.pathTitles || [],
                    childIds: data.childIds || [],
                    selectedRoomIds: data.selectedRoomIds || [],
                    status: data.status || 'todo',
                } as Task);
            });
            taskData.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
            setTasks(taskData);
            setLoadingTasks(false);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            setLoadingTasks(false);
        });

        return () => unsubscribe();
    }, []);

    // Auto-select current class for new tasks (without marking as dirty)
    useEffect(() => {
        if (currentClassId && isNewTask && !formData.selectedRoomIds.includes(currentClassId)) {
            setFormData(prev => ({
                ...prev,
                selectedRoomIds: [currentClassId, ...prev.selectedRoomIds]
            }));
        }
    }, [currentClassId, isNewTask]);

    // Persist formData to sessionStorage on changes
    useEffect(() => {
        try {
            sessionStorage.setItem('taskManager.formData', JSON.stringify(formData));
        } catch (e) {
            console.warn('Failed to persist form data to sessionStorage:', e);
        }
    }, [formData]);

    // Persist editingTaskId to sessionStorage on changes
    useEffect(() => {
        try {
            sessionStorage.setItem('taskManager.editingTaskId', editingTaskId || 'null');
        } catch (e) {
            console.warn('Failed to persist editing task ID to sessionStorage:', e);
        }
    }, [editingTaskId]);

    // Handle initialTask prop - open it if provided
    useEffect(() => {
        if (initialTask) {
            // We need to use a timeout or ensure tasks are loaded, but for now let's just push it to state
            // Re-using the logic from handleEditClick would be ideal, but that function relies on 'tasks' state which might not be loaded yet?
            // Actually, handleEditClick uses 'tasks' to find ancestors. 
            // If we just want to open *this* task, we can do it directly.
            // But we want ancestors too.
            // Let's assume tasks might be loaded shortly.

            // However, since 'tasks' is loaded async, we might not find ancestors immediately.
            // But 'initialTask' object itself is available.
            // Let's defer this to when tasks are loaded IF we want ancestors.
            // For now, let's just try to call handleEditClick if tasks are available, or just open the single card.

            // Actually, simpler: define handleEditClick inside the component scope (it is).
            // Call it if tasks are loaded.
            if (tasks.length > 0) {
                handleEditClick(initialTask);
            } else {
                // If tasks aren't loaded, at least open the target task so the user sees something
                // But ideally we wait for tasks.
                // Let's add 'tasks' to dependency? No, that might trigger unwanted edits.
                // We only want to trigger when initialTask CHANGES.
            }
        }
    }, [initialTask, tasks.length > 0]); // Trigger when initialTask changes OR tasks load (if initialTask is present)
    // Note: This might re-trigger if tasks updates. We should probably only do it once per initialTask reference.
    // But initialTask comes from parent state, typically set on click.

    // Better implementation:
    // If we have initialTask, we want to open it. Check if it's already open?
    // handleEditClick handles "already open" logic (sort of, strictly it just sets openCards).
    // We should make sure we don't overwrite user work if they are doing something else.
    // The parent sets 'editingTask' then likely clears it? No, we didn't add clear logic.
    // The user clicks "Edit" -> parent sets editingTask -> TaskManager mounts/updates -> effect runs.

    // Let's refine the effect to be safe.

    const processedInitialTaskRef = useRef<string | null>(null);

    useEffect(() => {
        if (initialTask && initialTask.id !== processedInitialTaskRef.current && tasks.length > 0) {
            handleEditClick(initialTask);
            processedInitialTaskRef.current = initialTask.id;
        }
    }, [initialTask, tasks]);

    // --- Helpers ---





    // Filter tasks by date and class, then build hierarchy with proper ordering
    const filteredTasks = useMemo(() => {
        const filtered = tasks.filter(task => {
            const isInDateRange = task.startDate && task.endDate
                ? selectedDate >= task.startDate && selectedDate <= task.endDate
                : true;
            const isAssignedToCurrentClass = currentClassId
                ? task.selectedRoomIds?.includes(currentClassId)
                : true;
            return isInDateRange && isAssignedToCurrentClass;
        });

        // Sort hierarchically: parent followed by its children
        const buildHierarchy = (parentId: string | null): Task[] => {
            const children = filtered
                .filter(t => t.parentId === parentId)
                .sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));

            const result: Task[] = [];
            for (const child of children) {
                result.push(child);
                result.push(...buildHierarchy(child.id)); // Recursively add children
            }
            return result;
        };

        return buildHierarchy(null); // Start from root tasks (no parent)
    }, [tasks, selectedDate, currentClassId]);

    // Get available parents for a given type
    const getAvailableParents = useCallback((itemType: ItemType): Task[] => {
        const allowedParentTypes = ALLOWED_PARENT_TYPES[itemType];
        if (allowedParentTypes.length === 0) return [];

        return tasks.filter(t => allowedParentTypes.includes(t.type));
    }, [tasks]);



    // Calculate progress for a parent item
    const getProgress = useCallback((parentId: string): { completed: number; total: number } => {
        const children = tasks.filter(t => t.parentId === parentId);
        const total = children.length;
        const completed = children.filter(t => t.status === 'done').length;
        return { completed, total };
    }, [tasks]);

    // Calculate hierarchical number for display (1, 2, 2.1, 2.2, etc.)
    // When forDate is provided, root-level tasks are numbered relative to that day
    const getHierarchicalNumber = useCallback((task: Task, allTasks: Task[], forDate?: string): string => {
        // For root tasks with date filter, only count siblings on the same day
        const siblings = task.parentId
            ? allTasks.filter(t => t.parentId === task.parentId)
            : forDate
                ? allTasks.filter(t => !t.parentId && t.endDate === forDate)
                : allTasks.filter(t => !t.parentId);

        // Sort by presentation order
        siblings.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
        const myIndex = siblings.findIndex(t => t.id === task.id) + 1;

        if (!task.parentId) return String(myIndex);

        const parent = allTasks.find(t => t.id === task.parentId);
        if (!parent) return String(myIndex);

        return `${getHierarchicalNumber(parent, allTasks, forDate)}.${myIndex}`;
    }, []);

    // --- Form Management (simplified - single form instead of multi-card) ---

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

    // Alias for compatibility with existing code
    const updateActiveCard = updateField;

    const resetForm = useCallback(() => {
        setFormData({
            ...INITIAL_FORM_STATE,
            selectedRoomIds: currentClassId ? [currentClassId] : []
        });
        setEditingTaskId(null);
        setIsDirty(false);
    }, [currentClassId]);



    const loadTask = useCallback((task: Task) => {
        setFormData({
            title: task.title,
            description: task.description || '',
            type: task.type,
            parentId: task.parentId,
            linkURL: task.linkURL || '',
            startDate: task.startDate || toDateString(),
            endDate: task.endDate || toDateString(),
            selectedRoomIds: task.selectedRoomIds || [],
            attachments: task.attachments || [],
        });
        setEditingTaskId(task.id);
        setIsDirty(false);
    }, []);

    // Called when clicking a task in the summary
    const handleEditClick = useCallback((task: Task) => {
        if (isDirty) {
            if (!window.confirm('You have unsaved changes. Discard and switch tasks?')) {
                return;
            }
        }
        loadTask(task);
    }, [isDirty, loadTask]);

    const handleAddSubtask = useCallback((parentTask: Task | { id: string, type: ItemType, title: string, path: string[], pathTitles: string[], rootId: string | null, selectedRoomIds: string[], startDate?: string, endDate?: string }) => {
        const allowedChildren = ALLOWED_CHILD_TYPES[parentTask.type];
        if (allowedChildren.length === 0) {
            handleError(`Cannot add subtasks to a ${getTypeLabel(parentTask.type)}`);
            return;
        }

        if (isDirty) {
            if (!window.confirm('You have unsaved changes. Discard and create subtask?')) {
                return;
            }
        }

        const childType = allowedChildren[0] as ItemType;

        setFormData({
            ...INITIAL_FORM_STATE,
            type: childType,
            parentId: parentTask.id,
            startDate: parentTask.startDate || INITIAL_FORM_STATE.startDate,
            endDate: parentTask.endDate || INITIAL_FORM_STATE.endDate,
            selectedRoomIds: parentTask.selectedRoomIds || [],
        });
        setEditingTaskId(null); // It's a new task
        setIsDirty(false);
    }, [isDirty]);

    // Quick-create a new Project or Assignment to link to
    const handleQuickCreateParent = useCallback(async (type: 'project' | 'assignment') => {
        const title = window.prompt(`Enter ${type} title:`);
        if (!title?.trim() || !auth.currentUser) return null;

        try {
            const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.presentationOrder || 0)) : 0;

            const docRef = await addDoc(collection(db, 'tasks'), {
                title: title.trim(),
                description: '',
                type,
                status: 'draft',
                parentId: null,
                rootId: null,
                path: [],
                pathTitles: [],
                childIds: [],
                startDate: toDateString(),
                endDate: toDateString(),
                selectedRoomIds: currentClassId ? [currentClassId] : [],
                teacherId: auth.currentUser.uid,
                presentationOrder: maxOrder + 1,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                attachments: [],
                linkURL: '',
                imageURL: '',
            });

            handleSuccess(`${type === 'project' ? 'Project' : 'Assignment'} "${title}" created as draft`);

            // Set as parent of current form
            updateActiveCard('parentId', docRef.id);

            return docRef.id;
        } catch (error) {
            handleError(`Failed to create ${type}`);
            return null;
        }
    }, [tasks, currentClassId, updateActiveCard]);

    // --- File Upload Handlers ---

    const uploadFile = async (file: File): Promise<Attachment | null> => {
        if (!auth.currentUser) {
            handleError('You must be logged in to upload files');
            return null;
        }

        // Validate file type
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            handleError(`File type not allowed: ${file.type}`);
            return null;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            handleError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
            return null;
        }

        setIsUploading(true);
        try {
            const attachmentId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const filePath = `attachments/${auth.currentUser.uid}/${attachmentId}_${file.name}`;
            const storageRef = ref(storage, filePath);

            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            const attachment: Attachment = {
                id: attachmentId,
                filename: file.name,
                mimeType: file.type,
                url: downloadUrl,
                size: file.size,
                uploadedAt: serverTimestamp(),
                uploadedBy: auth.currentUser.uid,
            };

            return attachment;
        } catch (error) {
            console.error('Error uploading file:', error);
            handleError('Failed to upload file');
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const newAttachments: Attachment[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file) {
                const attachment = await uploadFile(file);
                if (attachment) {
                    newAttachments.push(attachment);
                }
            }
        }

        if (newAttachments.length > 0) {
            updateActiveCard('attachments', (prev: Attachment[] | undefined) => [
                ...(prev || []),
                ...newAttachments
            ]);
            handleSuccess(`${newAttachments.length} file(s) uploaded`);
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Handle drag-drop file upload from RichTextEditor
    const handleFileDrop = async (files: File[]) => {
        if (files.length === 0) return;

        const newAttachments: Attachment[] = [];

        for (const file of files) {
            const attachment = await uploadFile(file);
            if (attachment) {
                newAttachments.push(attachment);
            }
        }

        if (newAttachments.length > 0) {
            updateActiveCard('attachments', (prev: Attachment[] | undefined) => [
                ...(prev || []),
                ...newAttachments
            ]);
            handleSuccess(`${newAttachments.length} file(s) uploaded`);
        }
    };

    const removeAttachment = async (attachmentId: string) => {
        const currentAttachments = activeFormData.attachments || [];
        const attachment = currentAttachments.find(a => a.id === attachmentId);

        if (attachment) {
            try {
                // Try to delete from storage (may fail if URL structure changed)
                const pathMatch = attachment.url.match(/attachments%2F([^?]+)/);
                if (pathMatch && pathMatch[1]) {
                    const filePath = decodeURIComponent(pathMatch[1]);
                    const storageRef = ref(storage, `attachments/${filePath}`);
                    await deleteObject(storageRef).catch(() => {
                        // Ignore deletion errors - file may already be deleted
                    });
                }
            } catch (error) {
                console.warn('Could not delete attachment from storage:', error);
            }
        }

        updateActiveCard('attachments', (prev: Attachment[] | undefined) =>
            (prev || []).filter(a => a.id !== attachmentId)
        );
    };

    // --- Handlers ---

    const handleRoomToggle = (roomId: string) => {
        updateActiveCard('selectedRoomIds', prev => {
            return prev.includes(roomId)
                ? prev.filter(id => id !== roomId)
                : [...prev, roomId];
        });
    };

    const handleSave = async (isAutoSave: boolean = false) => {
        if (!auth.currentUser) return;

        // Validation - stricter for manual save
        if (!isAutoSave) {
            if (!formData.title.trim()) {
                handleError("Please enter a title.");
                return;
            }
            if (formData.selectedRoomIds.length === 0) {
                handleError("Please assign at least one class.");
                return;
            }
        } else {
            // Auto-save requirements (looser)
            if (!formData.title.trim() && formData.selectedRoomIds.length === 0) return; // Nothing to save
        }

        setIsSubmitting(true);
        try {
            // Build path...
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

            // Determine status
            const statusToSave: TaskStatus = isAutoSave ? 'draft' : 'todo';

            const taskData = {
                title: formData.title,
                description: formData.description,
                type: formData.type,
                parentId: formData.parentId,
                rootId,
                path,
                pathTitles,
                linkURL: formData.linkURL,
                startDate: formData.startDate,
                endDate: formData.endDate,
                selectedRoomIds: formData.selectedRoomIds,
                attachments: formData.attachments || [],
                teacherId: auth.currentUser.uid,
                updatedAt: serverTimestamp(),
                status: statusToSave, // Update status
            };

            if (isNewTask) {
                // Create new task
                const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.presentationOrder || 0)) : 0;

                const docRef = await addDoc(collection(db, 'tasks'), {
                    ...taskData,
                    presentationOrder: maxOrder + 1,
                    createdAt: serverTimestamp(),
                    imageURL: '',
                    childIds: [],
                });

                // Update parent's childIds if applicable
                if (formData.parentId) {
                    const parentDoc = doc(db, 'tasks', formData.parentId);
                    const parent = tasks.find(t => t.id === formData.parentId);
                    if (parent) {
                        await updateDoc(parentDoc, {
                            childIds: [...(parent.childIds || []), docRef.id]
                        });
                    }
                }

                if (!isAutoSave) {
                    handleSuccess(`${getTypeLabel(formData.type)} created successfully!`);
                    resetForm();
                } else {
                    // Critical: Determine that this is now an existing task so future auto-saves update it
                    // We must update the editingTaskId to the new ID
                    // And conceptually it's no longer a "new task" in the UI sense of "unsaved"
                    // However, our component derives "isNewTask" from editingTaskId being null.
                    // So we must switch to editing mode.
                    setEditingTaskId(docRef.id);
                    // Note: This might effectively "refresh" the component state because editingTaskId changes.
                    // Ideally we update local state without full reload if possible, but switching mode is safer.
                }

            } else if (editingTaskId) {
                // Update existing task
                await updateDoc(doc(db, 'tasks', editingTaskId), taskData);

                if (!isAutoSave) {
                    handleSuccess(`${getTypeLabel(formData.type)} updated!`);
                    setIsDirty(false);
                    // Optionally reset or keep open depending on user flow. 
                    // Current flow seems to be keep open or manual reset? 
                    // Actually existing code only did setIsDirty(false).
                } else {
                    // Quiet update
                    setIsDirty(false); // It's saved now
                }
            }

        } catch (error) {
            console.error("Error saving:", error);
            if (!isAutoSave) handleError("Failed to save.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (taskId: string) => {
        if (!window.confirm("Are you sure you want to delete this item? Children will become standalone.")) return;

        setIsSubmitting(true);
        try {
            // Get the task to find its children
            const taskToDelete = tasks.find(t => t.id === taskId);

            // Update children to become standalone
            if (taskToDelete?.childIds?.length) {
                const batch = writeBatch(db);
                for (const childId of taskToDelete.childIds) {
                    batch.update(doc(db, 'tasks', childId), {
                        parentId: null,
                        rootId: null,
                        path: [],
                        pathTitles: [],
                    });
                }
                await batch.commit();
            }

            // Delete the task
            await deleteDoc(doc(db, 'tasks', taskId));
            handleSuccess("Item deleted.");
            resetForm();
        } catch (error) {
            console.error("Error deleting:", error);
            handleError("Failed to delete.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReorder = async (taskId: string, direction: 'up' | 'down') => {
        // Find the task being reordered
        const task = filteredTasks.find(t => t.id === taskId);
        if (!task) return;

        // Get siblings (tasks with the same parentId)
        const siblings = filteredTasks.filter(t => t.parentId === task.parentId);
        siblings.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));

        const currentIndex = siblings.findIndex(t => t.id === taskId);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= siblings.length) return;

        const currentTask = siblings[currentIndex];
        const targetTask = siblings[targetIndex];

        if (!currentTask || !targetTask) return;

        try {
            const currentOrder = currentTask.presentationOrder || 0;
            const targetOrder = targetTask.presentationOrder || 0;

            await updateDoc(doc(db, 'tasks', currentTask.id), { presentationOrder: targetOrder });
            await updateDoc(doc(db, 'tasks', targetTask.id), { presentationOrder: currentOrder });
        } catch (error) {
            console.error("Failed to reorder:", error);
        }
    };





    // --- Auto-Save Effect ---
    useEffect(() => {
        // Only auto-save if dirty and has minimal required data
        if (!isDirty || (!activeFormData.title.trim() && activeFormData.selectedRoomIds.length === 0)) return;

        const timer = setTimeout(async () => {
            setSaveState('saving');
            await handleSave(true); // isAutoSave = true
            setSaveState('saved');
            // Reset to idle after 2 seconds
            setTimeout(() => setSaveState('idle'), 2000);
        }, 2000); // 2 second debounce

        return () => clearTimeout(timer);
    }, [activeFormData, isDirty]);

    // --- Render ---

    const availableParents = getAvailableParents(activeFormData.type);

    // Determine if we can add a subtask to the current active task
    const canAddSubtaskToActive = activeFormData.type !== 'subtask' && editingTaskId !== null;

    return (
        <div className="flex-1 h-full overflow-y-auto lg:overflow-hidden">
            <div className="min-h-full lg:h-full grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* LEFT PANEL: Task Editor */}
                <div className="lg:col-span-3 flex flex-col h-auto lg:h-full lg:overflow-y-auto custom-scrollbar">
                    {/* Consolidated Drafts Row - serves as navigation + actions */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap pl-4">
                        {(() => {
                            const drafts = tasks.filter(t => t.status === 'draft');
                            return (
                                <>
                                    {drafts.length > 0 && (
                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Drafts:</span>
                                    )}
                                    {drafts.slice(0, 6).map(draft => {
                                        const isActive = editingTaskId === draft.id;
                                        // Use day-relative numbering based on the draft's due date
                                        const hierNum = getHierarchicalNumber(draft, tasks, draft.endDate);
                                        return (
                                            <button
                                                key={draft.id}
                                                onClick={() => loadTask(draft)}
                                                title={draft.title}
                                                className={`
                                                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
                                                    ${isActive
                                                        ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/40'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent'}
                                                `}
                                            >
                                                <span>📝</span>
                                                <span className="font-bold">{hierNum}.</span>
                                                <span className="truncate max-w-[80px]">{draft.title || 'Untitled'}</span>
                                            </button>
                                        );
                                    })}
                                    {drafts.length > 6 && (
                                        <span className="text-xs text-gray-400">+{drafts.length - 6} more</span>
                                    )}
                                </>
                            );
                        })()}
                        {/* + New Task button */}
                        <button
                            onClick={resetForm}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent transition-colors text-xs font-medium border border-brand-accent/30"
                            title="Create new task"
                        >
                            <Plus size={14} />
                            <span>New Task</span>
                        </button>
                        {/* Discard button - only when dirty */}
                        {isDirty && (
                            <button
                                onClick={() => {
                                    if (window.confirm('Discard unsaved changes?')) {
                                        sessionStorage.removeItem('taskManager.formData');
                                        sessionStorage.removeItem('taskManager.editingTaskId');
                                        resetForm();
                                    }
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs font-medium ml-auto"
                            >
                                <X size={14} />
                                Discard
                            </button>
                        )}
                    </div>

                    {/* Main Form Card */}
                    <div className="bg-brand-lightSurface dark:bg-brand-darkSurface border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4 flex-1 flex flex-col relative z-40">
                        {/* Save State Indicator - top right */}
                        <div className="absolute top-3 right-3 z-10">
                            {saveState === 'saving' && (
                                <div className="flex items-center gap-1.5 text-gray-400" title="Saving...">
                                    <Loader size={14} className="animate-spin" />
                                </div>
                            )}
                            {saveState === 'saved' && (
                                <div className="flex items-center gap-1.5 text-green-500" title="Saved">
                                    <Check size={16} />
                                </div>
                            )}
                        </div>

                        {/* Title Input */}
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0">Title</span>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={activeFormData.title}
                                    onChange={(e) => updateActiveCard('title', e.target.value)}
                                    placeholder="Task Title"
                                    className="w-full text-xl font-bold bg-transparent border-0 border-b-2 border-transparent hover:border-gray-200 focus:border-brand-accent focus:ring-0 px-2 py-1 transition-all placeholder-gray-400 dark:placeholder-gray-600 text-brand-textDarkPrimary dark:text-brand-textPrimary"
                                />
                            </div>
                        </div>

                        {/* Metadata Row: Type, Connections, Dates */}
                        <div className="flex items-end gap-4 flex-wrap lg:flex-nowrap">
                            {/* TYPE */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Type</span>
                                <div className="w-[160px]">
                                    <Select<ItemType>
                                        value={activeFormData.type}
                                        onChange={(value) => updateActiveCard('type', value || 'task')}
                                        options={TYPE_OPTIONS.map(opt => ({
                                            ...opt,
                                            disabled: activeFormData.parentId
                                                ? !ALLOWED_CHILD_TYPES[tasks.find(t => t.id === activeFormData.parentId)?.type || 'task'].includes(opt.value)
                                                : false
                                        }))}
                                        icon={getTypeIcon(activeFormData.type)}
                                        iconColor={getTypeHexColor(activeFormData.type)}
                                        buttonClassName="font-bold py-1 text-sm"
                                    />
                                </div>
                            </div>

                            {/* CONNECTIONS */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Connections</span>
                                <div className="w-[160px]">
                                    <Select<string>
                                        value={activeFormData.parentId}
                                        onChange={(value) => {
                                            if (value === '__add_subtask__') {
                                                // Add a subtask to the current task
                                                if (editingTaskId) {
                                                    const currentTask = tasks.find(t => t.id === editingTaskId);
                                                    if (currentTask) {
                                                        handleAddSubtask(currentTask);
                                                    }
                                                }
                                            } else {
                                                updateActiveCard('parentId', value);
                                            }
                                        }}
                                        options={[
                                            // Add subtask option - only show if editing an existing task that can have children
                                            ...(editingTaskId && !['subtask'].includes(activeFormData.type) ? [
                                                { value: '__add_subtask__', label: '+ Add Subtask', icon: Plus, iconColor: '#f97316' },
                                                { value: '__divider_top__', label: '──────────', disabled: true },
                                            ] : []),
                                            // Available parents
                                            ...availableParents.map(parent => ({
                                                value: parent.id,
                                                label: parent.pathTitles?.length
                                                    ? `${getHierarchicalNumber(parent, tasks)}. ${parent.title}`
                                                    : `${getHierarchicalNumber(parent, tasks)}. ${parent.title}`,
                                                icon: getTypeIcon(parent.type),
                                                iconColor: getTypeHexColor(parent.type),
                                            })),
                                        ]}
                                        placeholder="Linked to..."
                                        icon={LinkIcon}
                                        nullable
                                        searchable
                                        buttonClassName="py-1 text-sm"
                                    />
                                </div>
                            </div>

                            {/* DATES - pushed to right */}
                            <div className="flex flex-col gap-1 ml-auto">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Dates</span>
                                <DateRangePicker
                                    startDate={activeFormData.startDate}
                                    endDate={activeFormData.endDate}
                                    onStartDateChange={(value) => updateActiveCard('startDate', value)}
                                    onEndDateChange={(value) => updateActiveCard('endDate', value)}
                                    startPlaceholder="Start"
                                    endPlaceholder="Due"
                                    buttonClassName="py-1 text-sm"
                                />
                            </div>
                        </div>
                        {/* Description & Attachments Section */}
                        {/* Description Container with embedded Upload/Link buttons */}
                        <div className="flex-1 min-h-[150px] lg:min-h-[200px] relative">
                            <div className="absolute inset-0 flex flex-col">
                                <div className="flex-1 rounded-t-md border-2 border-b-0 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 overflow-hidden">
                                    <RichTextEditor
                                        value={activeFormData.description}
                                        onChange={(value) => updateActiveCard('description', value)}
                                        onDrop={handleFileDrop}
                                        placeholder="Create this task using text, video links, or drag and drop photos"
                                        className="h-full text-brand-textDarkPrimary dark:text-brand-textPrimary text-sm"
                                    />
                                </div>
                                {/* Bottom bar: Attachments + Links + Upload/Link buttons */}
                                <div className="px-4 py-3 rounded-b-md border-2 border-t-0 border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/20 flex flex-wrap items-center gap-2 min-h-[44px]">
                                    {/* Inline attachments with image thumbnails */}
                                    {activeFormData.attachments && activeFormData.attachments.map(attachment => (
                                        <div
                                            key={attachment.id}
                                            className="flex items-center gap-1.5 px-2 py-1.5 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600 text-xs group"
                                        >
                                            {attachment.mimeType.startsWith('image/') ? (
                                                /* Image thumbnail preview */
                                                <a
                                                    href={attachment.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                                >
                                                    <img
                                                        src={attachment.url}
                                                        alt={attachment.filename}
                                                        className="w-10 h-10 object-cover rounded border border-gray-200 dark:border-gray-600"
                                                    />
                                                    <span className="text-brand-textDarkPrimary dark:text-brand-textPrimary truncate max-w-[80px]">
                                                        {attachment.filename}
                                                    </span>
                                                </a>
                                            ) : (
                                                /* Non-image file icon */
                                                <>
                                                    <FileIcon size={12} className="text-gray-500" />
                                                    <a
                                                        href={attachment.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-brand-textDarkPrimary dark:text-brand-textPrimary hover:text-brand-accent truncate max-w-[100px]"
                                                    >
                                                        {attachment.filename}
                                                    </a>
                                                </>
                                            )}
                                            <button
                                                onClick={() => removeAttachment(attachment.id)}
                                                className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                    {/* Inline link display */}
                                    {activeFormData.linkURL && (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600 text-xs">
                                            <LinkIcon size={12} className="text-blue-500" />
                                            <a
                                                href={activeFormData.linkURL}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-brand-textDarkPrimary dark:text-brand-textPrimary hover:text-brand-accent truncate max-w-[120px]"
                                            >
                                                {(() => { try { return new URL(activeFormData.linkURL).hostname; } catch { return activeFormData.linkURL; } })()}
                                            </a>
                                            <button
                                                onClick={() => updateActiveCard('linkURL', '')}
                                                className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    )}
                                    {/* Upload & Link buttons - Always visible now for better UX */}
                                    <div className="flex items-center gap-3">
                                        <div className="relative py-2.5 px-4 min-h-[44px] rounded-md border-2 border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 group cursor-pointer">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                accept={ALLOWED_FILE_TYPES.join(',')}
                                                onChange={handleFileSelect}
                                                disabled={isUploading}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className={`flex items-center justify-center gap-2 transition-colors ${isUploading ? 'text-brand-accent' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                                                {isUploading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
                                                <span className="text-sm font-medium">{isUploading ? 'Uploading...' : 'Upload'}</span>
                                            </div>
                                        </div>
                                        {!activeFormData.linkURL && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const url = prompt('Enter URL:');
                                                    if (url) updateActiveCard('linkURL', url);
                                                }}
                                                className="py-2.5 px-4 min-h-[44px] rounded-md border-2 border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 group"
                                            >
                                                <div className="flex items-center justify-center gap-2 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                                                    <LinkIcon size={16} />
                                                    <span className="text-sm font-medium">Add Link</span>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tags Row */}
                        <div className="pt-4 flex flex-col gap-1">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Add to Class:</span>

                            <div className="flex flex-wrap items-center gap-2">
                                {loadingRooms ? (
                                    <Loader className="w-4 h-4 animate-spin text-gray-400" />
                                ) : rooms.length === 0 ? (
                                    <span className="text-xs text-gray-400">No classes found</span>
                                ) : (
                                    rooms.map(room => {
                                        const isSelected = activeFormData.selectedRoomIds.includes(room.id);
                                        const roomColor = room.color || '#3B82F6';
                                        return (
                                            <button
                                                key={room.id}
                                                type="button"
                                                onClick={() => handleRoomToggle(room.id)}
                                                style={{
                                                    borderColor: isSelected ? roomColor : undefined,
                                                    backgroundColor: isSelected ? `${roomColor}15` : undefined,
                                                    color: isSelected ? roomColor : undefined,
                                                }}
                                                className={`
                                                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border
                                                            focus:outline-none focus:ring-2 focus:ring-offset-1
                                                            ${isSelected
                                                        ? 'shadow-sm'
                                                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800/50'}
                                                        `}
                                            >
                                                {isSelected && <Check size={12} />}
                                                {room.name}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Footer Action Bar */}
                        <div className="pt-6 mt-auto flex items-center justify-between gap-4">
                            {/* Left: Delete */}
                            <div>
                                {!isNewTask && (
                                    <button
                                        onClick={() => handleDelete(editingTaskId!)}
                                        disabled={isSubmitting}
                                        className="min-w-[120px] px-6 py-2.5 rounded-md border-2 border-red-500 bg-transparent text-red-500 hover:bg-red-500/10 transition-all font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                    >
                                        <Trash2 size={16} />
                                        <span>Delete</span>
                                    </button>
                                )}
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-3">

                                {/* Save Button */}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!activeFormData.title.trim()) {
                                            handleError(new Error("⚠️ Please include a title before saving."));
                                            return;
                                        }
                                        await handleSave();
                                    }}
                                    disabled={isSubmitting}
                                    className="min-w-[120px] px-6 py-2.5 rounded-md border-2 border-brand-accent bg-transparent text-brand-accent hover:bg-brand-accent/10 transition-all font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                                >
                                    {isSubmitting ? <Loader size={14} className="animate-spin" /> : <Check size={16} />}
                                    <span>Save</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>


                {/* RIGHT PANEL: Calendar & List */}
                <div className="lg:col-span-1 flex flex-col h-auto lg:h-full lg:overflow-hidden">
                    <div className="h-auto lg:h-full flex flex-col justify-between overflow-hidden">

                        {/* Simplified Date Header with Chevron Navigation */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => {
                                    const prev = new Date(selectedDate + 'T00:00:00');
                                    prev.setDate(prev.getDate() - 1);
                                    setSelectedDate(toDateString(prev));
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
                                aria-label="Previous day"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex items-center gap-2 text-center relative">
                                {/* Clickable calendar icon with custom popover */}
                                <button
                                    ref={calendarButtonRef}
                                    type="button"
                                    onClick={() => {
                                        if (!isCalendarOpen) updateCalendarPosition();
                                        setIsCalendarOpen(!isCalendarOpen);
                                    }}
                                    className={`p-1 -m-1 rounded hover:bg-brand-accent/10 transition-colors cursor-pointer ${isCalendarOpen ? 'text-brand-accent bg-brand-accent/10' : 'text-brand-accent'}`}
                                    title="Jump to date"
                                >
                                    <CalendarIcon size={18} className="flex-shrink-0" />
                                </button>

                                {isCalendarOpen && createPortal(
                                    <div
                                        ref={calendarPopoverRef}
                                        className="fixed z-[9999] bg-brand-lightSurface dark:bg-brand-darkSurface border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 animate-fade-in origin-top-left"
                                        style={{
                                            top: calendarPosition.top,
                                            left: calendarPosition.left,
                                            transform: 'scale(0.9)', // Make it smaller as requested
                                            transformOrigin: calendarPosition.origin
                                        }}
                                    >
                                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDate(toDateString(new Date()));
                                                    setIsCalendarOpen(false);
                                                }}
                                                className="text-xs font-medium text-brand-accent hover:text-brand-accent/80 transition-colors"
                                            >
                                                Today
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsCalendarOpen(false)}
                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <DayPicker
                                            mode="single"
                                            selected={new Date(selectedDate + 'T00:00:00')}
                                            onSelect={(date) => {
                                                if (date) {
                                                    setSelectedDate(toDateString(date));
                                                    setIsCalendarOpen(false);
                                                }
                                            }}
                                            defaultMonth={new Date(selectedDate + 'T00:00:00')}
                                            components={{
                                                Chevron: ({ orientation }) =>
                                                    orientation === 'left'
                                                        ? <ChevronLeft size={16} />
                                                        : <ChevronRight size={16} />,
                                            }}
                                            classNames={{
                                                ...getDefaultClassNames(),
                                                root: `${getDefaultClassNames().root} rdp-custom`,
                                                disabled: 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                                                outside: 'text-gray-300 dark:text-gray-600 opacity-50',
                                                chevron: 'fill-gray-500 dark:fill-gray-400',
                                            }}
                                        />
                                    </div>,
                                    document.body
                                )}

                                <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary text-sm sm:text-base">
                                    Shape of the Day:
                                    {' '}
                                    <span className={selectedDate === toDateString() ? 'text-brand-accent' : ''}>
                                        {selectedDate === toDateString()
                                            ? 'Today'
                                            : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </span>
                                </h3>
                            </div>

                            <button
                                onClick={() => {
                                    const next = new Date(selectedDate + 'T00:00:00');
                                    next.setDate(next.getDate() + 1);
                                    setSelectedDate(toDateString(next));
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
                                aria-label="Next day"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* Task List */}
                        <div className="flex-1 overflow-y-auto px-0 pt-0 pb-4 space-y-3 custom-scrollbar min-h-[300px] lg:min-h-0">
                            {!currentClassId ? (
                                <div className="text-center py-8 text-gray-400 italic text-sm">
                                    Select a class to view schedule.
                                </div>
                            ) : filteredTasks.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 italic text-sm">
                                    No tasks scheduled.
                                </div>
                            ) : (() => {
                                return filteredTasks.map((task) => {
                                    const TypeIconSmall = getTypeIcon(task.type);
                                    const progress = task.childIds?.length ? getProgress(task.id) : null;
                                    const isEditing = editingTaskId === task.id;

                                    // Get siblings (same parentId) for proper disabled state
                                    const siblings = filteredTasks.filter(t => t.parentId === task.parentId);
                                    siblings.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
                                    const siblingIndex = siblings.findIndex(t => t.id === task.id);

                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => handleEditClick(task)}
                                            style={{ marginLeft: `${(task.path?.length || 0) * 16}px` }}
                                            className={`
                                                group relative p-3 rounded-lg border-2 transition-all cursor-pointer
                                                ${isEditing
                                                    ? 'border-brand-accent bg-brand-accent/5'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-brand-lightSurface dark:bg-brand-darkSurface'}
                                            `}
                                        >

                                            <div className="flex items-start gap-2">
                                                {/* Reorder Controls - for all tasks within their sibling group */}
                                                <div className="flex flex-col" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleReorder(task.id, 'up')}
                                                        disabled={siblingIndex === 0}
                                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-brand-accent disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                                                    >
                                                        <ArrowUp size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReorder(task.id, 'down')}
                                                        disabled={siblingIndex === siblings.length - 1}
                                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-brand-accent disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                                                    >
                                                        <ArrowDown size={14} />
                                                    </button>
                                                </div>

                                                {/* Number + Type Icon - stacked vertically, right aligned */}
                                                <div className="flex flex-col items-end flex-shrink-0 w-8">
                                                    <span className="text-xs font-bold text-gray-400">
                                                        {getHierarchicalNumber(task, tasks, selectedDate)}
                                                    </span>
                                                    <span className={`w-6 h-6 rounded-md flex items-center justify-center ${getTypeColorClasses(task.type)}`}>
                                                        <TypeIconSmall size={12} />
                                                    </span>
                                                </div>

                                                {/* Content: Title + Due Date */}
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="font-bold text-sm text-brand-textDarkPrimary dark:text-brand-textPrimary line-clamp-1">
                                                        {task.title}
                                                    </h5>

                                                    {/* Due Date */}
                                                    {task.endDate && (
                                                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                            <CalendarIcon size={10} />
                                                            {task.endDate === toDateString()
                                                                ? 'Due today'
                                                                : `Due ${new Date(task.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                                                        </p>
                                                    )}


                                                </div>

                                                {/* Status/Actions - Top Right */}
                                                <div className="flex flex-col items-end gap-1" onClick={e => e.stopPropagation()}>
                                                    {/* Checkmark for published (non-draft) tasks */}
                                                    {task.status !== 'draft' && (
                                                        <div className="p-1 text-green-500" title="Published">
                                                            <Check size={14} />
                                                        </div>
                                                    )}
                                                    {/* Draft indicator for drafts */}
                                                    {task.status === 'draft' && (
                                                        <div className="px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
                                                            Draft
                                                        </div>
                                                    )}
                                                    {/* Add Subtask Button */}
                                                    {!['subtask'].includes(task.type) && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                handleAddSubtask(task);
                                                            }}
                                                            className="p-1 rounded text-brand-accent hover:bg-brand-accent/10 transition-all opacity-0 group-hover:opacity-100"
                                                            title="Add subtask"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
