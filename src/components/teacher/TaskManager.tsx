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
    ArrowUp, 
    ArrowDown,
    FolderOpen,
    FileText,
    ListChecks,
    CheckSquare,
    X,
    Image as ImageIcon,
    File as FileIcon,
    Paperclip
} from 'lucide-react';
import { Button } from '../shared/Button';
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

export default function TaskManager() {
    // --- Store ---
    const { currentClassId, classrooms: storeClassrooms } = useClassStore();
    const currentClass = storeClassrooms.find(c => c.id === currentClassId);

    // --- State ---
    const [rooms, setRooms] = useState<Classroom[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);

    // Task Data (all tasks from Firestore)
    const [tasks, setTasks] = useState<Task[]>([]);
    const [_loadingTasks, setLoadingTasks] = useState(true);

    // Multi-card editor state
    const [openCards, setOpenCards] = useState<TaskCardState[]>(() => [{
        id: generateCardId(),
        formData: { ...INITIAL_FORM_STATE },
        isNew: true,
        isDirty: false,
    }]);
    const [activeCardId, setActiveCardId] = useState<string>(() => openCards[0]?.id || '');

    // UI State
    const [selectedDate, setSelectedDate] = useState<string>(toDateString());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
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

    const addNewCard = useCallback((parentCardId?: string) => {
        const parentCard = parentCardId ? openCards.find(c => c.id === parentCardId) : null;
        const parentType = parentCard?.formData.type || 'task';
        const allowedChildTypes = ALLOWED_CHILD_TYPES[parentType];
        
        // Determine the child type
        let childType: ItemType = 'task';
        if (allowedChildTypes && allowedChildTypes.length > 0 && allowedChildTypes[0]) {
            childType = allowedChildTypes[0];
        }

        // Inherit classes from parent
        const inheritedClasses = parentCard?.formData.selectedRoomIds || 
            (currentClassId ? [currentClassId] : []);

        const newCard: TaskCardState = {
            id: generateCardId(),
            formData: {
                ...INITIAL_FORM_STATE,
                type: childType,
                parentId: parentCardId || null,
                selectedRoomIds: inheritedClasses,
            },
            isNew: true,
            isDirty: false,
            parentCardId,
        };

        setOpenCards(prev => [...prev, newCard]);
        setActiveCardId(newCard.id);
    }, [openCards, currentClassId]);

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

    const navigateCards = useCallback((direction: 'prev' | 'next') => {
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
                if (pathMatch) {
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

            // Remove the card after saving
            closeCard(cardId);

        } catch (error) {
            console.error("Error saving:", error);
            handleError("Failed to save.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveAll = async () => {
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

    const handleWeekNav = (direction: 'prev' | 'next') => {
        const newDate = new Date(calendarBaseDate);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        setCalendarBaseDate(newDate);
    };

    // --- Render ---

    const TypeIcon = getTypeIcon(activeFormData.type);
    const availableParents = getAvailableParents(activeFormData.type);
    const hasDirtyCards = openCards.some(c => c.isDirty && c.formData.title.trim());

    return (
        <div className="flex-1 h-full overflow-y-auto lg:overflow-hidden">
            <div className="min-h-full lg:h-full grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* LEFT PANEL: Task Editor */}
                <div className="lg:col-span-3 flex flex-col h-auto lg:h-full lg:overflow-y-auto custom-scrollbar">
                    <div className="card-base p-4 space-y-4 flex-1 flex flex-col">
                        
                        {/* Tab Bar */}
                        <TaskTabBar
                            tabs={openCards.map(card => ({
                                id: card.id,
                                title: card.formData.title,
                                type: card.formData.type,
                                isNew: card.isNew,
                                isDirty: card.isDirty,
                            }))}
                            activeTabId={activeCardId}
                            onTabClick={setActiveCardId}
                            onTabClose={closeCard}
                            onAddChild={addNewCard}
                            onNavigate={navigateCards}
                        />

                        {/* Type Selector + Parent Selector Row */}
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <label className="text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase">Type</label>
                                <div className="flex gap-2">
                                    {(['project', 'assignment', 'task', 'subtask'] as ItemType[]).map(type => {
                                        const Icon = getTypeIcon(type);
                                        const isSelected = activeFormData.type === type;
                                        const isDisabled = activeFormData.parentId && !ALLOWED_CHILD_TYPES[
                                            tasks.find(t => t.id === activeFormData.parentId)?.type || 'task'
                                        ].includes(type);

                                        return (
                                            <button
                                                key={type}
                                                onClick={() => updateActiveCard('type', type)}
                                                disabled={!!isDisabled}
                                                className={`
                                                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase
                                                    border-[2px] transition-all duration-200
                                                    ${isSelected 
                                                        ? getTypeColorClasses(type) 
                                                        : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'}
                                                    ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                                                `}
                                            >
                                                <Icon size={14} />
                                                {getTypeLabel(type)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Parent Selector (inline with type) */}
                            {availableParents.length > 0 && (
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <label className="text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase whitespace-nowrap">
                                        Linked to
                                    </label>
                                    <select
                                        value={activeFormData.parentId || ''}
                                        onChange={e => updateActiveCard('parentId', e.target.value || null)}
                                        className="flex-1 min-w-0 px-3 py-1.5 pr-8 rounded-lg border-[2px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkPrimary dark:text-brand-textPrimary border-gray-200 dark:border-gray-700 font-medium text-sm hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:border-gray-300 dark:focus:border-gray-500 appearance-none cursor-pointer"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right 0.75rem center',
                                            backgroundSize: '1rem'
                                        }}
                                    >
                                        <option value="" className="bg-brand-lightSurface dark:bg-gray-800 text-brand-textDarkPrimary dark:text-brand-textPrimary">None (standalone)</option>
                                        {availableParents.map(parent => (
                                            <option key={parent.id} value={parent.id} className="bg-brand-lightSurface dark:bg-gray-800 text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                                {parent.pathTitles?.length ? `${parent.pathTitles.join(' → ')} → ` : ''}
                                                {parent.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase mb-1">Title</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                    <TypeIcon size={16} className={getTypeColorClasses(activeFormData.type).split(' ')[0]} />
                                </div>
                                <input
                                    type="text"
                                    value={activeFormData.title}
                                    onChange={e => updateActiveCard('title', e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 rounded-xl border-[3px] transition-all duration-200 bg-transparent text-brand-textDarkPrimary dark:text-brand-textPrimary border-gray-200 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500 font-medium hover:border-gray-400 dark:hover:border-gray-100 focus:outline-none focus:border-gray-300 dark:focus:border-gray-100"
                                    placeholder={`e.g. ${activeFormData.type === 'project' ? 'Math Unit 3' : activeFormData.type === 'assignment' ? 'Exponents Practice' : 'Read Chapter 4'}`}
                                />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={activeFormData.startDate}
                                    onChange={e => updateActiveCard('startDate', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkPrimary dark:text-brand-textPrimary border-gray-200 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500 font-medium text-sm hover:border-gray-400 dark:hover:border-gray-100 focus:outline-none focus:border-gray-300 dark:focus:border-gray-100 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:brightness-0 dark:[&::-webkit-calendar-picker-indicator]:brightness-0 dark:[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase mb-1">Due Date</label>
                                <input
                                    type="date"
                                    value={activeFormData.endDate}
                                    onChange={e => updateActiveCard('endDate', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkPrimary dark:text-brand-textPrimary border-gray-200 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500 font-medium text-sm hover:border-gray-400 dark:hover:border-gray-100 focus:outline-none focus:border-gray-300 dark:focus:border-gray-100 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:brightness-0 dark:[&::-webkit-calendar-picker-indicator]:brightness-0 dark:[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase mb-1">
                                Description 
                                <span className="font-normal text-gray-400 ml-1">(paste images here)</span>
                            </label>
                            <textarea
                                ref={descriptionRef}
                                value={activeFormData.description}
                                onChange={e => updateActiveCard('description', e.target.value)}
                                onPaste={handlePaste}
                                className="w-full flex-1 min-h-[80px] px-3 py-2 rounded-xl border-[3px] transition-all duration-200 bg-transparent text-brand-textDarkPrimary dark:text-brand-textPrimary border-gray-200 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-y hover:border-gray-400 dark:hover:border-gray-100 focus:outline-none focus:border-gray-300 dark:focus:border-gray-100"
                                placeholder="Instructions... (you can paste images directly here)"
                            />
                        </div>

                        {/* Attachments Display */}
                        {activeFormData.attachments && activeFormData.attachments.length > 0 && (
                            <div className="flex-shrink-0">
                                <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase mb-2">
                                    Attachments ({activeFormData.attachments.length})
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {activeFormData.attachments.map(attachment => (
                                        <div 
                                            key={attachment.id}
                                            className="group relative flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                        >
                                            {attachment.mimeType.startsWith('image/') ? (
                                                <ImageIcon size={14} className="text-blue-500" />
                                            ) : (
                                                <FileIcon size={14} className="text-gray-500" />
                                            )}
                                            <a 
                                                href={attachment.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-sm text-brand-textDarkPrimary dark:text-brand-textPrimary hover:text-brand-accent truncate max-w-[150px]"
                                                title={attachment.filename}
                                            >
                                                {attachment.filename}
                                            </a>
                                            <button
                                                onClick={() => removeAttachment(attachment.id)}
                                                className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Remove attachment"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Attachments & Link */}
                        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                            <div className="relative border-[3px] border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 bg-brand-lightSurface dark:bg-brand-darkSurface hover:border-brand-accent dark:hover:border-brand-accent transition-all text-center group cursor-pointer">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept={ALLOWED_FILE_TYPES.join(',')}
                                    onChange={handleFileSelect}
                                    disabled={isUploading}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                    data-testid="file-upload-input"
                                />
                                <div className={`flex items-center justify-center gap-2 transition-colors ${isUploading ? 'text-brand-accent' : 'text-gray-400 group-hover:text-brand-accent'}`}>
                                    {isUploading ? (
                                        <Loader size={16} className="animate-spin" />
                                    ) : (
                                        <Upload size={16} />
                                    )}
                                    <span className="text-xs font-bold">
                                        {isUploading ? 'Uploading...' : 'Upload File'}
                                    </span>
                                </div>
                            </div>

                            <div className="relative border-[3px] border-gray-200 dark:border-gray-700 rounded-xl flex items-center bg-brand-lightSurface dark:bg-brand-darkSurface hover:border-gray-400 dark:hover:border-gray-100 focus-within:border-gray-300 dark:focus-within:border-gray-100 transition-colors">
                                <div className="pl-3 text-gray-400">
                                    <LinkIcon size={14} />
                                </div>
                                <input
                                    type="url"
                                    value={activeFormData.linkURL}
                                    onChange={e => updateActiveCard('linkURL', e.target.value)}
                                    className="w-full py-2 px-2 bg-transparent outline-none text-sm text-brand-textDarkPrimary dark:text-brand-textPrimary placeholder-gray-400 font-medium"
                                    placeholder="Paste URL..."
                                    data-testid="link-url-input"
                                />
                            </div>
                        </div>

                        {/* Class Assignment */}
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <label className="block text-xs font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase mb-2">Assign to Classes</label>
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
                                                    flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border-[3px]
                                                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent
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

                        {/* Action Buttons Footer */}
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-3 flex-shrink-0 mt-auto">
                            {!activeCard?.isNew && (
                                <Button
                                    variant="ghost-danger"
                                    onClick={() => handleDelete(activeCardId)}
                                    disabled={isSubmitting}
                                >
                                    Delete
                                </Button>
                            )}
                            
                            <button
                                onClick={() => handleSaveCard(activeCardId)}
                                disabled={isSubmitting || !activeFormData.title.trim()}
                                className="flex-1 py-2.5 px-4 rounded-xl border-[3px] transition-all duration-200 bg-transparent text-brand-accent font-bold border-brand-accent hover:text-brand-accent/80 hover:border-brand-accent/80 hover:bg-brand-accent/10 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Saving...' : `Save ${getTypeLabel(activeFormData.type)}`}
                            </button>

                            {hasDirtyCards && openCards.filter(c => c.isDirty).length > 1 && (
                                <Button
                                    variant="primary"
                                    onClick={handleSaveAll}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Saving...' : `Save All (${openCards.filter(c => c.isDirty && c.formData.title.trim()).length})`}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Calendar & List */}
                <div className="lg:col-span-1 flex flex-col h-auto lg:h-full lg:overflow-hidden">
                    <div className="card-base h-auto lg:h-full flex flex-col justify-between overflow-hidden">

                        {/* Calendar Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary flex items-center gap-2">
                                    <CalendarIcon size={18} className="text-brand-accent" />
                                    {calendarBaseDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </h3>
                                <div className="flex gap-1">
                                    <button onClick={() => handleWeekNav('prev')} className="p-2 rounded-xl border-[3px] border-transparent hover:border-gray-100 dark:hover:border-gray-500 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button onClick={() => handleWeekNav('next')} className="p-2 rounded-xl border-[3px] border-transparent hover:border-gray-100 dark:hover:border-gray-500 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20">
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-5 gap-1">
                                {weekDays.map(date => {
                                    const dateStr = toDateString(date);
                                    const isSelected = selectedDate === dateStr;
                                    const isToday = dateStr === toDateString(new Date());

                                    return (
                                        <button
                                            key={dateStr}
                                            onClick={() => setSelectedDate(dateStr)}
                                            className="flex flex-col items-center justify-center p-2 rounded-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <span className={`text-xs font-medium ${isToday ? 'text-brand-accent' : 'text-gray-500'}`}>
                                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </span>
                                            <span className={`
                                                text-sm font-bold mt-1 px-2 py-0.5
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
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">
                                    {selectedDate === toDateString() 
                                        ? 'Today' 
                                        : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                </h4>
                                {currentClass && (
                                    <p className="text-sm font-semibold" style={{ color: currentClass.color }}>
                                        {currentClass.name}
                                    </p>
                                )}
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
                                                group relative p-3 rounded-xl border-[3px] transition-all cursor-pointer
                                                ${isEditing
                                                    ? 'border-brand-accent bg-brand-accent/5'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-brand-lightSurface dark:bg-brand-darkSurface'}
                                            `}
                                        >
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
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer with Create New Task Button */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
                            <Button
                                variant="ghost"
                                onClick={resetToNewCard}
                                icon={Plus}
                                className="w-full justify-center"
                            >
                                Create New Item
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
