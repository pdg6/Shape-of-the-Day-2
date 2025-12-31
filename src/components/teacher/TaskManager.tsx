import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, parse, isValid } from 'date-fns';

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
import { Button } from '../shared/Button';
import { PageLayout } from '../shared/PageLayout';

import { handleError, handleSuccess } from '../../utils/errorHandler';
import { toDateString } from '../../utils/dateHelpers';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, auth, storage, functions } from '../../firebase';
import { subscribeToClassroomTasks } from '../../services/firestoreService';
import { ItemType, Task, ALLOWED_CHILD_TYPES, ALLOWED_PARENT_TYPES, Attachment } from '../../types';
import { useClassStore } from '../../store/appSettings';
import { useTaskManager } from '../../hooks/useTaskManager';
import { getHierarchicalNumber, getPredictiveNumber } from '../../utils/taskHierarchy';

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
// No longer used: const getTypeLabel = (type: ItemType): string => ...

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
    tasksToAdd?: Task[];
    onTasksAdded?: () => void;
}

// HMR refresh timestamp: 2025-12-08T19:30
export default function TaskManager({ initialTask, tasksToAdd, onTasksAdded }: TaskManagerProps) {
    // --- Store ---
    const { currentClassId, classrooms: rooms } = useClassStore();

    // --- State ---
    const [tasks, setTasks] = useState<Task[]>([]);

    // UI State
    const [selectedDate, setSelectedDate] = useState<string>(toDateString());
    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingLinkTitle, setIsLoadingLinkTitle] = useState(false);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isMobileTasksOpen, setIsMobileTasksOpen] = useState(false);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Task Manager Hook ---
    const {
        editingTaskId,
        formData,
        setFormData,
        isDirty,
        setIsDirty,
        isSubmitting,
        isNewTask,
        hierarchicalTasks,
        loadTask,
        resetForm,
        handleSave: hookHandleSave,
        handleDelete: hookHandleDelete,
        handleReorder: hookHandleReorder,
        updateField,
        addLink: hookAddLink,
        removeLink: hookRemoveLink,
        addAttachments: hookAddAttachments,
        removeAttachment: hookRemoveAttachment
    } = useTaskManager({
        tasks,
        onSuccess: () => setSaveState('saved'),
    });

    const activeFormData = formData;
    const updateActiveCard = updateField;
    const loadingRooms = rooms.length === 0 && !!currentClassId;

    // --- Actions ---

    const handleEditClick = (task: Task) => {
        loadTask(task);
        if (window.innerWidth < 1024) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleAddSubtask = (parentTask: Task) => {
        const allowedChildren = ALLOWED_CHILD_TYPES[parentTask.type];
        if (!allowedChildren || allowedChildren.length === 0) return;

        resetForm(parentTask.id, allowedChildren[0] as ItemType);
        // Explicitly set dates and rooms from parent
        setFormData(prev => ({
            ...prev,
            selectedRoomIds: parentTask.selectedRoomIds || (currentClassId ? [currentClassId] : []),
            startDate: parentTask.startDate || toDateString(),
            endDate: parentTask.endDate || toDateString()
        }));
        setIsDirty(true);
    };

    const handleSave = async (isAutoSave: boolean = false) => {
        await hookHandleSave(isAutoSave);
    };

    const handleDelete = async (taskId: string) => {
        await hookHandleDelete(taskId, false); // Keep children by default in this context
    };

    const handleReorder = async (taskId: string, direction: 'up' | 'down') => {
        await hookHandleReorder(taskId, direction);
    };

    const addLink = async (url: string) => {
        // Normalize URL
        let normalizedUrl = url.trim();
        if (normalizedUrl && !normalizedUrl.match(/^https?:\/\//i)) {
            normalizedUrl = 'https://' + normalizedUrl;
        }

        // Validate URL
        try {
            new URL(normalizedUrl);
        } catch {
            handleError('Please enter a valid URL');
            return;
        }

        // Check for duplicates
        if (formData.links?.some(link => link.url === normalizedUrl)) {
            handleError('This link is already added');
            return;
        }

        const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        hookAddLink({ id: linkId, url: normalizedUrl });

        // Fetch metadata asynchronously
        setIsLoadingLinkTitle(true);
        try {
            const fetchMetadata = httpsCallable<{ url: string }, { title: string | null; siteName: string; error?: string }>(functions, 'fetchUrlMetadata');
            const result = await fetchMetadata({ url: normalizedUrl });

            if (result.data.title) {
                setFormData(prev => ({
                    ...prev,
                    links: prev.links?.map(link =>
                        link.id === linkId
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
    };

    // --- Effects ---

    // Subscribe to tasks
    useEffect(() => {
        const user = auth.currentUser;
        if (!currentClassId || !user) {
            return;
        }

        const unsubscribe = subscribeToClassroomTasks(currentClassId, (taskData) => {
            setTasks(taskData);
        }, user.uid);

        return () => unsubscribe();
    }, [currentClassId]);

    // Auto-select current class for new tasks
    useEffect(() => {
        if (currentClassId && isNewTask && !formData.selectedRoomIds.includes(currentClassId)) {
            setFormData(prev => ({
                ...prev,
                selectedRoomIds: [currentClassId, ...prev.selectedRoomIds]
            }));
        }
    }, [currentClassId, isNewTask, setFormData]);

    // Persist formData to sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem('taskManager.formData', JSON.stringify(formData));
        } catch (e) {
            console.warn('Failed to persist form data to sessionStorage:', e);
        }
    }, [formData]);

    // Persist editingTaskId to sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem('taskManager.editingTaskId', editingTaskId || 'null');
        } catch (e) {
            console.warn('Failed to persist editing task ID to sessionStorage:', e);
        }
    }, [editingTaskId]);

    // Handle initialTask prop
    const processedInitialTaskRef = useRef<string | null>(null);
    useEffect(() => {
        if (initialTask && initialTask.id !== processedInitialTaskRef.current && tasks.length > 0) {
            handleEditClick(initialTask);
            processedInitialTaskRef.current = initialTask.id;
        }
    }, [initialTask, tasks]);

    // Handle tasksToAdd prop
    const processedTasksToCopyRef = useRef<string | null>(null);
    useEffect(() => {
        if (!tasksToAdd || tasksToAdd.length === 0 || !auth.currentUser) return;

        const signature = tasksToAdd.map(t => t.id).join(',');
        if (signature === processedTasksToCopyRef.current) return;
        processedTasksToCopyRef.current = signature;

        const copyTasks = async () => {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            try {
                const idMap: Record<string, string> = {};
                const today = toDateString();

                for (const task of tasksToAdd) {
                    const newRef = await addDoc(collection(db, 'tasks'), {
                        title: task.title,
                        description: task.description || '',
                        type: task.type,
                        parentId: null,
                        rootId: null,
                        path: [],
                        pathTitles: [],
                        links: task.links || [],
                        startDate: today,
                        endDate: today,
                        selectedRoomIds: currentClassId ? [currentClassId] : [],
                        teacherId: userId,
                        presentationOrder: task.presentationOrder || 0,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        attachments: task.attachments || [],
                        status: 'todo',
                        childIds: [],
                    });
                    idMap[task.id] = newRef.id;
                }

                for (const task of tasksToAdd) {
                    const newId = idMap[task.id];
                    if (!newId) continue;

                    const newParentId = task.parentId ? idMap[task.parentId] || null : null;
                    const newRootId = task.rootId ? idMap[task.rootId] || null : null;

                    if (newParentId || newRootId) {
                        await updateDoc(doc(db, 'tasks', newId), {
                            parentId: newParentId,
                            rootId: newRootId || newParentId,
                        });
                    }
                }

                handleSuccess(`Copied ${tasksToAdd.length} item(s) to task board`);
                onTasksAdded?.();
            } catch (error) {
                console.error('Error copying tasks:', error);
                handleError('Failed to copy tasks to board');
            }
        };

        copyTasks();
    }, [tasksToAdd, onTasksAdded, currentClassId]);

    // Combined filtering: Hook-based (text/type) + Component-based (date/class)
    const filteredTasks = useMemo(() => {
        // Filter criteria:
        // 1. Must have start and end dates
        // 2. Must be within the selected date range
        // 3. Must be assigned to the current class
        // 4. Include drafts (they will be styled differently in the UI)

        return hierarchicalTasks.filter(task => {
            const startDate = task.startDate || '';
            const endDate = task.endDate || '';
            const isInRange = selectedDate >= startDate && selectedDate <= endDate;
            const isDraft = task.status === 'draft';

            const isAssignedToCurrentClass = currentClassId
                ? task.selectedRoomIds?.includes(currentClassId)
                : true;

            // Include task if it's in the selected date range OR if it's a draft
            return startDate && endDate && isAssignedToCurrentClass && (isInRange || isDraft);
        });
    }, [hierarchicalTasks, selectedDate, currentClassId]);

    // Get available parents
    const getAvailableParents = useCallback((itemType: ItemType): Task[] => {
        const allowedParentTypes = ALLOWED_PARENT_TYPES[itemType];
        if (allowedParentTypes.length === 0) return [];
        return tasks.filter(t => allowedParentTypes.includes(t.type));
    }, [tasks]);

    // --- File Upload Handlers ---

    const uploadFile = async (file: File): Promise<Attachment | null> => {
        if (!auth.currentUser) {
            handleError('You must be logged in to upload files');
            return null;
        }

        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            handleError(`File type not allowed: ${file.type}`);
            return null;
        }

        if (file.size > MAX_FILE_SIZE) {
            handleError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB`);
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
                uploadedAt: new Date(),
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
                if (attachment) newAttachments.push(attachment);
            }
        }

        if (newAttachments.length > 0) {
            hookAddAttachments(newAttachments);
            handleSuccess(`${newAttachments.length} file(s) uploaded`);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileDrop = async (files: File[]) => {
        if (files.length === 0) return;

        const newAttachments: Attachment[] = [];
        for (const file of files) {
            const attachment = await uploadFile(file);
            if (attachment) newAttachments.push(attachment);
        }

        if (newAttachments.length > 0) {
            hookAddAttachments(newAttachments);
            handleSuccess(`${newAttachments.length} file(s) uploaded`);
        }
    };

    const removeAttachment = async (attachmentId: string) => {
        const attachment = activeFormData.attachments?.find(a => a.id === attachmentId);
        if (attachment) {
            try {
                const pathMatch = attachment.url.match(/attachments%2F([^?]+)/);
                if (pathMatch && pathMatch[1]) {
                    const filePath = decodeURIComponent(pathMatch[1]);
                    const storageRef = ref(storage, `attachments/${filePath}`);
                    await deleteObject(storageRef).catch(() => { });
                }
            } catch (error) {
                console.warn('Could not delete attachment from storage:', error);
            }
        }
        hookRemoveAttachment(attachmentId);
    };

    // --- Auto-Save Effect ---
    useEffect(() => {
        if (!isDirty || (!activeFormData.title.trim() && activeFormData.selectedRoomIds.length === 0)) return;

        const timer = setTimeout(async () => {
            setSaveState('saving');
            await handleSave(true);
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 1500);
        }, 1000);

        return () => clearTimeout(timer);
    }, [activeFormData, isDirty]);

    // Header interaction
    useEffect(() => {
        const mobileBtn = document.getElementById('mobile-new-task-btn');
        if (mobileBtn) {
            const handleClick = () => resetForm();
            mobileBtn.addEventListener('click', handleClick);
            return () => mobileBtn.removeEventListener('click', handleClick);
        }
    }, [resetForm]);

    // --- Render ---

    const availableParents = getAvailableParents(activeFormData.type);
    const currentClass = rooms.find(r => r.id === currentClassId);

    // Header content for PageLayout
    const headerContent = (
        <>
            {/* Left Section (3 cols): Label + Current Class + Drafts + New Task */}
            <div className="lg:col-span-3 flex items-center gap-6">
                <div className="flex items-baseline gap-3 shrink-0">
                    <span className="text-fluid-lg font-black text-brand-textPrimary">
                        Tasks:
                    </span>
                    <span className="text-fluid-lg font-black text-brand-textPrimary underline decoration-brand-accent decoration-2 underline-offset-4">
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
                                    <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-wider">Drafts:</span>
                                )}
                                {drafts.slice(0, 4).map(draft => {
                                    const isActive = editingTaskId === draft.id;
                                    const hierNum = getHierarchicalNumber(draft, filteredTasks, draft.endDate);
                                    return (
                                        <button
                                            key={draft.id}
                                            onClick={() => loadTask(draft)}
                                            title={draft.title}
                                            className={`
                                                flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all
                                                ${isActive
                                                    ? 'bg-[var(--color-bg-tile-hover)] text-brand-textPrimary border border-[var(--color-border-subtle)]'
                                                    : 'bg-black/5 text-brand-textSecondary hover:bg-[var(--color-bg-tile-hover)] hover:text-brand-textPrimary border border-transparent'}
                                            `}
                                        >
                                            <span className="font-bold">{hierNum}.</span>
                                            <span className="truncate max-w-[60px]">{draft.title || 'Untitled'}</span>
                                        </button>
                                    );
                                })}
                                {drafts.length > 4 && (
                                    <span className="text-xs text-brand-textSecondary">+{drafts.length - 4} more</span>
                                )}
                            </>
                        );
                    })()}
                </div>

                {/* New Task Button */}
                <button
                    onClick={resetForm}
                    title="Create new task"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-float ml-auto
                        bg-[var(--color-bg-tile)] border border-[var(--color-border-subtle)] text-brand-textPrimary
                        shadow-layered
                        hover:shadow-layered-lg
                        button-lift-dynamic hover:border-brand-accent/50 min-h-[44px]"
                >
                    <Plus className="w-5 h-5 text-brand-accent" />
                    <span>New Task</span>
                </button>
            </div>

            {/* Right column (1 col): Shape of the Day Date Navigation */}
            <div className="lg:col-span-1 flex items-center justify-center gap-2">
                <button
                    onClick={() => {
                        const prev = new Date(selectedDate + 'T00:00:00');
                        prev.setDate(prev.getDate() - 1);
                        setSelectedDate(toDateString(prev));
                    }}
                    className="p-2 rounded-xl transition-float text-brand-textSecondary border border-transparent
                        hover:text-brand-accent hover:bg-brand-accent/5 hover:border-brand-accent/20 button-lift-dynamic hover:shadow-layered-sm
                        focus:outline-none"
                    aria-label="Previous day"
                >
                    <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-2 text-center">
                    <DatePicker
                        value={selectedDate}
                        onChange={(value) => setSelectedDate(value || toDateString())}
                        iconOnly={true}
                        iconColor="var(--color-brand-accent)"
                    />

                    <span className="text-fluid-base font-bold whitespace-nowrap">
                        <span className="text-brand-textPrimary underline decoration-brand-accent">
                            {(() => {
                                const d = new Date(selectedDate + 'T00:00:00');
                                return isValid(d) ? format(d, 'MMM d') : selectedDate;
                            })()}
                        </span>
                        <span className="text-brand-textSecondary">{' '}Schedule</span>
                    </span>
                </div>

                <button
                    onClick={() => {
                        const next = new Date(selectedDate + 'T00:00:00');
                        next.setDate(next.getDate() + 1);
                        setSelectedDate(toDateString(next));
                    }}
                    className="p-2 rounded-xl transition-float text-brand-textSecondary border border-transparent
                        hover:text-brand-accent hover:bg-brand-accent/5 hover:border-brand-accent/20 button-lift-dynamic hover:shadow-layered-sm
                        focus:outline-none"
                    aria-label="Next day"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </>
    );

    return (
        <PageLayout
            header={<div className="hidden lg:grid lg:grid-cols-4 w-full items-center gap-6">{headerContent}</div>}
        >
            <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-6">

                    {/* LEFT PANEL: Task Editor */}
                    <div className="flex-1 lg:col-span-3 flex flex-col">
                        {/* Main Form Area - Outer box removed for "Free-Floating" model */}
                        <div className={`w-full space-y-4 flex-1 flex flex-col relative z-40 ${editingTaskId ? 'active' : ''}`}>


                            {/* Title Input with Type selector and predictive number */}
                            <div className="rounded-xl border border-[var(--color-border-subtle)] focus-within:border-[var(--color-border-strong)] bg-[var(--color-bg-tile)] transition-all duration-300
                                shadow-layered flex items-center"
                                style={{ backdropFilter: 'blur(var(--tile-blur, 0px))', WebkitBackdropFilter: 'blur(var(--tile-blur, 0px))' }}>
                                {/* Predictive Task Number - shows when typing or editing */}
                                {(activeFormData.title.trim() || editingTaskId) && (
                                    <span className="text-sm font-black text-brand-accent bg-brand-accent/10 px-2.5 py-1 rounded-lg ml-3 shrink-0">
                                        {(() => {
                                            if (editingTaskId) {
                                                const task = tasks.find(t => t.id === editingTaskId);
                                                return task ? getHierarchicalNumber(task, filteredTasks, selectedDate) : '...';
                                            }
                                            return getPredictiveNumber(activeFormData.parentId, filteredTasks, selectedDate, currentClassId);
                                        })()}
                                    </span>
                                )}
                                <input
                                    type="text"
                                    value={activeFormData.title}
                                    onChange={(e) => updateActiveCard('title', e.target.value)}
                                    placeholder="Title for this task..."
                                    className="flex-1 text-base font-bold bg-transparent border-0 focus:ring-0 focus:outline-none px-4 py-3 transition-all placeholder:text-brand-textSecondary placeholder:opacity-100 text-brand-textPrimary"
                                />
                                {/* Type selector - CUSTOM STYLE: No elevation, no background hover */}
                                <div className="flex items-center gap-1.5 pr-3 shrink-0">
                                    <span className="text-[10px] font-bold text-brand-textSecondary uppercase tracking-widest pl-1">Type:</span>
                                    <div className="w-[120px]">
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
                                            buttonClassName="text-sm py-1 border-0 bg-transparent !shadow-none hover:bg-transparent hover:!translate-y-0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Description & Attachments Section */}
                            <div className="flex-1 min-h-[300px] relative">
                                <div className="absolute inset-0 flex flex-col transition-all duration-200 rounded-md">
                                    <div className="flex-1 overflow-y-auto transition-all duration-300">
                                        <RichTextEditor
                                            value={activeFormData.description}
                                            onChange={(value) => updateActiveCard('description', value)}
                                            onDrop={handleFileDrop}
                                            placeholder="Describe this task..."
                                            secondaryPlaceholder="Add text, links, or drag files here"
                                            className="h-full text-brand-textPrimary text-sm"
                                        />
                                    </div>
                                    {/* Bottom bar: Attachments + Links + Upload/Link buttons */}
                                    <div className="absolute bottom-6 left-6 flex flex-wrap items-center gap-2">
                                        {/* Inline attachments with image thumbnails */}
                                        {activeFormData.attachments && activeFormData.attachments.map(attachment => (
                                            <div
                                                key={attachment.id}
                                                className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--color-bg-tile)] rounded-lg border border-[var(--color-border-subtle)] shadow-layered-sm text-xs group button-lift-dynamic transition-float cursor-default"
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
                                                            className="w-10 h-10 object-cover rounded border border-white/10"
                                                        />
                                                        <span className="text-brand-textPrimary truncate max-w-[80px]">
                                                            {attachment.filename}
                                                        </span>
                                                    </a>
                                                ) : (
                                                    /* Non-image file icon */
                                                    <>
                                                        <FileIcon size={12} className="text-brand-textSecondary" />
                                                        <a
                                                            href={attachment.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-brand-textPrimary hover:text-brand-accent truncate max-w-[100px]"
                                                        >
                                                            {attachment.filename}
                                                        </a>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => removeAttachment(attachment.id)}
                                                    className="p-1 hover:bg-red-500/10 text-brand-textSecondary hover:text-red-500 rounded-lg transition-all"
                                                    title="Remove attachment"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        {/* Inline links display - Multiple links */}
                                        {activeFormData.links && activeFormData.links.map((link) => (
                                            <div
                                                key={link.id}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--color-bg-tile)] rounded-lg border border-[var(--color-border-subtle)] shadow-layered-sm text-xs max-w-[280px] button-lift-dynamic transition-float"
                                            >
                                                <LinkIcon size={12} className="text-blue-500 shrink-0" />
                                                <a
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-brand-textPrimary hover:text-brand-accent truncate"
                                                    title={link.url}
                                                >
                                                    {link.title || (() => { try { return new URL(link.url).hostname; } catch { return link.url; } })()}
                                                </a>
                                                <button
                                                    onClick={() => hookRemoveLink(link.id)}
                                                    className="p-1 hover:bg-red-500/10 text-brand-textSecondary hover:text-red-500 rounded-lg transition-all"
                                                    title="Remove link"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        {/* Loading indicator while fetching link metadata */}
                                        {isLoadingLinkTitle && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-brand-textSecondary">
                                                <Loader size={12} className="animate-spin" />
                                                <span>Fetching title...</span>
                                            </div>
                                        )}
                                        {/* Upload & Link buttons - Nested tile button pattern matching ClassCard */}
                                        <div className="flex items-center gap-2">
                                            <div className="group/btn relative flex items-center justify-center gap-2 py-2.5 px-4 min-h-[44px]
                                                rounded-xl border cursor-pointer
                                                bg-[var(--color-bg-tile)] border-[var(--color-border-subtle)] hover:border-brand-accent/50
                                                shadow-layered hover:shadow-layered-lg
                                                text-brand-textSecondary hover:text-brand-textPrimary hover:bg-[var(--color-bg-tile-hover)]">
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    multiple
                                                    accept={ALLOWED_FILE_TYPES.join(',')}
                                                    onChange={handleFileSelect}
                                                    disabled={isUploading}
                                                    title="Upload files"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                {isUploading ? <Loader size={16} className="animate-spin text-brand-accent" /> : <Upload size={16} className="w-4 h-4 transition-colors group-hover/btn:text-brand-accent" />}
                                                <span className="text-[9px] font-black uppercase tracking-widest transition-colors group-hover/btn:text-brand-textPrimary">
                                                    {isUploading ? 'Wait...' : 'Upload'}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const url = prompt('Enter URL:');
                                                    if (url) addLink(url);
                                                }}
                                                className="group/btn flex items-center justify-center gap-2 py-2.5 px-4 min-h-[44px]
                                                    rounded-xl border
                                                    bg-[var(--color-bg-tile)] border-[var(--color-border-subtle)] hover:border-brand-accent/50
                                                    shadow-layered hover:shadow-layered-lg
                                                    text-brand-textSecondary hover:text-brand-textPrimary hover:bg-[var(--color-bg-tile-hover)]"
                                            >
                                                <LinkIcon size={16} className="w-4 h-4 transition-colors group-hover/btn:text-brand-accent" />
                                                <span className="text-[9px] font-black uppercase tracking-widest transition-colors group-hover/btn:text-brand-textPrimary">Link</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* Action Row: Dates + Class + Connect (left) | Delete + Save (right) */}
                            <div className="flex items-end justify-between gap-4 flex-wrap">
                                {/* Left: Dates + Class Selector + Connect Tasks */}
                                <div className="flex items-end gap-4 flex-wrap -mt-1">
                                    {/* DATES */}
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-bold text-brand-textSecondary uppercase tracking-widest pl-1">Dates:</span>
                                        <div className="hidden lg:block">
                                            <DateRangePicker
                                                startDate={activeFormData.startDate}
                                                endDate={activeFormData.endDate}
                                                onStartDateChange={(value) => updateActiveCard('startDate', value)}
                                                onEndDateChange={(value) => updateActiveCard('endDate', value)}
                                                startPlaceholder="Start"
                                                endPlaceholder="Due"
                                                compactMode={false}
                                            />
                                        </div>
                                        {/* Mobile: Compact single button */}
                                        <div className="lg:hidden">
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

                                    {/* ADD TO CLASS */}
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-bold text-brand-textSecondary uppercase tracking-widest pl-1">Add to Class:</span>
                                        <div className="w-[200px]">
                                            {loadingRooms ? (
                                                <Loader className="w-4 h-4 animate-spin text-brand-textSecondary" />
                                            ) : rooms.length === 0 ? (
                                                <span className="text-xs text-brand-textSecondary">No classes found</span>
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
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* CONNECT TASKS */}
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-bold text-brand-textSecondary uppercase tracking-widest pl-1">Connect to:</span>
                                        <div className="w-[44px]">
                                            <Select<string>
                                                value={activeFormData.parentId}
                                                onChange={async (value) => {
                                                    if (value === '__add_child__') {
                                                        if (!editingTaskId) {
                                                            if (!activeFormData.title.trim()) {
                                                                handleError(new Error("⚠️ Please add a title before adding children."));
                                                                return;
                                                            }
                                                            await handleSave();
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
                                                    ...(['project', 'assignment'].includes(activeFormData.type) ? [
                                                        { value: '__add_child__', label: '+ Add Task', icon: Plus, iconColor: '#22c55e' },
                                                        { value: '__divider_top__', label: '──────────', disabled: true },
                                                    ] : []),
                                                    ...(activeFormData.type === 'task' ? [
                                                        { value: '__add_child__', label: '+ Add Subtask', icon: Plus, iconColor: '#f97316' },
                                                        { value: '__divider_top__', label: '──────────', disabled: true },
                                                    ] : []),
                                                    ...availableParents.map(parent => ({
                                                        value: parent.id,
                                                        label: `${getHierarchicalNumber(parent, tasks)}. ${parent.title}`,
                                                        icon: getTypeIcon(parent.type),
                                                        iconColor: getTypeHexColor(parent.type),
                                                    })),
                                                ]}
                                                placeholder=""
                                                icon={Plus}
                                                nullable
                                                searchable
                                                hideText
                                                hideChevron
                                                iconSize={20}
                                                dropUp
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Delete + Save */}
                                <div className="flex items-center gap-2">
                                    {/* Delete Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(editingTaskId!)}
                                        disabled={isSubmitting}
                                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
                                            bg-[var(--color-bg-tile)] border border-[var(--color-border-subtle)] text-brand-textSecondary
                                            button-lift-dynamic hover:border-red-400/50 hover:text-brand-textPrimary
                                            disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-h-[44px]
                                            ${isNewTask ? 'invisible pointer-events-none' : ''}`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete</span>
                                    </button>

                                    {/* Save Button */}
                                    <button
                                        onClick={async () => {
                                            if (!activeFormData.title.trim()) {
                                                handleError(new Error("⚠️ Please include a title before saving."));
                                                return;
                                            }
                                            await handleSave();
                                        }}
                                        disabled={isSubmitting || !activeFormData.title.trim()}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
                                            bg-[var(--color-bg-tile)] border border-[var(--color-border-subtle)] text-brand-textPrimary
                                            button-lift-dynamic hover:border-brand-accent/50
                                            disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-h-[44px]"
                                    >
                                        {isSubmitting || saveState === 'saving' ? (
                                            <Loader className="w-3.5 h-3.5 animate-spin text-brand-accent" />
                                        ) : (
                                            <Check className="w-3.5 h-3.5 text-brand-accent" />
                                        )}
                                        <span>{isSubmitting || saveState === 'saving' ? 'Saving...' : 'Save'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Task List */}
                    <div className="flex-1 min-h-0 lg:col-span-1 flex flex-col">
                        <div className="flex-1 min-h-0 flex flex-col justify-end lg:justify-between overflow-visible pb-2 lg:pb-0 lg:p-0">


                            {/* Mobile Overlay - closes accordion when clicking outside */}
                            {isMobileTasksOpen && (
                                <div
                                    className="lg:hidden fixed inset-0 top-12 bg-black/30 z-40"
                                    onClick={() => setIsMobileTasksOpen(false)}
                                    aria-hidden="true"
                                />
                            )}

                            {/* Mobile Accordion Header for Task List - only visible on mobile */}
                            <div className="lg:hidden relative z-50 flex items-center w-full py-2.5 px-4 mt-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-tile)]">
                                {/* Left: Date Picker - Full display for more presence */}
                                <DatePicker
                                    value={selectedDate}
                                    onChange={(value) => setSelectedDate(value || toDateString())}
                                    className="shrink-0 scale-90 -ml-2"
                                />

                                {/* Center: Title with task count */}
                                <div className="flex-1 flex items-center justify-center gap-2 -ml-4">
                                    <span className="font-medium text-brand-textSecondary">
                                        Tasks:
                                    </span>
                                    <span className="font-bold text-brand-textPrimary">{filteredTasks.length}</span>
                                </div>

                                {/* Right: Expand/collapse toggle */}
                                <button
                                    type="button"
                                    onClick={() => setIsMobileTasksOpen(!isMobileTasksOpen)}
                                    className="p-1 rounded hover:bg-[var(--color-bg-tile-hover)] transition-colors"
                                    title={isMobileTasksOpen ? "Close tasks list" : "Open tasks list"}
                                >
                                    <ChevronDown
                                        size={18}
                                        className={`text-brand-textSecondary transition-transform duration-200 ${isMobileTasksOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>
                            </div>

                            {/* Task List - collapsible on mobile, always visible on lg+ */}
                            {/* Task List - collapsible on mobile, always visible on lg+ */}
                            <div className={`
                                px-4 space-y-3 relative z-50 bg-[var(--color-bg-tile)] lg:bg-transparent
                                lg:pt-0 lg:pb-4 overflow-visible
                                ${isMobileTasksOpen
                                    ? 'flex-1 pt-3 pb-4 rounded-lg overflow-y-auto custom-scrollbar'
                                    : 'max-h-0 overflow-hidden lg:max-h-none lg:overflow-visible'
                                }
                                transition-all duration-300 ease-in-out
                            `}>
                                {!currentClassId ? (
                                    <div className="text-center py-8 text-brand-textSecondary italic text-sm">
                                        Select a class to view schedule.
                                    </div>
                                ) : filteredTasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <div className="text-brand-textSecondary text-sm font-medium">No tasks scheduled.</div>
                                        <div className="text-brand-textSecondary/60 text-xs mt-1">Create a task to get started.</div>
                                    </div>
                                ) : (() => {
                                    return filteredTasks.map((task) => {
                                        const TypeIconSmall = getTypeIcon(task.type);

                                        const isEditing = editingTaskId === task.id;

                                        // Get siblings (same parentId) for proper disabled state
                                        const siblings = tasks.filter(t => t.parentId === task.parentId);
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
                                                group relative p-3 rounded-xl transition-float cursor-pointer levitated-tile
                                                ${isEditing ? 'active' : ''}
                                                ${task.status === 'draft' ? 'opacity-50' : ''}
                                            `}
                                            >

                                                <div className="flex items-start gap-2">
                                                    {/* Left Column: Arrow + Number/Icon paired rows */}
                                                    <div className="flex flex-col gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                                        {/* Row 1: Up Arrow + Number */}
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => handleReorder(task.id, 'up')}
                                                                disabled={siblingIndex === 0}
                                                                title="Move up"
                                                                className="p-1 rounded-md transition-colors bg-transparent border border-transparent text-brand-textMuted hover:text-brand-accent hover:bg-brand-accent/5 disabled:opacity-30 disabled:hover:text-brand-textMuted disabled:hover:bg-transparent focus:outline-none"
                                                            >
                                                                <ArrowUp size={16} />
                                                            </button>
                                                            <span className="text-sm font-bold text-brand-textSecondary w-6 text-center">
                                                                {getHierarchicalNumber(task, filteredTasks, selectedDate)}
                                                            </span>
                                                        </div>
                                                        {/* Row 2: Down Arrow + Type Icon */}
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => handleReorder(task.id, 'down')}
                                                                disabled={siblingIndex === siblings.length - 1}
                                                                title="Move down"
                                                                className="p-1 rounded-md transition-colors bg-transparent border border-transparent text-brand-textMuted hover:text-brand-accent hover:bg-brand-accent/5 disabled:opacity-30 disabled:hover:text-brand-textMuted disabled:hover:bg-transparent focus:outline-none"
                                                            >
                                                                <ArrowDown size={16} />
                                                            </button>
                                                            <span className={`w-6 h-6 rounded-md flex items-center justify-center ${getTypeColorClasses(task.type)}`}>
                                                                <TypeIconSmall size={14} />
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Content: Title + Due Date */}
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className={`font-bold text-sm line-clamp-1 ${isEditing ? 'text-white' : 'text-brand-textPrimary/90'}`}>
                                                            {task.title}
                                                        </h5>

                                                        {/* Due Date */}
                                                        {task.endDate && (
                                                            <p className="text-xs text-brand-textSecondary mt-0.5 flex items-center gap-1">
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
                                                            <div className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-brand-textSecondary bg-[var(--color-bg-tile-hover)] border border-[var(--color-border-subtle)] rounded-md">
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
                                                                className="group/btn p-1.5 rounded-lg transition-float bg-[var(--color-bg-tile)] border border-[var(--color-border-subtle)] text-brand-textSecondary shadow-layered-sm opacity-0 group-hover:opacity-100 hover:shadow-layered button-lift-dynamic hover:text-brand-textPrimary hover:bg-[var(--color-bg-tile-hover)] hover:border-brand-accent/50 focus:outline-none"
                                                                title="Add subtask"
                                                            >
                                                                <Plus size={14} className="transition-colors group-hover/btn:text-brand-accent" />
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
        </PageLayout>
    );
}
