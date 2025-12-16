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
    ChevronDown,
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
import { MultiSelect } from '../shared/MultiSelect';
import { DateRangePicker } from '../shared/DateRangePicker';
import { DatePicker } from '../shared/DatePicker';
import { RichTextEditor } from '../shared/RichTextEditor';
import { format, parse } from 'date-fns';
import { Button } from '../shared/Button';

import { handleError, handleSuccess } from '../../utils/errorHandler';
import { toDateString } from '../../utils/dateHelpers';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, updateDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, auth, storage, functions } from '../../firebase';
import { Classroom, ItemType, Task, TaskFormData, TaskStatus, ALLOWED_CHILD_TYPES, ALLOWED_PARENT_TYPES, Attachment, LinkAttachment } from '../../types';
import { useClassStore } from '../../store/classStore';

// --- Constants ---

const INITIAL_FORM_STATE: TaskFormData = {
    title: '',
    description: '',
    type: 'task',
    parentId: null,
    links: [],
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

// Get type color classes (use semantic CSS classes from index.css)
const getTypeColorClasses = (type: ItemType): string => {
    return `type-${type}`;
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

    // Single form editor state - always start with blank form
    // (sessionStorage only used for mid-session persistence, not initial load)
    const [formData, setFormData] = useState<TaskFormData>({ ...INITIAL_FORM_STATE });
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // UI State
    const [selectedDate, setSelectedDate] = useState<string>(toDateString());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingLinkTitle, setIsLoadingLinkTitle] = useState(false);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle'); // Auto-save feedback
    const [isMobileTasksOpen, setIsMobileTasksOpen] = useState(false); // Mobile accordion for tasks list
    const [summaryDate, setSummaryDate] = useState<string>(toDateString()); // Date for task summary view

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

    // --- Link Handlers ---

    // Add a new link and fetch its metadata
    const addLink = useCallback(async (url: string) => {
        // Validate URL format
        try {
            new URL(url);
        } catch {
            handleError('Please enter a valid URL');
            return;
        }

        // Check for duplicates
        if (formData.links?.some(link => link.url === url)) {
            handleError('This link is already added');
            return;
        }

        // Create new link with temporary ID
        const newLink: LinkAttachment = {
            id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url,
            addedAt: new Date(),
        };

        // Add link immediately (optimistic update)
        setFormData(prev => ({
            ...prev,
            links: [...(prev.links || []), newLink]
        }));
        setIsDirty(true);

        // Fetch metadata asynchronously
        setIsLoadingLinkTitle(true);
        try {
            const fetchMetadata = httpsCallable<{ url: string }, { title: string | null; siteName: string; error?: string }>(functions, 'fetchUrlMetadata');
            const result = await fetchMetadata({ url });

            if (result.data.title) {
                // Update the link with its title
                setFormData(prev => ({
                    ...prev,
                    links: prev.links?.map(link =>
                        link.id === newLink.id
                            ? { ...link, title: result.data.title || undefined }
                            : link
                    )
                }));
            }
        } catch (error) {
            console.warn('Failed to fetch URL metadata:', error);
        } finally {
            setIsLoadingLinkTitle(false);
        }
    }, [formData.links]);

    // Remove a link by ID
    const removeLink = useCallback((linkId: string) => {
        setFormData(prev => ({
            ...prev,
            links: prev.links?.filter(link => link.id !== linkId) || []
        }));
        setIsDirty(true);
    }, []);

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





    // Check if a task is "ongoing" (multi-day and not due on the selected date)
    const isOngoingTask = useCallback((task: Task, forDate: string): boolean => {
        if (!task.startDate || !task.endDate) return false;
        // Multi-day task (spans more than one day) and not due on the selected date
        return task.startDate !== task.endDate && task.endDate !== forDate;
    }, []);

    // Calculate hierarchical number for display (1, 2, 2.1, 2.2, etc.)
    // When forDate is provided, root-level tasks are numbered relative to that day
    // Matches ShapeOfDay.tsx behavior: due-today first, then ongoing tasks
    const getHierarchicalNumber = useCallback((task: Task, allTasks: Task[], forDate?: string): string => {
        // For root tasks with date filter, count all siblings active on that day (both due-today and ongoing)
        const siblings = task.parentId
            ? allTasks.filter(t => t.parentId === task.parentId)
            : forDate
                ? allTasks.filter(t => !t.parentId && t.startDate && t.endDate && forDate >= t.startDate && forDate <= t.endDate)
                : allTasks.filter(t => !t.parentId);

        // Sort: due-today first (by presentationOrder), then ongoing (by presentationOrder)
        if (forDate && !task.parentId) {
            siblings.sort((a, b) => {
                const aOngoing = isOngoingTask(a, forDate);
                const bOngoing = isOngoingTask(b, forDate);
                // If one is ongoing and one isn't, ongoing goes after
                if (aOngoing !== bOngoing) return aOngoing ? 1 : -1;
                // Otherwise sort by presentation order
                return (a.presentationOrder || 0) - (b.presentationOrder || 0);
            });
        } else {
            siblings.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
        }

        const myIndex = siblings.findIndex(t => t.id === task.id) + 1;

        if (!task.parentId) return String(myIndex);

        const parent = allTasks.find(t => t.id === task.parentId);
        if (!parent) return String(myIndex);

        return `${getHierarchicalNumber(parent, allTasks, forDate)}.${myIndex}`;
    }, [isOngoingTask]);

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
        // Handle backwards compatibility: convert legacy linkURL to links array
        let links: LinkAttachment[] = task.links || [];
        if (task.linkURL && links.length === 0) {
            // Migration from old single-link format
            links = [{
                id: `link_legacy_${Date.now()}`,
                url: task.linkURL,
                title: task.linkTitle,
                addedAt: task.createdAt || new Date(),
            }];
        }

        setFormData({
            title: task.title,
            description: task.description || '',
            type: task.type,
            parentId: task.parentId,
            links,
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
                links: formData.links || [],
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
                    resetForm(); // Reset to new blank task card after saving
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
            // Reset to idle after 1.5 seconds
            setTimeout(() => setSaveState('idle'), 1500);
        }, 1000); // 1 second debounce for quick auto-save

        return () => clearTimeout(timer);
    }, [activeFormData, isDirty]);

    // Wire up mobile "+" button from TeacherDashboard header
    useEffect(() => {
        const mobileBtn = document.getElementById('mobile-new-task-btn');
        if (mobileBtn) {
            const handleClick = () => resetForm();
            mobileBtn.addEventListener('click', handleClick);
            return () => mobileBtn.removeEventListener('click', handleClick);
        }
    }, []);

    // --- Render ---

    const availableParents = getAvailableParents(activeFormData.type);



    // Get current class name from rooms
    const currentClass = rooms.find(r => r.id === currentClassId);

    return (
        <div className="flex-1 h-full flex flex-col space-y-3">
            {/* Content Header - hidden on mobile (TeacherDashboard provides mobile header) */}
            <div className="hidden lg:grid h-16 shrink-0 grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                {/* Left 3 columns: Tasks label + Current Class + Drafts + New Task Button */}
                <div className="lg:col-span-3 flex items-center gap-3">
                    <div className="flex items-baseline gap-3 shrink-0">
                        <span className="text-fluid-lg font-black text-gray-400">
                            Tasks:
                        </span>
                        <span className="text-fluid-lg font-black text-brand-textDarkPrimary dark:text-brand-textPrimary underline decoration-brand-accent decoration-2 underline-offset-4">
                            {currentClass?.name || 'All Classes'}
                        </span>
                    </div>

                    {/* Drafts - inline between title and New Task */}
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                        {(() => {
                            const drafts = tasks.filter(t => t.status === 'draft');
                            return (
                                <>
                                    {drafts.length > 0 && (
                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Drafts:</span>
                                    )}
                                    {drafts.slice(0, 4).map(draft => {
                                        const isActive = editingTaskId === draft.id;
                                        const hierNum = getHierarchicalNumber(draft, tasks, draft.endDate);
                                        return (
                                            <button
                                                key={draft.id}
                                                onClick={() => loadTask(draft)}
                                                title={draft.title}
                                                className={`
                                                    flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all
                                                    ${isActive
                                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-400 dark:border-gray-600'
                                                        : 'bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 border border-transparent'}
                                                `}
                                            >
                                                <span className="font-bold">{hierNum}.</span>
                                                <span className="truncate max-w-[60px]">{draft.title || 'Untitled'}</span>
                                            </button>
                                        );
                                    })}
                                    {drafts.length > 4 && (
                                        <span className="text-xs text-gray-400">+{drafts.length - 4} more</span>
                                    )}
                                </>
                            );
                        })()}
                    </div>

                    {/* New Task Button - pushed to right of left section */}
                    <Button
                        variant="ghost"
                        size="md"
                        icon={Plus}
                        onClick={resetForm}
                        title="Create new task"
                        className="shrink-0 text-brand-accent"
                    >
                        New Task
                    </Button>
                </div>

                {/* Right column: Shape of the Day Date Navigation */}
                <div className="lg:col-span-1 flex items-center justify-center gap-2">
                    <button
                        onClick={() => {
                            const prev = new Date(selectedDate + 'T00:00:00');
                            prev.setDate(prev.getDate() - 1);
                            setSelectedDate(toDateString(prev));
                        }}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 focus:bg-gray-100 dark:focus:bg-gray-800/50 transition-all focus:outline-none"
                        aria-label="Previous day"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <div className="flex items-center gap-2 text-center relative">
                        <button
                            ref={calendarButtonRef}
                            type="button"
                            onClick={() => {
                                if (!isCalendarOpen) updateCalendarPosition();
                                setIsCalendarOpen(!isCalendarOpen);
                            }}
                            className={`p-1 -m-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50 focus:bg-gray-100 dark:focus:bg-gray-800/50 transition-colors cursor-pointer focus:outline-none ${isCalendarOpen ? 'text-brand-accent bg-brand-accent/10' : 'text-gray-400'}`}
                            title="Jump to date"
                        >
                            <CalendarIcon size={18} className="shrink-0" />
                        </button>

                        <span className="text-fluid-base font-bold whitespace-nowrap">
                            <span className="text-brand-textDarkPrimary dark:text-brand-textPrimary underline decoration-brand-accent">
                                {selectedDate === toDateString()
                                    ? 'Today'
                                    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-gray-400">{' '}To Do List</span>
                        </span>
                    </div>

                    <button
                        onClick={() => {
                            const next = new Date(selectedDate + 'T00:00:00');
                            next.setDate(next.getDate() + 1);
                            setSelectedDate(toDateString(next));
                        }}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 focus:bg-gray-100 dark:focus:bg-gray-800/50 transition-all focus:outline-none"
                        aria-label="Next day"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Main Content - flex layout on mobile, grid on desktop */}
            <div className="flex-1 min-h-0 flex flex-col lg:block overflow-hidden">
                <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-6 lg:h-full overflow-y-auto lg:overflow-hidden">

                    {/* LEFT PANEL: Task Editor - flex-1 to fill space on mobile */}
                    <div className="flex-1 min-h-0 lg:col-span-3 flex flex-col lg:overflow-y-auto custom-scrollbar">
                        {/* Main Form Card */}
                        <div className="bg-brand-lightSurface dark:bg-brand-darkSurface border-2 border-gray-400 dark:border-gray-600 rounded-lg p-4 space-y-4 flex-1 flex flex-col relative z-40">
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
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Title</span>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={activeFormData.title}
                                        onChange={(e) => updateActiveCard('title', e.target.value)}
                                        placeholder="Task Title"
                                        className="w-full text-xl font-bold bg-transparent border-0 border-b-2 border-transparent hover:border-gray-400 focus:border-brand-accent focus:ring-0 focus:outline-none px-2 py-1 transition-all placeholder-gray-400 dark:placeholder-gray-600 text-brand-textDarkPrimary dark:text-brand-textPrimary"
                                    />
                                </div>
                            </div>

                            {/* Metadata Row: Type, Connections, Dates - all on one row */}
                            <div className="flex items-end gap-2 lg:gap-4">
                                {/* TYPE */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Type</span>
                                    <div className="w-full lg:w-[160px]">
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

                                {/* CONNECTIONS - narrower on mobile */}
                                <div className="flex flex-col gap-1 shrink-0">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Link</span>
                                    <div className="w-24 lg:w-[160px]">
                                        <Select<string>
                                            value={activeFormData.parentId}
                                            onChange={async (value) => {
                                                if (value === '__add_child__') {
                                                    // Need to save first if this is a new task
                                                    if (!editingTaskId) {
                                                        if (!activeFormData.title.trim()) {
                                                            handleError(new Error("⚠️ Please add a title before adding children."));
                                                            return;
                                                        }
                                                        // Save the current task first
                                                        await handleSave();
                                                        // handleSave sets editingTaskId, so we need to find the saved task
                                                        // The task should now be in the tasks array
                                                        const savedTask = tasks.find(t => t.title === activeFormData.title);
                                                        if (savedTask) {
                                                            handleAddSubtask(savedTask);
                                                        }
                                                    } else {
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
                                                // Add child option based on type:
                                                // - Project/Assignment can add Task
                                                // - Task can add Subtask
                                                // - Subtask cannot add anything
                                                ...(['project', 'assignment'].includes(activeFormData.type) ? [
                                                    { value: '__add_child__', label: '+ Add Task', icon: Plus, iconColor: '#22c55e' },
                                                    { value: '__divider_top__', label: '──────────', disabled: true },
                                                ] : []),
                                                ...(activeFormData.type === 'task' ? [
                                                    { value: '__add_child__', label: '+ Add Subtask', icon: Plus, iconColor: '#f97316' },
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
                                            placeholder="..."
                                            icon={LinkIcon}
                                            nullable
                                            searchable
                                            buttonClassName="py-1 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* DATE RANGE - full range picker for all screen sizes */}
                                <div className="flex flex-col gap-1 ml-auto">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Dates</span>
                                    <DateRangePicker
                                        startDate={activeFormData.startDate}
                                        endDate={activeFormData.endDate}
                                        onStartDateChange={(value) => updateActiveCard('startDate', value)}
                                        onEndDateChange={(value) => updateActiveCard('endDate', value)}
                                        startPlaceholder="Start"
                                        endPlaceholder="Due"
                                        compactMode={true}
                                    />
                                </div>
                            </div>
                            {/* Description & Attachments Section */}
                            {/* Description Container with embedded Upload/Link buttons */}
                            <div className="flex-1 min-h-[120px] relative">
                                <div className="absolute inset-0 flex flex-col transition-all duration-200 rounded-md">
                                    <div className="flex-1 rounded-md border-2 border-gray-400 dark:border-gray-600 focus-within:border-gray-600 dark:focus-within:border-gray-400 bg-gray-50/50 dark:bg-gray-900/30 overflow-y-auto transition-colors">
                                        <RichTextEditor
                                            value={activeFormData.description}
                                            onChange={(value) => updateActiveCard('description', value)}
                                            onDrop={handleFileDrop}
                                            placeholder="Describe this task..."
                                            secondaryPlaceholder="Add text, links, or drag files here"
                                            className="h-full text-brand-textDarkPrimary dark:text-brand-textPrimary text-sm"
                                        />
                                    </div>
                                    {/* Bottom bar: Attachments + Links + Upload/Link buttons */}
                                    <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
                                        {/* Inline attachments with image thumbnails */}
                                        {activeFormData.attachments && activeFormData.attachments.map(attachment => (
                                            <div
                                                key={attachment.id}
                                                className="flex items-center gap-1.5 px-2 py-1.5 bg-white dark:bg-gray-800 rounded-md border border-gray-400 dark:border-gray-600 text-xs group hover:scale-[1.02] transition-transform cursor-default"
                                                title={`${attachment.filename} (${(attachment.size / 1024).toFixed(1)} KB)`}
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
                                        {/* Inline links display - Multiple links */}
                                        {activeFormData.links && activeFormData.links.map((link) => (
                                            <div
                                                key={link.id}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-gray-800 rounded-md border border-gray-400 dark:border-gray-600 text-xs max-w-[280px]"
                                            >
                                                <LinkIcon size={12} className="text-blue-500 shrink-0" />
                                                <a
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-brand-textDarkPrimary dark:text-brand-textPrimary hover:text-brand-accent truncate"
                                                    title={link.url}
                                                >
                                                    {link.title || (() => { try { return new URL(link.url).hostname; } catch { return link.url; } })()}
                                                </a>
                                                <button
                                                    onClick={() => removeLink(link.id)}
                                                    className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded shrink-0"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                        {/* Loading indicator while fetching link metadata */}
                                        {isLoadingLinkTitle && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400">
                                                <Loader size={12} className="animate-spin" />
                                                <span>Fetching title...</span>
                                            </div>
                                        )}
                                        {/* Upload & Link buttons - Always visible now for better UX */}
                                        <div className="flex items-center gap-3">
                                            <div className="relative py-2.5 px-4 min-h-[44px] rounded-md border-2 border-gray-400 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:border-gray-600 dark:hover:border-gray-400 hover:scale-105 hover:shadow-md transition-all duration-200 group cursor-pointer">
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
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const url = prompt('Enter URL:');
                                                    if (url) addLink(url);
                                                }}
                                                className="py-2.5 px-4 min-h-[44px] rounded-md border-2 border-gray-400 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:border-gray-600 dark:hover:border-gray-400 hover:scale-105 hover:shadow-md transition-all duration-200 group"
                                            >
                                                <div className="flex items-center justify-center gap-2 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                                                    <LinkIcon size={16} />
                                                    <span className="text-sm font-medium">Add Link</span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Row: Class Selector + Delete/Save buttons */}
                            <div className="pt-1 flex items-end justify-between gap-4">
                                {/* Left: Class Selector */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Add to Class:</span>
                                    <div className="w-[200px]">
                                        {loadingRooms ? (
                                            <Loader className="w-4 h-4 animate-spin text-gray-400" />
                                        ) : rooms.length === 0 ? (
                                            <span className="text-xs text-gray-400">No classes found</span>
                                        ) : (
                                            <MultiSelect<string>
                                                value={activeFormData.selectedRoomIds}
                                                onChange={(values) => updateActiveCard('selectedRoomIds', values)}
                                                options={rooms.map(room => ({
                                                    value: room.id,
                                                    label: room.name,
                                                    color: room.color || '#3B82F6',
                                                }))}
                                                placeholder="Select classes..."
                                                primaryValue={currentClassId || undefined}
                                                buttonClassName="py-2 text-sm"
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Right: Action Buttons */}
                                <div className="flex items-center gap-2">
                                    {/* Delete Button - always visible for existing tasks (drafts can be deleted) */}
                                    {!isNewTask && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(editingTaskId!)}
                                            disabled={isSubmitting}
                                            className="px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium border-2 border-gray-400 dark:border-gray-600 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-red-500 hover:border-red-400 transition-all disabled:opacity-50"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Trash2 size={16} />
                                                Delete
                                            </span>
                                        </button>
                                    )}

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
                                        className="min-w-[100px] px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium border-2 border-gray-400 dark:border-gray-600 text-brand-textDarkPrimary dark:text-brand-textPrimary hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:border-brand-accent focus:border-brand-accent transition-all disabled:opacity-50"
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            {isSubmitting ? <Loader size={16} className="animate-spin" /> : <Check size={16} className="text-brand-accent" />}
                                            Save
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Task List - shrink-0 on mobile so form gets the space */}
                    <div className="shrink-0 lg:col-span-1 flex flex-col lg:h-full lg:overflow-hidden">
                        <div className="flex flex-col justify-end lg:justify-between overflow-hidden pb-2 lg:pb-0 lg:h-full">

                            {/* Calendar Portal (rendered when open) */}
                            {isCalendarOpen && createPortal(
                                <div
                                    ref={calendarPopoverRef}
                                    className="fixed z-9999 bg-brand-lightSurface dark:bg-brand-darkSurface border-2 border-gray-400 dark:border-gray-600 rounded-xl shadow-lg p-3 animate-fade-in origin-top-left"
                                    style={{
                                        top: calendarPosition.top,
                                        left: calendarPosition.left,
                                        transform: 'scale(0.9)',
                                        transformOrigin: calendarPosition.origin
                                    }}
                                >
                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-400 dark:border-gray-600">
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

                            {/* Mobile Overlay - closes accordion when clicking outside */}
                            {isMobileTasksOpen && (
                                <div
                                    className="lg:hidden fixed inset-0 top-12 bg-black/30 z-40"
                                    onClick={() => setIsMobileTasksOpen(false)}
                                    aria-hidden="true"
                                />
                            )}

                            {/* Mobile Accordion Header for Task List - only visible on mobile */}
                            <div className="lg:hidden relative z-50 flex items-center w-full py-2.5 px-4 mt-2 rounded-lg border-2 border-gray-400 dark:border-gray-600 bg-brand-lightSurface dark:bg-brand-darkSurface">
                                {/* Left: Calendar icon */}
                                <DatePicker
                                    value={summaryDate || toDateString()}
                                    onChange={(value) => setSummaryDate(value || toDateString())}
                                    iconOnly={true}
                                    iconColor="var(--color-brand-accent)"
                                />

                                {/* Center: Title with task count */}
                                <div className="flex-1 flex items-center justify-center gap-2">
                                    <span className="font-medium text-gray-400">
                                        {summaryDate === toDateString() ? "Today's Tasks:" : format(parse(summaryDate, 'yyyy-MM-dd', new Date()), 'MMM d') + "'s Tasks:"}
                                    </span>
                                    <span className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">{filteredTasks.length}</span>
                                </div>

                                {/* Right: Expand/collapse toggle */}
                                <button
                                    type="button"
                                    onClick={() => setIsMobileTasksOpen(!isMobileTasksOpen)}
                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <ChevronDown
                                        size={18}
                                        className={`text-gray-400 transition-transform duration-200 ${isMobileTasksOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>
                            </div>

                            {/* Task List - collapsible on mobile, always visible on lg+ */}
                            <div className={`
                                overflow-y-auto px-1 space-y-3 custom-scrollbar relative z-50 bg-brand-lightSurface dark:bg-brand-darkSurface
                                lg:flex-1 lg:min-h-0 lg:pt-0 lg:pb-4 lg:bg-transparent
                                ${isMobileTasksOpen ? 'flex-1 pt-3 pb-4 rounded-lg' : 'max-h-0 lg:max-h-none overflow-hidden'}
                                transition-all duration-300 ease-in-out
                            `}>
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

                                        const isEditing = editingTaskId === task.id;

                                        // Get siblings (same parentId) for proper disabled state
                                        const siblings = filteredTasks.filter(t => t.parentId === task.parentId);
                                        siblings.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
                                        const siblingIndex = siblings.findIndex(t => t.id === task.id);

                                        return (
                                            <div
                                                key={task.id}
                                                onClick={() => {
                                                    handleEditClick(task);
                                                    setIsMobileTasksOpen(false); // Close accordion on mobile
                                                }}
                                                style={{ marginLeft: `${(task.path?.length || 0) * 16}px` }}
                                                className={`
                                                group relative p-3 rounded-lg border-2 transition-all cursor-pointer
                                                ${isEditing
                                                        ? 'border-gray-400 dark:border-gray-500 shadow-md bg-white dark:bg-gray-800'
                                                        : 'border-gray-400 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400 bg-brand-lightSurface dark:bg-brand-darkSurface'}
                                            `}
                                            >

                                                <div className="flex items-start gap-2">
                                                    {/* Reorder Controls - for all tasks within their sibling group */}
                                                    <div className="flex flex-col" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => handleReorder(task.id, 'up')}
                                                            disabled={siblingIndex === 0}
                                                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-400 hover:text-brand-accent focus:bg-gray-100 dark:focus:bg-gray-800/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors focus:outline-none"
                                                        >
                                                            <ArrowUp size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleReorder(task.id, 'down')}
                                                            disabled={siblingIndex === siblings.length - 1}
                                                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-400 hover:text-brand-accent focus:bg-gray-100 dark:focus:bg-gray-800/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors focus:outline-none"
                                                        >
                                                            <ArrowDown size={14} />
                                                        </button>
                                                    </div>

                                                    {/* Number + Type Icon - stacked vertically, left aligned */}
                                                    <div className="flex flex-col items-start shrink-0 w-8">
                                                        <span className="text-xs font-bold text-gray-400 text-left">
                                                            {getHierarchicalNumber(task, tasks, selectedDate)}
                                                        </span>
                                                        <span className={`w-6 h-6 rounded-md flex items-center justify-start ${getTypeColorClasses(task.type)}`}>
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
                                                                className="p-1 rounded-md text-brand-accent hover:bg-brand-accent/10 focus:bg-brand-accent/10 transition-all opacity-0 group-hover:opacity-100 focus:outline-none"
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
        </div>
    );
}
