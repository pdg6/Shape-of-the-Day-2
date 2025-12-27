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

import { handleError, handleSuccess } from '../../utils/errorHandler';
import { toDateString } from '../../utils/dateHelpers';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, auth, storage, functions } from '../../firebase';
import { subscribeToClassroomTasks } from '../../services/firestoreService';
import { ItemType, Task, ALLOWED_CHILD_TYPES, ALLOWED_PARENT_TYPES, Attachment } from '../../types';
import { useClassStore } from '../../store/classStore';
import { useTaskManager } from '../../hooks/useTaskManager';
import { getHierarchicalNumber } from '../../utils/taskHierarchy';

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
        // Match ShapeOfDay's strict filtering:
        // 1. Must have start and end dates
        // 2. Must be within the selected date range
        // 3. Must be assigned to the current class
        // 4. Must not be a draft (published)

        return hierarchicalTasks.filter(task => {
            const startDate = task.startDate || '';
            const endDate = task.endDate || '';
            const isInRange = selectedDate >= startDate && selectedDate <= endDate;
            const isPublished = task.status !== 'draft';

            const isAssignedToCurrentClass = currentClassId
                ? task.selectedRoomIds?.includes(currentClassId)
                : true;

            return startDate && endDate && isInRange && isPublished && isAssignedToCurrentClass;
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

    return (
        <div className="flex-1 h-full flex flex-col space-y-4">
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
                                                        ? 'bg-slate-200 dark:bg-white/10 text-brand-textDarkPrimary dark:text-gray-200 border border-slate-300 dark:border-white/10'
                                                        : 'bg-slate-50 dark:bg-[#151921] text-brand-textDarkSecondary dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-[#1a1d24] hover:text-brand-textDarkPrimary dark:hover:text-gray-300 border border-transparent'}
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

                    <div className="flex items-center gap-2 text-center">
                        <DatePicker
                            value={selectedDate}
                            onChange={(value) => setSelectedDate(value || toDateString())}
                            iconOnly={true}
                            iconColor="var(--color-brand-accent)"
                        />

                        <span className="text-fluid-base font-bold whitespace-nowrap">
                            <span className="text-brand-textDarkPrimary dark:text-brand-textPrimary underline decoration-brand-accent">
                                {(() => {
                                    const d = new Date(selectedDate + 'T00:00:00');
                                    return isValid(d) ? format(d, 'MMM d') : selectedDate;
                                })()}
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
            <div className="flex-1 min-h-0 flex flex-col lg:block overflow-visible">
                <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-6 lg:h-full overflow-y-auto lg:overflow-visible">

                    {/* LEFT PANEL: Task Editor - flex-1 to fill space on mobile */}
                    <div className="flex-1 min-h-0 lg:col-span-3 flex flex-col lg:overflow-y-auto custom-scrollbar">
                        {/* Main Form Card */}
                        <div className="w-full bg-brand-lightSurface dark:bg-[#1a1d24] rounded-2xl border border-slate-200 dark:border-white/5 shadow-layered p-6 space-y-4 flex-1 flex flex-col relative z-40 lift-hover">
                            {/* Save State Indicator - top right */}
                            <div className="absolute top-3 right-3 z-10">
                                {saveState === 'saving' && (
                                    <div className="flex items-center gap-1.5 text-slate-400" title="Saving...">
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
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider shrink-0">Title</span>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={activeFormData.title}
                                        onChange={(e) => updateActiveCard('title', e.target.value)}
                                        placeholder="Task Title"
                                        className="w-full text-xl font-bold bg-transparent border-0 border-b-2 border-transparent hover:border-slate-300 focus:border-brand-accent focus:ring-0 focus:outline-none px-2 py-1 transition-all placeholder-slate-400 dark:placeholder-gray-600 text-brand-textDarkPrimary dark:text-brand-textPrimary"
                                    />
                                </div>
                            </div>

                            {/* Metadata Row: Type, Connections, Dates - all on one row */}
                            <div className="flex items-end gap-2 lg:gap-4">
                                {/* TYPE */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Type</span>
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
                                    <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Link</span>
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

                                {/* DATE RANGE - compact on mobile, separate buttons on desktop */}
                                <div className="flex flex-col gap-1 ml-auto">
                                    <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider hidden lg:block">Dates</span>
                                    {/* Desktop: Separate start/end buttons */}
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
                            </div>
                            {/* Description & Attachments Section */}
                            {/* Description Container with embedded Upload/Link buttons */}
                            <div className="flex-1 min-h-[120px] relative">
                                <div className="absolute inset-0 flex flex-col transition-all duration-200 rounded-md">
                                    <div className="flex-1 rounded-2xl border border-slate-200 dark:border-white/5 focus-within:border-brand-accent/30 dark:focus-within:border-brand-accent/30 bg-slate-50 dark:bg-[#151921] shadow-inner-sm overflow-y-auto transition-all duration-300">
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
                                                className="flex items-center gap-1.5 px-2 py-1.5 bg-white dark:bg-gray-800 rounded-md border border-slate-200 dark:border-gray-600 text-xs group hover:scale-[1.02] transition-transform cursor-default"
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
                                                            className="w-10 h-10 object-cover rounded border border-slate-200 dark:border-gray-600"
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
                                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-lg transition-all"
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
                                                    onClick={() => hookRemoveLink(link.id)}
                                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                                                    title="Remove link"
                                                >
                                                    <X size={12} />
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
                                            <div className="relative py-2 px-4 min-h-[40px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-layered-sm hover:shadow-layered-md hover:scale-[1.02] hover:border-brand-accent/50 transition-all duration-300 group cursor-pointer">
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
                                                <div className={`flex items-center justify-center gap-2 transition-colors ${isUploading ? 'text-brand-accent' : 'text-slate-500 dark:text-gray-400 group-hover:text-brand-accent'}`}>
                                                    {isUploading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
                                                    <span className="text-sm font-bold tracking-tight">{isUploading ? 'Uploading...' : 'Upload'}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const url = prompt('Enter URL:');
                                                    if (url) addLink(url);
                                                }}
                                                className="py-2 px-4 min-h-[40px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-layered-sm hover:shadow-layered-md hover:scale-[1.02] hover:border-brand-accent/50 transition-all duration-300 group"
                                            >
                                                <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-gray-400 group-hover:text-brand-accent transition-colors">
                                                    <LinkIcon size={16} />
                                                    <span className="text-sm font-bold tracking-tight">Add Link</span>
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
                                    <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Add to Class:</span>
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

                                    {/* Save Button - Primary CTA */}
                                    <Button
                                        variant="primary"
                                        size="md"
                                        icon={isSubmitting ? Loader : Check}
                                        onClick={async () => {
                                            if (!activeFormData.title.trim()) {
                                                handleError(new Error("⚠️ Please include a title before saving."));
                                                return;
                                            }
                                            await handleSave();
                                        }}
                                        disabled={isSubmitting}
                                        className="min-w-[100px]"
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Task List - shrink-0 on mobile so form gets the space */}
                    <div className="shrink-0 lg:col-span-1 flex flex-col lg:h-full lg:overflow-visible">
                        <div className="flex flex-col justify-end lg:justify-between overflow-visible pb-2 lg:pb-0 lg:h-full lg:p-0">


                            {/* Mobile Overlay - closes accordion when clicking outside */}
                            {isMobileTasksOpen && (
                                <div
                                    className="lg:hidden fixed inset-0 top-12 bg-black/30 z-40"
                                    onClick={() => setIsMobileTasksOpen(false)}
                                    aria-hidden="true"
                                />
                            )}

                            {/* Mobile Accordion Header for Task List - only visible on mobile */}
                            <div className="lg:hidden relative z-50 flex items-center w-full py-2.5 px-4 mt-2 rounded-lg border border-slate-200 dark:border-white/5 bg-brand-lightSurface dark:bg-[#1a1d24]">
                                {/* Left: Date Picker - Full display for more presence */}
                                <DatePicker
                                    value={selectedDate}
                                    onChange={(value) => setSelectedDate(value || toDateString())}
                                    className="shrink-0 scale-90 -ml-2"
                                />

                                {/* Center: Title with task count */}
                                <div className="flex-1 flex items-center justify-center gap-2 -ml-4">
                                    <span className="font-medium text-gray-400">
                                        Tasks:
                                    </span>
                                    <span className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">{filteredTasks.length}</span>
                                </div>

                                {/* Right: Expand/collapse toggle */}
                                <button
                                    type="button"
                                    onClick={() => setIsMobileTasksOpen(!isMobileTasksOpen)}
                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    title={isMobileTasksOpen ? "Close tasks list" : "Open tasks list"}
                                >
                                    <ChevronDown
                                        size={18}
                                        className={`text-gray-400 transition-transform duration-200 ${isMobileTasksOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>
                            </div>

                            {/* Task List - collapsible on mobile, always visible on lg+ */}
                            <div className={`
                                overflow-y-auto px-1 space-y-3 custom-scrollbar relative z-50 bg-brand-lightSurface dark:bg-transparent
                                lg:flex-1 lg:min-h-0 lg:pt-0 lg:pb-4 lg:bg-transparent
                                ${isMobileTasksOpen ? 'flex-1 pt-3 pb-4 rounded-lg' : 'max-h-0 lg:max-h-none overflow-hidden'}
                                transition-all duration-300 ease-in-out
                            `}>
                                {!currentClassId ? (
                                    <div className="text-center py-8 text-slate-400 dark:text-gray-500 italic text-sm">
                                        Select a class to view schedule.
                                    </div>
                                ) : filteredTasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <div className="text-slate-400 dark:text-gray-500 text-sm font-medium">No tasks scheduled.</div>
                                        <div className="text-slate-300 dark:text-gray-600 text-xs mt-1">Create a task to get started.</div>
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
                                                group relative p-3 rounded-xl border transition-all cursor-pointer lift-hover
                                                ${isEditing
                                                        ? 'border-brand-accent/50 shadow-layered-lg bg-white dark:bg-[#1a1d24]'
                                                        : 'border-slate-200 dark:border-white/5 hover:border-brand-accent/30 bg-brand-lightSurface dark:bg-[#1a1d24] shadow-layered'}
                                            `}
                                            >

                                                <div className="flex items-start gap-2">
                                                    {/* Reorder Controls - for all tasks within their sibling group */}
                                                    <div className="flex flex-col" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => handleReorder(task.id, 'up')}
                                                            disabled={siblingIndex === 0}
                                                            title="Move up"
                                                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-400 hover:text-brand-accent focus:bg-gray-100 dark:focus:bg-gray-800/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors focus:outline-none"
                                                        >
                                                            <ArrowUp size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleReorder(task.id, 'down')}
                                                            disabled={siblingIndex === siblings.length - 1}
                                                            title="Move down"
                                                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-400 hover:text-brand-accent focus:bg-gray-100 dark:focus:bg-gray-800/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors focus:outline-none"
                                                        >
                                                            <ArrowDown size={14} />
                                                        </button>
                                                    </div>

                                                    {/* Number + Type Icon - stacked vertically, left aligned */}
                                                    <div className="flex flex-col items-start shrink-0 w-8">
                                                        <span className="text-xs font-bold text-gray-400 text-left">
                                                            {getHierarchicalNumber(task, filteredTasks, selectedDate)}
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
