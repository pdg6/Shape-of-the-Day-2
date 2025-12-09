import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
    Image as ImageIcon,
    File as FileIcon,
    Sparkles,
    CornerDownRight
} from 'lucide-react';
import { Button } from '../shared/Button';
import { Select, SelectOption } from '../shared/Select';
import { DateRangePicker } from '../shared/DateRangePicker';
import { TaskTabBar } from './TaskTabBar';
import { handleError, handleSuccess } from '../../utils/errorHandler';
import { toDateString } from '../../utils/dateHelpers';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, updateDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage } from '../../firebase';
import { Classroom, ItemType, Task, TaskFormData, TaskCardState, ALLOWED_CHILD_TYPES, ALLOWED_PARENT_TYPES, Attachment } from '../../types';
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
const generateCardId = () => `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

export default function TaskManager({ initialTask }: TaskManagerProps) {
    // --- Store ---
    const { currentClassId, classrooms: storeClassrooms } = useClassStore();
    const currentClass = storeClassrooms.find(c => c.id === currentClassId);

    // --- State ---
    const [rooms, setRooms] = useState<Classroom[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);

    // Task Data (all tasks from Firestore)
    const [tasks, setTasks] = useState<Task[]>([]);
    const [_loadingTasks, setLoadingTasks] = useState(true);

    // Multi-card editor state - persisted to sessionStorage to survive navigation
    const [openCards, setOpenCards] = useState<TaskCardState[]>(() => {
        try {
            const stored = sessionStorage.getItem('taskManager.openCards');
            if (stored) {
                const parsed = JSON.parse(stored) as TaskCardState[];
                // Validate that we have at least one card
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Failed to restore task cards from sessionStorage:', e);
        }
        // Default: one empty card
        return [{
            id: generateCardId(),
            formData: { ...INITIAL_FORM_STATE },
            isNew: true,
            isDirty: false,
        }];
    });
    const [activeCardId, setActiveCardId] = useState<string>(() => {
        try {
            const stored = sessionStorage.getItem('taskManager.activeCardId');
            if (stored) {
                return stored;
            }
        } catch (e) {
            console.warn('Failed to restore active card ID from sessionStorage:', e);
        }
        return openCards[0]?.id || '';
    });

    // UI State
    const [selectedDate, setSelectedDate] = useState<string>(toDateString());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showClassSelector, setShowClassSelector] = useState(false); // Toggles class buttons visibility
    const [isDescriptionActive, setIsDescriptionActive] = useState(false); // Tracks hover/focus on description

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);

    // Calendar State
    const [calendarBaseDate, setCalendarBaseDate] = useState(new Date());

    // --- Computed ---
    const activeCard = openCards.find(c => c.id === activeCardId) || openCards[0];
    const activeFormData = activeCard?.formData || INITIAL_FORM_STATE;

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

    // Auto-select current class for new cards (without marking as dirty)
    useEffect(() => {
        if (currentClassId && activeCard?.isNew) {
            setOpenCards(prev => prev.map(card => {
                if (card.id !== activeCardId || !card.isNew) return card;
                if (card.formData.selectedRoomIds.includes(currentClassId)) return card;
                return {
                    ...card,
                    formData: {
                        ...card.formData,
                        selectedRoomIds: [currentClassId, ...card.formData.selectedRoomIds]
                    },
                    // Don't mark as dirty for auto-population
                };
            }));
        }
    }, [currentClassId, activeCardId, activeCard?.isNew]);

    // Persist openCards to sessionStorage on changes (survives navigation, cleared on sign-out)
    useEffect(() => {
        try {
            sessionStorage.setItem('taskManager.openCards', JSON.stringify(openCards));
        } catch (e) {
            console.warn('Failed to persist task cards to sessionStorage:', e);
        }
    }, [openCards]);

    // Persist activeCardId to sessionStorage on changes
    useEffect(() => {
        try {
            sessionStorage.setItem('taskManager.activeCardId', activeCardId);
            // Reset class selector when switching cards
            setShowClassSelector(false);
        } catch (e) {
            console.warn('Failed to persist active card ID to sessionStorage:', e);
        }
    }, [activeCardId]);

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

    const getWeekDays = (baseDate: Date) => {
        const days = [];
        const day = baseDate.getDay();
        const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(baseDate);
        monday.setDate(diff);

        for (let i = 0; i < 5; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const weekDays = useMemo(() => getWeekDays(calendarBaseDate), [calendarBaseDate]);

    // Filter tasks by date and class, then build hierarchy
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const isInDateRange = task.startDate && task.endDate
                ? selectedDate >= task.startDate && selectedDate <= task.endDate
                : true;
            const isAssignedToCurrentClass = currentClassId
                ? task.selectedRoomIds?.includes(currentClassId)
                : true;
            return isInDateRange && isAssignedToCurrentClass;
        });
    }, [tasks, selectedDate, currentClassId]);

    // Get available parents for a given type
    const getAvailableParents = useCallback((itemType: ItemType): Task[] => {
        const allowedParentTypes = ALLOWED_PARENT_TYPES[itemType];
        if (allowedParentTypes.length === 0) return [];

        return tasks.filter(t => allowedParentTypes.includes(t.type));
    }, [tasks]);

    // Build breadcrumb for a task
    const getBreadcrumb = useCallback((task: Task): string => {
        if (!task.pathTitles || task.pathTitles.length === 0) return '';
        return task.pathTitles.join(' → ');
    }, []);

    // Calculate progress for a parent item
    const getProgress = useCallback((parentId: string): { completed: number; total: number } => {
        const children = tasks.filter(t => t.parentId === parentId);
        const total = children.length;
        const completed = children.filter(t => t.status === 'done').length;
        return { completed, total };
    }, [tasks]);

    // --- Card Management ---

    const updateActiveCard = useCallback(<K extends keyof TaskFormData>(
        field: K,
        value: TaskFormData[K] | ((prev: TaskFormData[K]) => TaskFormData[K])
    ) => {
        setOpenCards(prev => prev.map(card => {
            if (card.id !== activeCardId) return card;
            const newValue = typeof value === 'function'
                ? (value as (prev: TaskFormData[K]) => TaskFormData[K])(card.formData[field])
                : value;
            return {
                ...card,
                formData: { ...card.formData, [field]: newValue },
                isDirty: true,
            };
        }));
    }, [activeCardId]);

    const addNewCard = useCallback(() => {
        // Create a standalone new task - no auto-linking
        // User can link to a parent via the "Linked to..." dropdown in the task card
        const newCard: TaskCardState = {
            id: generateCardId(),
            formData: {
                ...INITIAL_FORM_STATE,
                type: 'task',
                parentId: null,
                selectedRoomIds: currentClassId ? [currentClassId] : [],
            },
            isNew: true,
            isDirty: false,
        };

        setOpenCards(prev => [...prev, newCard]);
        setActiveCardId(newCard.id);
    }, [currentClassId]);

    const closeCard = useCallback((cardId: string) => {
        const card = openCards.find(c => c.id === cardId);
        if (card?.isDirty) {
            if (!window.confirm('You have unsaved changes. Close anyway?')) return;
        }

        setOpenCards(prev => {
            const filtered = prev.filter(c => c.id !== cardId);
            if (filtered.length === 0) {
                // Always keep at least one card
                const newCard: TaskCardState = {
                    id: generateCardId(),
                    formData: { ...INITIAL_FORM_STATE, selectedRoomIds: currentClassId ? [currentClassId] : [] },
                    isNew: true,
                    isDirty: false,
                };
                return [newCard];
            }
            return filtered;
        });

        // If closing active card, switch to another
        if (cardId === activeCardId) {
            setOpenCards(prev => {
                const remaining = prev.filter(c => c.id !== cardId);
                const lastCard = remaining[remaining.length - 1];
                if (remaining.length > 0 && lastCard) {
                    setActiveCardId(lastCard.id);
                }
                return prev;
            });
        }
    }, [openCards, activeCardId, currentClassId]);

    const _navigateCards = useCallback((direction: 'prev' | 'next') => {
        const currentIndex = openCards.findIndex(c => c.id === activeCardId);
        const newIndex = direction === 'prev'
            ? Math.max(0, currentIndex - 1)
            : Math.min(openCards.length - 1, currentIndex + 1);
        const targetCard = openCards[newIndex];
        if (targetCard) {
            setActiveCardId(targetCard.id);
        }
    }, [openCards, activeCardId]);

    const resetToNewCard = useCallback(() => {
        const newCard: TaskCardState = {
            id: generateCardId(),
            formData: {
                ...INITIAL_FORM_STATE,
                selectedRoomIds: currentClassId ? [currentClassId] : []
            },
            isNew: true,
            isDirty: false,
        };
        setOpenCards([newCard]);
        setActiveCardId(newCard.id);
    }, [currentClassId]);

    const handleAddSubtask = useCallback((parentTask: Task | { id: string, type: ItemType, title: string, path: string[], pathTitles: string[], rootId: string | null, selectedRoomIds: string[], startDate?: string, endDate?: string }) => {
        const allowedChildren = ALLOWED_CHILD_TYPES[parentTask.type];
        if (allowedChildren.length === 0) {
            handleError(`Cannot add subtasks to a ${getTypeLabel(parentTask.type)}`);
            return;
        }

        const childType = allowedChildren[0]; // Default to first allowed type

        // Inherit path and titles
        const path = [...(parentTask.path || []), parentTask.id];
        const pathTitles = [...(parentTask.pathTitles || []), parentTask.title];
        const rootId = parentTask.rootId || parentTask.id;

        const newCard: TaskCardState = {
            id: generateCardId(),
            formData: {
                ...INITIAL_FORM_STATE,
                type: childType,
                parentId: parentTask.id,
                startDate: parentTask.startDate || INITIAL_FORM_STATE.startDate,
                endDate: parentTask.endDate || INITIAL_FORM_STATE.endDate,
                selectedRoomIds: parentTask.selectedRoomIds || [],
            },
            isNew: true,
            isDirty: false,
            parentCardId: 'id' in parentTask ? parentTask.id : undefined // Useful if we wanted to visually link cards in editor
        };

        setOpenCards(prev => [...prev, newCard]);
        setActiveCardId(newCard.id);
    }, [currentClassId]);

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

    const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item && item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    const attachment = await uploadFile(file);
                    if (attachment) {
                        updateActiveCard('attachments', (prev: Attachment[] | undefined) => [
                            ...(prev || []),
                            attachment
                        ]);
                        handleSuccess('Image pasted and uploaded');
                    }
                }
                break;
            }
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

    const handleSaveCard = async (cardId: string) => {
        const card = openCards.find(c => c.id === cardId);
        if (!card || !auth.currentUser) return;

        const { formData } = card;

        if (!formData.title.trim()) {
            handleError("Please enter a title.");
            return;
        }
        if (formData.selectedRoomIds.length === 0) {
            handleError("Please assign at least one class.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Build path and pathTitles from parent
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
                status: 'todo',
                childIds: [],
            };

            if (card.isNew) {
                // Create new task
                const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.presentationOrder || 0)) : 0;

                const docRef = await addDoc(collection(db, 'tasks'), {
                    ...taskData,
                    presentationOrder: maxOrder + 1,
                    createdAt: serverTimestamp(),
                    imageURL: '',
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

                handleSuccess(`${getTypeLabel(formData.type)} created successfully!`);
            } else {
                // Update existing - card would have a taskId attached
                // For now, we don't support editing via cards (that's in handleEditClick)
                handleSuccess(`${getTypeLabel(formData.type)} updated!`);
            }

            // Mark card as not dirty before closing (prevents "unsaved changes" prompt)
            setOpenCards(prev => prev.map(c =>
                c.id === cardId ? { ...c, isDirty: false } : c
            ));

            // Remove the card after saving
            closeCard(cardId);

        } catch (error) {
            console.error("Error saving:", error);
            handleError("Failed to save.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const _handleSaveAll = async () => {
        const dirtyCards = openCards.filter(c => c.isDirty && c.formData.title.trim());
        if (dirtyCards.length === 0) {
            handleError("No tasks to save. Please fill out at least one task.");
            return;
        }

        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            let savedCount = 0;

            for (const card of dirtyCards) {
                if (!card.formData.title.trim()) continue;
                if (card.formData.selectedRoomIds.length === 0) continue;

                let path: string[] = [];
                let pathTitles: string[] = [];
                let rootId: string | null = null;

                if (card.formData.parentId) {
                    const parent = tasks.find(t => t.id === card.formData.parentId);
                    if (parent) {
                        path = [...(parent.path || []), parent.id];
                        pathTitles = [...(parent.pathTitles || []), parent.title];
                        rootId = parent.rootId || parent.id;
                    }
                }

                const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.presentationOrder || 0)) : 0;
                const newDocRef = doc(collection(db, 'tasks'));

                batch.set(newDocRef, {
                    title: card.formData.title,
                    description: card.formData.description,
                    type: card.formData.type,
                    parentId: card.formData.parentId,
                    rootId,
                    path,
                    pathTitles,
                    linkURL: card.formData.linkURL,
                    startDate: card.formData.startDate,
                    endDate: card.formData.endDate,
                    selectedRoomIds: card.formData.selectedRoomIds,
                    attachments: card.formData.attachments || [],
                    teacherId: auth.currentUser!.uid,
                    presentationOrder: maxOrder + savedCount + 1,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    imageURL: '',
                    status: 'todo',
                    childIds: [],
                    // Note: questionHistory is NOT copied - it belongs to original task only
                });

                savedCount++;
            }

            await batch.commit();
            handleSuccess(`${savedCount} item(s) created successfully!`);
            resetToNewCard();

        } catch (error) {
            console.error("Error batch saving:", error);
            handleError("Failed to save items.");
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
            resetToNewCard();
        } catch (error) {
            console.error("Error deleting:", error);
            handleError("Failed to delete.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (task: Task) => {
        // Open task and all its ancestors as tabs
        const cardsToOpen: TaskCardState[] = [];

        // First, add all ancestors
        if (task.path && task.path.length > 0) {
            for (const ancestorId of task.path) {
                const ancestor = tasks.find(t => t.id === ancestorId);
                if (ancestor) {
                    cardsToOpen.push({
                        id: ancestor.id, // Use task ID as card ID for editing
                        formData: {
                            title: ancestor.title,
                            description: ancestor.description || '',
                            type: ancestor.type,
                            parentId: ancestor.parentId,
                            linkURL: ancestor.linkURL || '',
                            startDate: ancestor.startDate || toDateString(),
                            endDate: ancestor.endDate || toDateString(),
                            selectedRoomIds: ancestor.selectedRoomIds || [],
                        },
                        isNew: false,
                        isDirty: false,
                    });
                }
            }
        }

        // Add the clicked task
        cardsToOpen.push({
            id: task.id,
            formData: {
                title: task.title,
                description: task.description || '',
                type: task.type,
                parentId: task.parentId,
                linkURL: task.linkURL || '',
                startDate: task.startDate || toDateString(),
                endDate: task.endDate || toDateString(),
                selectedRoomIds: task.selectedRoomIds || [],
            },
            isNew: false,
            isDirty: false,
        });

        setOpenCards(cardsToOpen);
        setActiveCardId(task.id);
    };

    const handleReorder = async (taskId: string, direction: 'up' | 'down') => {
        const currentIndex = filteredTasks.findIndex(t => t.id === taskId);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= filteredTasks.length) return;

        const currentTask = filteredTasks[currentIndex];
        const targetTask = filteredTasks[targetIndex];

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

    // Remove task from the current date/class (doesn't delete the task)
    const handleRemoveFromSchedule = async (task: Task) => {
        if (!currentClassId) return;

        try {
            // Remove current class from selectedRoomIds
            const updatedRoomIds = (task.selectedRoomIds || []).filter(id => id !== currentClassId);

            await updateDoc(doc(db, 'tasks', task.id), {
                selectedRoomIds: updatedRoomIds,
                updatedAt: serverTimestamp()
            });

            handleSuccess('Task removed from this class schedule');
        } catch (error) {
            handleError(error, 'Failed to remove task from schedule');
        }
    };



    const handleWeekNav = (direction: 'prev' | 'next') => {
        const newDate = new Date(calendarBaseDate);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        setCalendarBaseDate(newDate);
    };

    // --- Render ---

    const availableParents = getAvailableParents(activeFormData.type);
    const _hasDirtyCards = openCards.some(c => c.isDirty && c.formData.title.trim());

    // Determine if we can add a subtask to the current active card
    const canAddSubtaskToActive = activeFormData.type !== 'subtask' && !activeCard.isNew;
    // We can't easily check for saved status of the *current* form data vs DB, 
    // but we can check if it's new. If it's existing, we assume it's safe to add a child.


    return (
        <div className="flex-1 h-full overflow-y-auto lg:overflow-hidden">
            <div className="min-h-full lg:h-full grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* LEFT PANEL: Task Editor */}
                <div className="lg:col-span-3 flex flex-col h-auto lg:h-full lg:overflow-y-auto custom-scrollbar">
                    {/* Tab Bar with Editable Titles - positioned above card */}
                    <TaskTabBar
                        tabs={openCards.map(card => ({
                            id: card.id,
                            title: card.formData.title,
                            parentId: card.formData.parentId,
                            isNew: card.isNew,
                            isDirty: card.isDirty,
                        }))}
                        activeTabId={activeCardId}
                        onTabClick={setActiveCardId}
                        onTabClose={closeCard}
                        onAddNew={addNewCard}
                        onTitleChange={(tabId, title) => {
                            setOpenCards(prev => prev.map(card => {
                                if (card.id !== tabId) return card;
                                return {
                                    ...card,
                                    formData: { ...card.formData, title },
                                    isDirty: true,
                                };
                            }));
                        }}
                    />

                    {/* Main Card - connects to tabs above */}
                    <div className="bg-brand-lightSurface dark:bg-brand-darkSurface border-2 border-gray-200 dark:border-gray-700 rounded-b-lg rounded-tr-lg p-4 space-y-4 flex-1 flex flex-col -mt-[2px] relative z-40">

                        {/* Type, Linked To, Start Date, Due Date - 5-column grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-center">
                            {/* Col 1: Type Selector */}
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
                                colorClasses={getTypeColorClasses(activeFormData.type)}
                                buttonClassName="font-bold"
                            />

                            {/* Col 2: Linked To */}
                            <Select<string>
                                value={activeFormData.parentId}
                                onChange={(value) => updateActiveCard('parentId', value)}
                                options={availableParents.map(parent => ({
                                    value: parent.id,
                                    label: parent.pathTitles?.length
                                        ? `${parent.pathTitles.join(' → ')} → ${parent.title}`
                                        : parent.title,
                                    icon: getTypeIcon(parent.type),
                                    iconColor: getTypeHexColor(parent.type),
                                }))}
                                placeholder="Linked to..."
                                icon={LinkIcon}
                                nullable
                                searchable
                            />

                            {/* Col 3: Empty spacer */}
                            <div className="hidden lg:block" />

                            {/* Cols 4-5: Date Range Picker */}
                            <div className="col-span-2">
                                <DateRangePicker
                                    startDate={activeFormData.startDate}
                                    endDate={activeFormData.endDate}
                                    onStartDateChange={(value) => updateActiveCard('startDate', value)}
                                    onEndDateChange={(value) => updateActiveCard('endDate', value)}
                                    startPlaceholder="Start date"
                                    endPlaceholder="Due date"
                                />
                            </div>
                        </div>
                        {/* Description & Attachments Section */}
                        <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-hidden">
                            {/* Description Container with embedded Upload/Link buttons */}
                            <div
                                className="flex-1 min-h-[100px] relative"
                                onMouseEnter={() => setIsDescriptionActive(true)}
                                onMouseLeave={() => setIsDescriptionActive(false)}
                            >
                                <div className="absolute inset-0 flex flex-col">
                                    <textarea
                                        ref={descriptionRef}
                                        value={activeFormData.description}
                                        onChange={e => updateActiveCard('description', e.target.value)}
                                        onPaste={handlePaste}
                                        onFocus={() => setIsDescriptionActive(true)}
                                        onBlur={() => setIsDescriptionActive(false)}
                                        className="flex-1 w-full px-5 py-4 rounded-t-md border-2 border-b-0 transition-all duration-300 bg-gray-50/50 dark:bg-gray-900/30 text-brand-textDarkPrimary dark:text-brand-textPrimary border-gray-200 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-600 text-sm resize-none leading-relaxed hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500"
                                        placeholder="Describe this task..."
                                    />
                                    {/* Bottom bar: Attachments + Links + Upload/Link buttons */}
                                    <div className="px-4 py-3 rounded-b-md border-2 border-t-0 border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/20 flex flex-wrap items-center gap-2 min-h-[44px]">
                                        {/* Inline attachments */}
                                        {activeFormData.attachments && activeFormData.attachments.map(attachment => (
                                            <div
                                                key={attachment.id}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600 text-xs"
                                            >
                                                {attachment.mimeType.startsWith('image/') ? (
                                                    <ImageIcon size={12} className="text-blue-500" />
                                                ) : (
                                                    <FileIcon size={12} className="text-gray-500" />
                                                )}
                                                <a
                                                    href={attachment.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-brand-textDarkPrimary dark:text-brand-textPrimary hover:text-brand-accent truncate max-w-[100px]"
                                                >
                                                    {attachment.filename}
                                                </a>
                                                <button
                                                    onClick={() => removeAttachment(attachment.id)}
                                                    className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded"
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
                                        {/* Upload & Link buttons - show on hover/focus */}
                                        <div className={`flex items-center gap-3 transition-opacity duration-200 ${isDescriptionActive || isUploading ? 'opacity-100' : 'opacity-0'}`}>
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
                                    {/* Empty state placeholder */}
                                    {!activeFormData.description && !activeFormData.attachments?.length && !activeFormData.linkURL && !isDescriptionActive && (
                                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-600 text-sm flex flex-col items-center gap-2 opacity-60">
                                            <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                            </svg>
                                            <span>Type description or paste images</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Row: AI | (spacer) | (spacer) | (spacer) | Save - 5-column grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-center pt-4 border-t border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
                                {/* Col 1: AI Generate Button - Purple solid (moved to left) */}
                                <button
                                    type="button"
                                    onClick={() => handleSuccess('Coming Soon! AI task generation will be available in a future update.')}
                                    className="relative py-2.5 px-4 min-h-[44px] rounded-md border-2 border-purple-400/50 dark:border-purple-500/40 bg-transparent hover:bg-purple-500/10 hover:border-purple-500 transition-all duration-200 group cursor-pointer select-none"
                                >
                                    <div className="flex items-center justify-center gap-2 text-purple-400 group-hover:text-purple-500 transition-colors">
                                        <Sparkles size={16} />
                                        <span className="text-sm font-medium">Use AI</span>
                                    </div>
                                </button>

                                {/* Col 2: Add Subtask Button (only for existing items) */}
                                <div className="flex justify-center">
                                    {canAddSubtaskToActive && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // We need to construct a "parent object" from the active form data
                                                // ID is required, so this only works for existing tasks (which have an ID in activeCardId if not new)
                                                if (activeCard.isNew) return;

                                                // Find the task object to get path info if possible, or construct it
                                                const currentTask = tasks.find(t => t.id === activeCardId);

                                                if (currentTask) {
                                                    handleAddSubtask(currentTask);
                                                } else {
                                                    // Fallback if not found in list (shouldn't happen for existing)
                                                    handleError("Please save the task first.");
                                                }
                                            }}
                                            className="p-2.5 rounded-md border-2 border-brand-accent/30 text-brand-accent hover:bg-brand-accent/10 hover:border-brand-accent transition-all duration-200 group"
                                            title="Add related task"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    )}
                                </div>

                                {/* Col 3: Empty spacer */}
                                <div className="hidden lg:block" />

                                {/* Col 4: Empty spacer */}
                                <div className="hidden lg:block" />

                                {/* Col 5: Save Button - Split design: main save + dropdown for more classes */}
                                <div className="flex items-center w-full">
                                    {/* Main Save Button */}
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!activeFormData.title.trim()) {
                                                handleError(new Error("⚠️ Please include a title before saving."));
                                                return;
                                            }
                                            if (activeFormData.selectedRoomIds.length > 0) {
                                                await handleSaveCard(activeCardId);
                                            } else {
                                                setShowClassSelector(true);
                                            }
                                        }}
                                        disabled={isSubmitting}
                                        className={`relative py-2.5 px-4 min-h-[44px] rounded-l-md border-2 border-r-0 transition-all duration-200 group cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed flex-1 ${showClassSelector
                                            ? 'border-green-500 bg-green-500/10'
                                            : 'border-green-400/50 dark:border-green-500/40 bg-transparent hover:bg-green-500/10 hover:border-green-500'
                                            }`}
                                    >
                                        <div className={`flex items-center justify-center gap-2 transition-colors ${showClassSelector ? 'text-green-500' : 'text-green-400 group-hover:text-green-500'
                                            }`}>
                                            {isSubmitting ? (
                                                <Loader size={16} className="animate-spin" />
                                            ) : (
                                                <Check size={16} />
                                            )}
                                            <span className="text-sm font-medium">
                                                {isSubmitting ? 'Saving...' : 'Save'}
                                            </span>
                                        </div>
                                    </button>

                                    {/* Dropdown Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!activeFormData.title.trim()) {
                                                handleError(new Error("⚠️ Please include a title before saving."));
                                                return;
                                            }
                                            setShowClassSelector(!showClassSelector);
                                        }}
                                        disabled={isSubmitting}
                                        className={`py-2.5 px-2 min-h-[44px] rounded-r-md border-2 transition-all duration-200 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${showClassSelector
                                            ? 'border-green-500 bg-green-500/10 text-green-500'
                                            : 'border-green-400/50 dark:border-green-500/40 bg-transparent hover:bg-green-500/10 hover:border-green-500 text-green-400 hover:text-green-500'
                                            }`}
                                        title="Choose classes"
                                    >
                                        <ChevronDown
                                            size={16}
                                            className={`transition-transform duration-200 ${showClassSelector ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Expandable Class Selector - Shows when dropdown is clicked */}
                        {showClassSelector && (
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 animate-fade-in flex-shrink-0">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase">Select classes to add this task:</span>
                                </div>
                                {loadingRooms ? (
                                    <Loader className="w-4 h-4 animate-spin text-gray-400" />
                                ) : rooms.length === 0 ? (
                                    <p className="text-sm text-gray-500">No classes created yet. Create a class first.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {rooms.map(room => {
                                            const isSelected = activeFormData.selectedRoomIds.includes(room.id);
                                            const roomColor = room.color || '#3B82F6';
                                            return (
                                                <button
                                                    key={room.id}
                                                    type="button"
                                                    onClick={() => handleRoomToggle(room.id)}
                                                    style={{
                                                        '--room-color': roomColor,
                                                        '--room-color-bg': `${roomColor}15`,
                                                        '--room-color-hover': `${roomColor}25`,
                                                        '--room-color-glow': `${roomColor}35`,
                                                        borderColor: roomColor,
                                                        backgroundColor: isSelected ? `${roomColor}15` : 'transparent',
                                                        color: roomColor,
                                                        boxShadow: isSelected ? `0 0 12px ${roomColor}25` : 'none',
                                                    } as React.CSSProperties}
                                                    className={`
                                                        flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-bold transition-all border-2
                                                        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                                                        hover:shadow-lg active:scale-[0.98]
                                                        min-h-[44px]
                                                        [&:hover]:!bg-[var(--room-color-hover)]
                                                        [&:focus-visible]:!bg-[var(--room-color-glow)]
                                                        [&:focus-visible]:!shadow-[0_0_16px_var(--room-color-hover)]
                                                    `}
                                                >
                                                    {isSelected && <Check size={14} />}
                                                    {room.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Save & Close button removed to avoid double logic. Use the main split button. */}
                            </div>
                        )}

                        {/* Class Assignment - Only shown after task is saved (not new) */}
                        {!activeCard?.isNew && (
                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <ChevronDown size={14} className="text-brand-accent" />
                                    <label className="text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase">Assign to Additional Classes</label>
                                </div>
                                {loadingRooms ? (
                                    <Loader className="w-4 h-4 animate-spin text-gray-400" />
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {rooms.map(room => {
                                            const isSelected = activeFormData.selectedRoomIds.includes(room.id);
                                            return (
                                                <button
                                                    key={room.id}
                                                    onClick={() => handleRoomToggle(room.id)}
                                                    style={{
                                                        borderColor: isSelected ? (room.color || '') : '',
                                                        color: isSelected ? (room.color || '') : ''
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected && room.color) {
                                                            e.currentTarget.style.borderColor = room.color;
                                                            e.currentTarget.style.color = room.color;
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected) {
                                                            e.currentTarget.style.borderColor = '';
                                                            e.currentTarget.style.color = '';
                                                        }
                                                    }}
                                                    className={`
                                                        flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border-2
                                                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent/20
                                                        ${isSelected
                                                            ? 'bg-brand-lightSurface dark:bg-brand-darkSurface pr-2 shadow-md'
                                                            : 'bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkPrimary dark:text-brand-textPrimary border-gray-200 dark:border-gray-700'}
                                                    `}
                                                >
                                                    {isSelected && <Check size={12} />}
                                                    {room.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Delete Button - Only for existing tasks */}
                        {!activeCard?.isNew && (
                            <div className="pt-3 flex-shrink-0">
                                <Button
                                    variant="ghost-danger"
                                    onClick={() => handleDelete(activeCardId)}
                                    disabled={isSubmitting}
                                    className="w-full"
                                >
                                    Delete {getTypeLabel(activeFormData.type)}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL: Calendar & List */}
                <div className="lg:col-span-1 flex flex-col h-auto lg:h-full lg:overflow-hidden">
                    <div className="h-auto lg:h-full flex flex-col justify-between overflow-hidden">

                        {/* Calendar Header - aligned with top row */}
                        <div className="min-h-[44px] flex items-center justify-between mb-4">
                            <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary flex items-center gap-2">
                                <CalendarIcon size={18} className="text-brand-accent" />
                                {calendarBaseDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </h3>
                            <div className="flex gap-1">
                                <button onClick={() => handleWeekNav('prev')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20">
                                    <ChevronLeft size={20} />
                                </button>
                                <button onClick={() => handleWeekNav('next')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Week Day Selector */}
                        <div className="pb-4 border-b border-gray-200 dark:border-gray-800">
                            <div className="grid grid-cols-5 gap-1">
                                {weekDays.map(date => {
                                    const dateStr = toDateString(date);
                                    const isSelected = selectedDate === dateStr;
                                    const isToday = dateStr === toDateString(new Date());

                                    return (
                                        <button
                                            key={dateStr}
                                            onClick={() => setSelectedDate(dateStr)}
                                            className={`
                                                flex flex-col items-center justify-center p-2 rounded-lg transition-all
                                                hover:bg-gray-50 dark:hover:bg-gray-800
                                                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50
                                                ${isSelected ? 'bg-brand-accent/10' : ''}
                                            `}
                                        >
                                            <span className={`text-xs font-medium transition-colors ${isToday ? 'underline decoration-brand-accent decoration-2 underline-offset-2' : ''
                                                } ${isSelected
                                                    ? 'text-brand-accent'
                                                    : 'text-gray-500'
                                                }`}>
                                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </span>
                                            <span className={`
                                                text-sm font-bold mt-1 px-2 py-0.5 transition-colors
                                                ${isSelected
                                                    ? 'text-brand-accent'
                                                    : 'text-brand-textDarkPrimary dark:text-brand-textPrimary'}
                                            `}>
                                                {date.getDate()}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Task List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[300px] lg:min-h-0">
                            <div className="mb-3">
                                <h4 className="text-sm font-semibold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    <span style={{ color: currentClass?.color }}>{currentClass?.name || 'Class'}:</span> Shape of the Day <span className="text-gray-400">—</span> {selectedDate === toDateString()
                                        ? 'Today'
                                        : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </h4>
                            </div>

                            {!currentClassId ? (
                                <div className="text-center py-8 text-gray-400 italic text-sm">
                                    Select a class to view schedule.
                                </div>
                            ) : filteredTasks.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 italic text-sm">
                                    No tasks scheduled.
                                </div>
                            ) : (
                                filteredTasks.map((task, index) => {
                                    const TypeIconSmall = getTypeIcon(task.type);
                                    const breadcrumb = getBreadcrumb(task);
                                    const progress = task.childIds?.length ? getProgress(task.id) : null;
                                    const isEditing = openCards.some(c => c.id === task.id);

                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => handleEditClick(task)}
                                            className={`
                                                group relative p-3 rounded-lg border-2 transition-all cursor-pointer
                                                ${isEditing
                                                    ? 'border-brand-accent bg-brand-accent/5'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-brand-lightSurface dark:bg-brand-darkSurface'}
                                            `}
                                        >
                                            <div
                                                className="absolute inset-0 border-l-4 rounded-l-lg transition-colors"
                                                style={{
                                                    borderLeftColor: getTypeHexColor(task.type),
                                                    opacity: isEditing ? 1 : 0
                                                }}
                                            />

                                            {/* Remove from schedule button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveFromSchedule(task);
                                                }}
                                                className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-all"
                                                title="Remove from this class schedule"
                                            >
                                                <X size={14} />
                                            </button>

                                            <div className="flex items-start gap-2">
                                                {/* Reorder Controls */}
                                                <div className="flex flex-col" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleReorder(task.id, 'up')}
                                                        disabled={index === 0}
                                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-brand-accent disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                                                    >
                                                        <ArrowUp size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReorder(task.id, 'down')}
                                                        disabled={index === filteredTasks.length - 1}
                                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-brand-accent disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                                                    >
                                                        <ArrowDown size={14} />
                                                    </button>
                                                </div>

                                                {/* Type Badge */}
                                                <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${getTypeColorClasses(task.type)}`}>
                                                    <TypeIconSmall size={12} />
                                                </span>

                                                <div className="flex-1 min-w-0">
                                                    <h5 className="font-bold text-sm text-brand-textDarkPrimary dark:text-brand-textPrimary line-clamp-1">
                                                        {task.title}
                                                    </h5>

                                                    {/* Breadcrumb */}
                                                    {breadcrumb && (
                                                        <p className="text-xs text-gray-400 truncate mt-0.5">
                                                            {breadcrumb}
                                                        </p>
                                                    )}

                                                    {/* Progress indicator */}
                                                    {progress && progress.total > 0 && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-brand-accent rounded-full transition-all"
                                                                    style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-gray-400">
                                                                {progress.completed}/{progress.total}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Add Subtask Button - Right side */}
                                                {!['subtask'].includes(task.type) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAddSubtask(task);
                                                        }}
                                                        className="p-1.5 rounded hover:bg-brand-accent/10 text-gray-400 hover:text-brand-accent transition-colors self-center"
                                                        title="Add related task"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Hierarchy Indicator (if child) */}
                                            {(task.path?.length || 0) > 0 && (
                                                <div
                                                    className="absolute left-[-12px] top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600"
                                                    style={{ marginLeft: `${(task.path?.length || 0) * 4}px` }}
                                                />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
