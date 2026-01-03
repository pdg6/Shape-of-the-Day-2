import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    FolderOpen,
    FileText,
    ListChecks,
    CheckSquare,
    ChevronRight,
    ChevronDown,
    ChevronLeft,
    ChevronUp,
    Copy,
    Filter,
    Search,
    Loader,
    Plus,
    Pencil,
    Trash2,
    Calendar as CalendarIcon
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Classroom, ItemType, Task, ALLOWED_CHILD_TYPES } from '../../types';
import { useClassStore } from '../../store/appSettings';
import { handleError, handleSuccess } from '../../utils/errorHandler';
import { format } from 'date-fns';
import { deleteTaskWithChildren } from '../../services/firestoreService';
import { DatePicker } from '../shared/DatePicker';
import { Select } from '../shared/Select';
import { PageLayout } from '../shared/PageLayout';

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

interface TaskInventoryProps {
    onEditTask?: (task: Task) => void;
    onCopyToBoard?: (tasks: Task[]) => void;
}

// Recursive tree item component
interface TreeItemProps {
    task: Task;
    allTasks: Task[];
    depth: number;
    expandedIds: Set<string>;
    onToggleExpand: (id: string) => void;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
    onCopyToBoard: (task: Task) => void;
    getProgress: (parentId: string) => { completed: number; total: number };
    onQuickAdd: (parentTask: Task) => void;
    quickAddParentId: string | null;
    quickAddTitle: string;
    onQuickAddTitleChange: (value: string) => void;
    onQuickAddSave: () => void;
    onQuickAddCancel: () => void;
    isQuickAddSaving: boolean;
}

function TreeItem({
    task,
    allTasks,
    depth,
    expandedIds,
    onToggleExpand,
    onEdit,
    onDelete,
    onCopyToBoard,
    getProgress,
    onQuickAdd,
    quickAddParentId,
    quickAddTitle,
    onQuickAddTitleChange,
    onQuickAddSave,
    onQuickAddCancel,
    isQuickAddSaving
}: TreeItemProps) {
    const TypeIcon = getTypeIcon(task.type);
    const children = allTasks.filter(t => t.parentId === task.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(task.id);

    // Check if this task type can have children
    const allowedChildTypes = ALLOWED_CHILD_TYPES[task.type];
    const isQuickAddActive = quickAddParentId === task.id;
    const quickAddInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when quick add becomes active
    useEffect(() => {
        if (isQuickAddActive && quickAddInputRef.current) {
            quickAddInputRef.current.focus();
        }
    }, [isQuickAddActive]);

    return (
        <div>
            <div
                className={`
                    group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all
                    hover:bg-tile-hover
                    pl-(--depth-padding)
                `}
                style={{ '--depth-padding': `${depth * 20 + 8}px` } as React.CSSProperties}
            >
                {/* Expand/Collapse Toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand(task.id);
                    }}
                    className={`p-1 rounded-lg transition-all ${hasChildren ? 'hover:bg-tile-hover' : 'opacity-0'}`}
                    disabled={!hasChildren}
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* Type Icon */}
                <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${getTypeColorClasses(task.type)}`}>
                    <TypeIcon size={12} />
                </span>

                {/* Title & Info */}
                <div className="flex-1 min-w-0" onClick={() => onEdit(task)}>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-brand-textPrimary">
                            {task.title}
                        </span>
                        {task.status === 'done' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-status-progress)]/10 text-[var(--color-status-progress)] font-medium shrink-0">
                                Done
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                    {/* Edit Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(task);
                        }}
                        className="p-1.5 min-w-11 min-h-11 sm:min-w-0 sm:min-h-0 rounded-lg hover:bg-[var(--color-brand-accent)]/10 text-brand-textSecondary hover:text-[var(--color-brand-accent)] transition-float hover:shadow-layered-lg button-lift-dynamic flex items-center justify-center"
                        title="Edit task"
                    >
                        <Pencil size={14} />
                    </button>
                    {/* Delete Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(task);
                        }}
                        className="p-1.5 min-w-11 min-h-11 sm:min-w-0 sm:min-h-0 rounded-lg hover:bg-[var(--color-status-stuck)]/10 text-brand-textSecondary hover:text-[var(--color-status-stuck)] transition-float hover:shadow-layered-lg button-lift-dynamic flex items-center justify-center"
                        title="Delete task"
                    >
                        <Trash2 size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCopyToBoard(task);
                        }}
                        className="p-1.5 min-w-11 min-h-11 sm:min-w-0 sm:min-h-0 rounded-xl hover:bg-tile-hover text-brand-textSecondary hover:text-brand-accent transition-float hover:shadow-layered-lg button-lift-dynamic flex items-center justify-center border border-transparent hover:border-border-subtle shadow-layered-sm"
                        title="Copy to Task Board"
                    >
                        <Copy size={14} />
                    </button>
                </div>
            </div>

            {/* Quick Add Input Row */}
            {isQuickAddActive && (
                <div
                    className="flex items-center gap-2 p-2 bg-[var(--color-status-progress)]/10 rounded-lg mx-2 mb-1 border-2 border-dashed border-[var(--color-status-progress)]/30 ml-(--depth-margin)"
                    style={{ '--depth-margin': `${(depth + 1) * 20 + 8}px` } as React.CSSProperties}
                >
                    <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${getTypeColorClasses(allowedChildTypes[0] || 'task')}`}>
                        {(() => {
                            const ChildTypeIcon = getTypeIcon(allowedChildTypes[0] || 'task');
                            return <ChildTypeIcon size={12} />;
                        })()}
                    </span>
                    <input
                        ref={quickAddInputRef}
                        type="text"
                        value={quickAddTitle}
                        onChange={(e) => onQuickAddTitleChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && quickAddTitle.trim()) {
                                onQuickAddSave();
                            } else if (e.key === 'Escape') {
                                onQuickAddCancel();
                            }
                        }}
                        onBlur={() => {
                            // Small delay to allow button clicks to register
                            setTimeout(() => {
                                if (!quickAddTitle.trim()) {
                                    onQuickAddCancel();
                                }
                            }, 150);
                        }}
                        placeholder={`New ${getTypeLabel(allowedChildTypes[0] || 'task').toLowerCase()} title...`}
                        className="flex-1 px-2 py-1 text-sm bg-tile border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-status-progress)]/20 focus:border-[var(--color-status-progress)]"
                        disabled={isQuickAddSaving}
                    />
                    {isQuickAddSaving ? (
                        <Loader size={16} className="animate-spin text-[var(--color-status-progress)]" />
                    ) : (
                        <button
                            onClick={onQuickAddSave}
                            disabled={!quickAddTitle.trim()}
                            className="p-1.5 rounded-lg bg-[var(--color-status-progress)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title="Save"
                        >
                            <Plus size={14} />
                        </button>
                    )}
                </div>
            )}

            {/* Children */}
            {isExpanded && hasChildren && (
                <div>
                    {children.map(child => (
                        <TreeItem
                            key={child.id}
                            task={child}
                            allTasks={allTasks}
                            depth={depth + 1}
                            expandedIds={expandedIds}
                            onToggleExpand={onToggleExpand}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onCopyToBoard={onCopyToBoard}
                            getProgress={getProgress}
                            onQuickAdd={onQuickAdd}
                            quickAddParentId={quickAddParentId}
                            quickAddTitle={quickAddTitle}
                            onQuickAddTitleChange={onQuickAddTitleChange}
                            onQuickAddSave={onQuickAddSave}
                            onQuickAddCancel={onQuickAddCancel}
                            isQuickAddSaving={isQuickAddSaving}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function TaskInventory({ onEditTask, onCopyToBoard }: TaskInventoryProps) {
    // --- Store ---
    const { classrooms: storeClassrooms } = useClassStore();

    // --- State ---
    const [tasks, setTasks] = useState<Task[]>([]);
    const [rooms, setRooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Quick Add State
    const [quickAddParentId, setQuickAddParentId] = useState<string | null>(null);
    const [quickAddTitle, setQuickAddTitle] = useState('');
    const [isQuickAddSaving, setIsQuickAddSaving] = useState(false);

    // Mobile view state - which column to show on small screens
    const [mobileActiveTab, setMobileActiveTab] = useState<'projects' | 'assignments' | 'tasks'>('projects');

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClassroom, setFilterClassroom] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
    const [savedSearches, setSavedSearches] = useState<{ name: string; query: string; filters: { classroom: string; status: string; date: string | null; } }[]>([]);

    // Date filter
    const [filterDate, setFilterDate] = useState<string | null>(null);

    // Calendar refs
    const calendarRef = useRef<HTMLDivElement>(null);
    const todayRef = useRef<HTMLButtonElement>(null);
    const selectedRef = useRef<HTMLButtonElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [scrollStartLeft, setScrollStartLeft] = useState(0);

    // --- Effects ---

    // Fetch all tasks
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
                    type: data.type || 'task',
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
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Use store classrooms or fetch
    useEffect(() => {
        if (storeClassrooms.length > 0) {
            setRooms(storeClassrooms);
        }
    }, [storeClassrooms]);

    // --- Helpers ---

    const getProgress = useCallback((parentId: string): { completed: number; total: number } => {
        const children = tasks.filter(t => t.parentId === parentId);
        const total = children.length;
        const completed = children.filter(t => t.status === 'done').length;
        return { completed, total };
    }, [tasks]);

    // Type for calendar items (day or weekend spanner)
    type CalendarItem = { type: 'day'; date: Date } | { type: 'weekend' };

    // Generate calendar items: weekdays only with weekend spanners (15 weeks = 75 weekdays)
    const calendarItems = useMemo((): CalendarItem[] => {
        const items: CalendarItem[] = [];
        let today = new Date();

        // Snap to Monday of current week
        const currentDayOfWeek = today.getDay();
        const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
        const startOfThisWeek = new Date(today);
        startOfThisWeek.setDate(today.getDate() - daysFromMonday);

        // Start 7 weeks back to provide buffer for scrolling
        const startDate = new Date(startOfThisWeek);
        startDate.setDate(startOfThisWeek.getDate() - (7 * 7));

        for (let week = 0; week < 15; week++) {
            if (week > 0) {
                items.push({ type: 'weekend' });
            }

            for (let day = 0; day < 5; day++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + (week * 7) + day);
                items.push({ type: 'day', date });
            }
        }

        return items;
    }, []);

    // Helper to format date for display
    const formatCalendarDate = (date: Date) => ({
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate(),
        dateStr: date.toISOString().split('T')[0] ?? '',
        isToday: new Date().toDateString() === date.toDateString(),
    });

    // Get task counts for a specific date
    const getDateTaskCounts = useCallback((dateStr: string) => {
        const tasksOnDate = tasks.filter(task => {
            if (!task.startDate || !task.endDate) return false;
            return dateStr >= task.startDate && dateStr <= task.endDate;
        });

        const projects = tasksOnDate.filter(t => t.type === 'project' && !t.parentId).length;
        const assignments = tasksOnDate.filter(t => t.type === 'assignment' && !t.parentId).length;
        const standaloneTasks = tasksOnDate.filter(t => (t.type === 'task' || t.type === 'subtask') && !t.parentId).length;

        return { projects, assignments, tasks: standaloneTasks };
    }, [tasks]);

    // Filter tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // Search filter - matches title, description, or attachment filenames
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesTitle = task.title.toLowerCase().includes(query);
                const matchesDesc = task.description?.toLowerCase().includes(query);
                const matchesAttachment = task.attachments?.some(
                    att => att.filename.toLowerCase().includes(query)
                );
                if (!matchesTitle && !matchesDesc && !matchesAttachment) return false;
            }

            // Classroom filter
            if (filterClassroom !== 'all') {
                if (!task.selectedRoomIds?.includes(filterClassroom)) return false;
            }

            // Status filter
            if (filterStatus === 'active' && task.status === 'done') return false;
            if (filterStatus === 'completed' && task.status !== 'done') return false;

            // Date filter - only show tasks active on the selected date
            if (filterDate) {
                if (!task.startDate || !task.endDate) return false;
                if (filterDate < task.startDate || filterDate > task.endDate) return false;
            }

            return true;
        });
    }, [tasks, searchQuery, filterClassroom, filterStatus, filterDate]);

    // Group tasks by type (only top-level items)
    const groupedTasks = useMemo(() => {
        const projects = filteredTasks.filter(t => t.type === 'project' && !t.parentId);
        const assignments = filteredTasks.filter(t => t.type === 'assignment' && !t.parentId);
        const standaloneTasks = filteredTasks.filter(t =>
            (t.type === 'task' || t.type === 'subtask') && !t.parentId
        );

        return { projects, assignments, standaloneTasks };
    }, [filteredTasks]);

    // --- Handlers ---

    const toggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleEdit = useCallback((task: Task) => {
        if (onEditTask) {
            onEditTask(task);
        }
    }, [onEditTask]);

    // Helper to collect task and all descendants recursively
    const collectTaskWithDescendants = useCallback((task: Task, allTasks: Task[]): Task[] => {
        const result: Task[] = [task];
        const children = allTasks.filter(t => t.parentId === task.id);
        for (const child of children) {
            result.push(...collectTaskWithDescendants(child, allTasks));
        }
        return result;
    }, []);

    const handleDelete = useCallback(async (task: Task) => {
        // Count descendants
        const descendants = collectTaskWithDescendants(task, tasks);
        const childCount = descendants.length - 1;

        const confirmMessage = childCount > 0
            ? `Delete "${task.title}" and ${childCount} child item${childCount > 1 ? 's' : ''}?`
            : `Delete "${task.title}"?`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            const deletedCount = await deleteTaskWithChildren(auth.currentUser!.uid, task.id, true);
            handleSuccess(`Deleted ${deletedCount} item${deletedCount > 1 ? 's' : ''}`);
        } catch (error) {
            console.error('Error deleting task:', error);
            handleError('Failed to delete task');
        }
    }, [tasks, collectTaskWithDescendants]);

    const handleCopyToBoard = useCallback((task: Task) => {
        if (!onCopyToBoard) {
            handleError('Copy to board is not available');
            return;
        }

        // Collect the task and all its descendants
        const tasksToAdd = collectTaskWithDescendants(task, tasks);

        // Call the prop callback with all tasks
        onCopyToBoard(tasksToAdd);

        const childCount = tasksToAdd.length - 1;
        const message = childCount > 0
            ? `Copied ${getTypeLabel(task.type)} with ${childCount} children to task board`
            : `Copied ${getTypeLabel(task.type)} to task board`;
        handleSuccess(message);
    }, [tasks, onCopyToBoard, collectTaskWithDescendants]);

    // Quick Add handlers
    const handleQuickAdd = useCallback((parentTask: Task) => {
        setQuickAddParentId(parentTask.id);
        setQuickAddTitle('');
        // Auto-expand parent to show the quick add row
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.add(parentTask.id);
            return next;
        });
    }, []);

    const handleQuickAddSave = useCallback(async () => {
        if (!auth.currentUser || !quickAddParentId || !quickAddTitle.trim()) return;

        const parentTask = tasks.find(t => t.id === quickAddParentId);
        if (!parentTask) return;

        const allowedChildTypes = ALLOWED_CHILD_TYPES[parentTask.type];
        if (!allowedChildTypes || allowedChildTypes.length === 0) return;

        const childType = allowedChildTypes[0];
        if (!childType) return;

        setIsQuickAddSaving(true);
        try {
            const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.presentationOrder || 0)) : 0;

            // Build path and pathTitles from parent
            const path = [...(parentTask.path || []), parentTask.id];
            const pathTitles = [...(parentTask.pathTitles || []), parentTask.title];
            const rootId = parentTask.rootId || parentTask.id;

            await addDoc(collection(db, 'tasks'), {
                title: quickAddTitle.trim(),
                description: '',
                type: childType,
                parentId: parentTask.id,
                rootId,
                path,
                pathTitles,
                linkURL: '',
                startDate: parentTask.startDate || format(new Date(), 'yyyy-MM-dd'),
                endDate: parentTask.endDate || format(new Date(), 'yyyy-MM-dd'),
                selectedRoomIds: parentTask.selectedRoomIds || [],
                teacherId: auth.currentUser.uid,
                presentationOrder: maxOrder + 1,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                imageURL: '',
                status: 'todo',
                childIds: [],
                attachments: [],
            });

            handleSuccess(`${getTypeLabel(childType)} added!`);
            setQuickAddParentId(null);
            setQuickAddTitle('');
        } catch (error) {
            console.error('Error adding item:', error);
            handleError("Failed to create item.");
        } finally {
            setIsQuickAddSaving(false);
        }
    }, [quickAddParentId, quickAddTitle, tasks]);

    const handleQuickAddCancel = useCallback(() => {
        setQuickAddParentId(null);
        setQuickAddTitle('');
    }, []);

    // Calendar navigation - shift visible date range smoothly by 5 days
    const navigateCalendar = (direction: 'left' | 'right') => {
        if (calendarRef.current) {
            const container = calendarRef.current;
            const scrollAmount = 5 * (62 + 16); // 5 days * (w-[62px] + gap-4)
            container.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // removed unused variables

    const handleCalendarMouseDown = (e: React.MouseEvent) => {
        if (!calendarRef.current) return;
        setIsDragging(true);
        setDragStartX(e.pageX - calendarRef.current.offsetLeft);
        setScrollStartLeft(calendarRef.current.scrollLeft);
    };

    const handleCalendarMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !calendarRef.current) return;
        e.preventDefault();
        const x = e.pageX - calendarRef.current.offsetLeft;
        calendarRef.current.scrollLeft = scrollStartLeft - (x - dragStartX) * 2;
    };

    const handleCalendarMouseUp = () => setIsDragging(false);
    const handleCalendarMouseLeave = () => setIsDragging(false);

    // Auto-scroll to center today or selected date smoothly
    useEffect(() => {
        const centerDate = () => {
            const target = selectedRef.current || todayRef.current;
            if (target && calendarRef.current) {
                const container = calendarRef.current;
                const containerWidth = container.offsetWidth;
                const targetLeft = target.offsetLeft;
                const targetWidth = target.offsetWidth;

                container.scrollTo({
                    left: targetLeft - (containerWidth / 2) + (targetWidth / 2),
                    behavior: 'smooth'
                });
            }
        };
        // Small delay to ensure layout is complete
        const timer = setTimeout(centerDate, 100);
        return () => clearTimeout(timer);
    }, [filterDate]); // Center when filtered date changes or on mount

    // Keyboard navigation for calendar
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle if typing in an input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') {
                return;
            }

            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();

                // Get all date strings from calendar items
                const dateStrings = calendarItems
                    .filter((item): item is { type: 'day'; date: Date } => item.type === 'day')
                    .map(item => item.date.toISOString().split('T')[0]);

                if (dateStrings.length === 0) return;

                const currentIndex = filterDate ? dateStrings.indexOf(filterDate) : -1;
                let newIndex: number;

                if (e.key === 'ArrowLeft') {
                    newIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
                } else {
                    newIndex = currentIndex >= dateStrings.length - 1 ? dateStrings.length - 1 : currentIndex + 1;
                }

                const newDate = dateStrings[newIndex];
                if (newDate) {
                    setFilterDate(newDate);

                    // Scroll the selected date into view
                    const buttons = calendarRef.current?.querySelectorAll('button[data-date]');
                    const targetButton = Array.from(buttons || []).find(btn => btn.getAttribute('data-date') === newDate);
                    targetButton?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            } else if (e.key === 'Escape') {
                setFilterDate(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filterDate, calendarItems]);

    // --- Render ---

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-brand-accent" />
            </div>
        );
    }

    // Header content for PageLayout
    const headerContent = (
        <>
            <div className="flex items-baseline gap-3">
                <span className="text-fluid-lg font-black text-brand-textPrimary">
                    Tasks:
                </span>
                <span className="text-fluid-lg font-black text-brand-textPrimary underline decoration-brand-accent decoration-2 underline-offset-4">
                    Inventory
                </span>
            </div>
        </>
    );

    return (
        <PageLayout header={headerContent} disableScroll>
            <div className="h-full flex flex-col">
                {/* Header with Filters */}
                <div className="flex-shrink-0">
                    {/* Search and Primary Filters */}
                    <div className="flex flex-col lg:flex-row items-center gap-4 pb-4 w-full lift-dynamic transition-float">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted group-focus-within:text-brand-accent transition-colors" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-base pl-10 h-11"
                            />
                        </div>

                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <button
                                onClick={() => {
                                    const searchName = prompt('Enter a name for this search:');
                                    if (searchName) {
                                        const newSavedSearch = {
                                            name: searchName,
                                            query: searchQuery,
                                            filters: {
                                                classroom: filterClassroom,
                                                status: filterStatus,
                                                date: filterDate,
                                            },
                                        };
                                        setSavedSearches([...savedSearches, newSavedSearch]);
                                    }
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold transition-float
                                bg-tile border border-border-subtle text-brand-textSecondary
                                shadow-layered hover:shadow-layered-lg button-lift-dynamic hover:border-brand-accent/50 hover:text-brand-textPrimary whitespace-nowrap"
                            >
                                Save Search
                            </button>

                            {/* Saved Searches Dropdown */}
                            <Select<string>
                                value={null}
                                nullable={true}
                                placeholder="Saved Searches..."
                                onChange={(value) => {
                                    if (value) {
                                        const savedSearch = savedSearches.find(search => search.name === value);
                                        if (savedSearch) {
                                            setSearchQuery(savedSearch.query);
                                            setFilterClassroom(savedSearch.filters.classroom);
                                            setFilterStatus(savedSearch.filters.status as 'all' | 'active' | 'completed');
                                            setFilterDate(savedSearch.filters.date);
                                        }
                                    }
                                }}
                                options={savedSearches.map(search => ({
                                    value: search.name,
                                    label: search.name,
                                }))}
                            />

                            {/* Classroom Filter */}
                            <Select<string>
                                value={filterClassroom === 'all' ? null : filterClassroom}
                                onChange={(value) => setFilterClassroom(value || 'all')}
                                options={rooms.map(room => ({
                                    value: room.id,
                                    label: room.name,
                                    iconColor: room.color || 'var(--color-brand-textSecondary)',
                                }))}
                                placeholder="All Classes"
                                icon={Filter}
                                nullable
                            />

                            {/* Status Filter */}
                            <Select<string>
                                value={filterStatus === 'all' ? null : filterStatus}
                                onChange={(value) => setFilterStatus((value || 'all') as 'all' | 'active' | 'completed')}
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'completed', label: 'Completed' },
                                ]}
                                placeholder="All Status"
                                nullable
                            />
                        </div>
                    </div>

                    {/* Date Filter Calendar Strip */}
                    <div className="pb-4 w-full flex-shrink-0">
                        <div className="flex items-center gap-3 w-full">
                            {/* All Dates Button */}
                            <button
                                onClick={() => setFilterDate(null)}
                                className={`
                                group shrink-0 w-[130px] h-11 flex items-center justify-center rounded-xl font-bold text-sm transition-float button-lift-dynamic select-none cursor-pointer border
                                focus:outline-none shadow-layered
                                ${filterDate === null
                                        ? 'bg-tile border-brand-accent text-brand-textPrimary ring-0 shadow-layered-lg'
                                        : 'bg-tile border-border-subtle text-brand-textSecondary hover:border-brand-accent/50 hover:text-brand-textPrimary'
                                    }
                            `}
                            >
                                All
                            </button>

                            {/* Left Arrow */}
                            <button
                                onClick={() => navigateCalendar('left')}
                                className="group shrink-0 flex items-center justify-center w-11 h-11 rounded-xl text-brand-textSecondary hover:text-brand-textPrimary hover:bg-tile-hover transition-float button-lift-dynamic border border-border-subtle shadow-layered"
                                title="Previous week"
                            >
                                <ChevronLeft size={18} className="transition-colors group-hover:text-brand-accent" />
                            </button>

                            {/* Scrollable Calendar Days */}
                            <div
                                ref={calendarRef}
                                onMouseDown={handleCalendarMouseDown}
                                onMouseMove={handleCalendarMouseMove}
                                onMouseUp={handleCalendarMouseUp}
                                onMouseLeave={handleCalendarMouseLeave}
                                className="flex-1 min-w-0 overflow-x-auto flex items-center justify-start gap-4 scrollbar-hide cursor-grab active:cursor-grabbing select-none py-3 [mask-image:linear-gradient(to_right,transparent,black_2%,black_98%,transparent)]"
                            >
                                {calendarItems.map((item, index) => {
                                    // Weekend spanner (subtle gap)
                                    if (item.type === 'weekend') {
                                        return <div key={`weekend-${index}`} className="w-4 shrink-0" />;
                                    }

                                    // Day button
                                    const { dayName, dayNum, dateStr, isToday } = formatCalendarDate(item.date);
                                    const isSelected = filterDate === dateStr;

                                    return (
                                        <button
                                            key={dateStr}
                                            ref={isSelected ? selectedRef : (isToday ? todayRef : null)}
                                            data-date={dateStr}
                                            onClick={() => !isDragging && setFilterDate(dateStr)}
                                            className={`
                                            group/btn relative shrink-0 flex flex-col items-center justify-center w-[62px] h-[64px] rounded-xl transition-all duration-300 ease-in-out border
                                            shadow-layered button-lift-dynamic
                                            ${isSelected
                                                    ? 'bg-tile border-brand-accent text-brand-textPrimary shadow-layered-lg'
                                                    : 'bg-tile border-border-subtle text-brand-textSecondary hover:text-brand-textPrimary hover:border-brand-accent/50 hover:bg-tile-hover'
                                                }
                                        `}
                                        >
                                            <span className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${isSelected ? 'text-brand-accent' : 'text-brand-textMuted group-hover/btn:text-brand-accent/70'} ${isToday ? 'underline decoration-brand-accent decoration-2 underline-offset-4' : ''}`}>
                                                {dayName}
                                            </span>
                                            <span className={`text-sm font-bold ${isSelected ? 'text-brand-textPrimary' : ''}`}>
                                                {dayNum}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Right Arrow */}
                            <button
                                onClick={() => navigateCalendar('right')}
                                className="group shrink-0 flex items-center justify-center w-11 h-11 rounded-xl text-brand-textSecondary hover:text-brand-textPrimary hover:bg-tile-hover transition-float button-lift-dynamic border border-border-subtle shadow-layered"
                                title="Next week"
                            >
                                <ChevronRight size={18} className="transition-colors group-hover:text-brand-accent" />
                            </button>

                            {/* Jump to Date (Calendar Picker) */}
                            <div className="relative shrink-0">
                                <DatePicker
                                    selected={filterDate ? new Date(filterDate) : null}
                                    onChange={(date: Date | null) => {
                                        if (date) {
                                            const formatted = date.toISOString().split('T')[0];
                                            setFilterDate(formatted || null);
                                        }
                                    }}
                                    customInput={
                                        <button className={`
                                            group shrink-0 w-[130px] h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-float button-lift-dynamic border shadow-layered
                                            ${filterDate !== null
                                                ? 'bg-tile border-brand-accent text-brand-textPrimary shadow-layered-lg'
                                                : 'bg-tile border-border-subtle text-brand-textSecondary hover:border-brand-accent/50 hover:text-brand-textPrimary hover:shadow-layered-lg'
                                            }
                                        `}>
                                            <CalendarIcon className={`w-4 h-4 transition-colors shrink-0 ${filterDate !== null ? 'text-brand-accent' : 'text-brand-textMuted group-hover:text-brand-accent'}`} />
                                            <span>Select date</span>
                                        </button>
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-0 min-w-0 flex flex-col pb-4 overflow-hidden">
                    {/* Mobile Tab Selector - only visible on small screens */}
                    <div className="lg:hidden mb-4">
                        <div className="flex rounded-lg border-2 border-border-subtle p-1 bg-tile-alt">
                            <button
                                onClick={() => setMobileActiveTab('projects')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-float ${mobileActiveTab === 'projects'
                                    ? 'bg-[var(--type-project-color)]/10 text-[var(--type-project-color)]'
                                    : 'text-brand-textSecondary hover:text-brand-textPrimary'
                                    }`}
                            >
                                <FolderOpen size={16} />
                                <span className="hidden sm:inline">Projects</span>
                                <span className="text-xs opacity-70">({groupedTasks.projects.length})</span>
                            </button>
                            <button
                                onClick={() => setMobileActiveTab('assignments')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-float ${mobileActiveTab === 'assignments'
                                    ? 'bg-[var(--type-assignment-color)]/10 text-[var(--type-assignment-color)]'
                                    : 'text-brand-textSecondary hover:text-brand-textPrimary'
                                    }`}
                            >
                                <FileText size={16} />
                                <span className="hidden sm:inline">Assignments</span>
                                <span className="text-xs opacity-70">({groupedTasks.assignments.length})</span>
                            </button>
                            <button
                                onClick={() => setMobileActiveTab('tasks')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-float ${mobileActiveTab === 'tasks'
                                    ? 'bg-[var(--type-task-color)]/10 text-[var(--type-task-color)]'
                                    : 'text-brand-textSecondary hover:text-brand-textPrimary'
                                    }`}
                            >
                                <ListChecks size={16} />
                                <span className="hidden sm:inline">Tasks</span>
                                <span className="text-xs opacity-70">({groupedTasks.standaloneTasks.length})</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 min-w-0 grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-full h-full">

                        {/* Projects Column */}
                        <div className={`flex flex-col h-full card-base p-4 min-w-0 overflow-hidden shadow-layered lift-dynamic transition-float ${mobileActiveTab !== 'projects' ? 'hidden lg:flex' : ''}`}>
                            <div className="flex-shrink-0 flex items-center gap-2 mb-4">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColorClasses('project')}`}>
                                    <FolderOpen size={16} />
                                </span>
                                <h3 className="font-bold text-brand-textPrimary">
                                    Projects
                                </h3>
                                <span className="text-xs text-brand-textSecondary font-medium">
                                    {groupedTasks.projects.length}
                                </span>
                                {groupedTasks.projects.some(p => p.childIds?.length > 0) && (
                                    <button
                                        onClick={() => {
                                            const projectIds = groupedTasks.projects.filter(p => p.childIds?.length > 0).map(p => p.id);
                                            const allExpanded = projectIds.every(id => expandedIds.has(id));
                                            if (allExpanded) {
                                                setExpandedIds(prev => {
                                                    const next = new Set(prev);
                                                    projectIds.forEach(id => next.delete(id));
                                                    return next;
                                                });
                                            } else {
                                                setExpandedIds(prev => new Set([...prev, ...projectIds]));
                                            }
                                        }}
                                        className="ml-auto flex items-center gap-1 text-xs text-brand-textSecondary hover:text-brand-textPrimary transition-colors"
                                    >
                                        {groupedTasks.projects.filter(p => p.childIds?.length > 0).every(p => expandedIds.has(p.id)) ? (
                                            <><span>Collapse</span><ChevronUp size={14} /></>
                                        ) : (
                                            <><span>Expand</span><ChevronDown size={14} /></>
                                        )}
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                                {groupedTasks.projects.length === 0 ? (
                                    <p className="text-center text-sm text-brand-textSecondary py-8 italic">
                                        No projects found
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {groupedTasks.projects.map(project => (
                                            <TreeItem
                                                key={project.id}
                                                task={project}
                                                allTasks={filteredTasks}
                                                depth={0}
                                                expandedIds={expandedIds}
                                                onToggleExpand={toggleExpand}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                                onCopyToBoard={handleCopyToBoard}
                                                getProgress={getProgress}
                                                onQuickAdd={handleQuickAdd}
                                                quickAddParentId={quickAddParentId}
                                                quickAddTitle={quickAddTitle}
                                                onQuickAddTitleChange={setQuickAddTitle}
                                                onQuickAddSave={handleQuickAddSave}
                                                onQuickAddCancel={handleQuickAddCancel}
                                                isQuickAddSaving={isQuickAddSaving}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Assignments Column */}
                        <div className={`flex flex-col h-full card-base p-4 min-w-0 overflow-hidden shadow-layered lift-dynamic transition-float ${mobileActiveTab !== 'assignments' ? 'hidden lg:flex' : ''}`}>
                            <div className="flex-shrink-0 flex items-center gap-2 mb-4">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColorClasses('assignment')}`}>
                                    <FileText size={16} />
                                </span>
                                <h3 className="font-bold text-brand-textPrimary">
                                    Assignments
                                </h3>
                                <span className="text-xs text-brand-textMuted font-medium">
                                    {groupedTasks.assignments.length}
                                </span>
                                {groupedTasks.assignments.some(a => a.childIds?.length > 0) && (
                                    <button
                                        onClick={() => {
                                            const assignmentIds = groupedTasks.assignments.filter(a => a.childIds?.length > 0).map(a => a.id);
                                            const allExpanded = assignmentIds.every(id => expandedIds.has(id));
                                            if (allExpanded) {
                                                setExpandedIds(prev => {
                                                    const next = new Set(prev);
                                                    assignmentIds.forEach(id => next.delete(id));
                                                    return next;
                                                });
                                            } else {
                                                setExpandedIds(prev => new Set([...prev, ...assignmentIds]));
                                            }
                                        }}
                                        className="ml-auto flex items-center gap-1 text-xs text-brand-textMuted hover:text-brand-textPrimary transition-colors"
                                    >
                                        {groupedTasks.assignments.filter(a => a.childIds?.length > 0).every(a => expandedIds.has(a.id)) ? (
                                            <><span>Collapse</span><ChevronUp size={14} /></>
                                        ) : (
                                            <><span>Expand</span><ChevronDown size={14} /></>
                                        )}
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                                {groupedTasks.assignments.length === 0 ? (
                                    <p className="text-center text-sm text-brand-textMuted py-8 italic">
                                        No standalone assignments
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {groupedTasks.assignments.map(assignment => (
                                            <TreeItem
                                                key={assignment.id}
                                                task={assignment}
                                                allTasks={filteredTasks}
                                                depth={0}
                                                expandedIds={expandedIds}
                                                onToggleExpand={toggleExpand}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                                onCopyToBoard={handleCopyToBoard}
                                                getProgress={getProgress}
                                                onQuickAdd={handleQuickAdd}
                                                quickAddParentId={quickAddParentId}
                                                quickAddTitle={quickAddTitle}
                                                onQuickAddTitleChange={setQuickAddTitle}
                                                onQuickAddSave={handleQuickAddSave}
                                                onQuickAddCancel={handleQuickAddCancel}
                                                isQuickAddSaving={isQuickAddSaving}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tasks Column */}
                        <div className={`flex flex-col h-full card-base p-4 min-w-0 overflow-hidden shadow-layered lift-dynamic transition-float ${mobileActiveTab !== 'tasks' ? 'hidden lg:flex' : ''}`}>
                            <div className="flex-shrink-0 flex items-center gap-2 mb-4">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColorClasses('task')}`}>
                                    <ListChecks size={16} />
                                </span>
                                <h3 className="font-bold text-brand-textPrimary">
                                    Tasks
                                </h3>
                                <span className="text-xs text-brand-textMuted font-medium">
                                    {groupedTasks.standaloneTasks.length}
                                </span>
                                {groupedTasks.standaloneTasks.some(t => t.childIds?.length > 0) && (
                                    <button
                                        onClick={() => {
                                            const taskIds = groupedTasks.standaloneTasks.filter(t => t.childIds?.length > 0).map(t => t.id);
                                            const allExpanded = taskIds.every(id => expandedIds.has(id));
                                            if (allExpanded) {
                                                setExpandedIds(prev => {
                                                    const next = new Set(prev);
                                                    taskIds.forEach(id => next.delete(id));
                                                    return next;
                                                });
                                            } else {
                                                setExpandedIds(prev => new Set([...prev, ...taskIds]));
                                            }
                                        }}
                                        className="ml-auto flex items-center gap-1 text-xs text-brand-textMuted hover:text-brand-textPrimary transition-colors"
                                    >
                                        {groupedTasks.standaloneTasks.filter(t => t.childIds?.length > 0).every(t => expandedIds.has(t.id)) ? (
                                            <><span>Collapse</span><ChevronUp size={14} /></>
                                        ) : (
                                            <><span>Expand</span><ChevronDown size={14} /></>
                                        )}
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                                {groupedTasks.standaloneTasks.length === 0 ? (
                                    <p className="text-center text-sm text-brand-textMuted py-8 italic">
                                        No tasks found
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {groupedTasks.standaloneTasks.map(task => (
                                            <TreeItem
                                                key={task.id}
                                                task={task}
                                                allTasks={filteredTasks}
                                                depth={0}
                                                expandedIds={expandedIds}
                                                onToggleExpand={toggleExpand}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                                onCopyToBoard={handleCopyToBoard}
                                                getProgress={getProgress}
                                                onQuickAdd={handleQuickAdd}
                                                quickAddParentId={quickAddParentId}
                                                quickAddTitle={quickAddTitle}
                                                onQuickAddTitleChange={setQuickAddTitle}
                                                onQuickAddSave={handleQuickAddSave}
                                                onQuickAddCancel={handleQuickAddCancel}
                                                isQuickAddSaving={isQuickAddSaving}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
