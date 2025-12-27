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
    Trash2
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Classroom, ItemType, Task, ALLOWED_CHILD_TYPES } from '../../types';
import { useClassStore } from '../../store/classStore';
import { handleError, handleSuccess } from '../../utils/errorHandler';
import { format } from 'date-fns';
import { deleteTaskWithChildren } from '../../services/firestoreService';
import { DatePicker } from '../shared/DatePicker';
import { Select } from '../shared/Select';

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
        case 'project': return 'text-purple-500 bg-purple-500/10 border-purple-500/30';
        case 'assignment': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
        case 'task': return 'text-green-500 bg-green-500/10 border-green-500/30';
        case 'subtask': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
    }
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
                    hover:bg-gray-50 dark:hover:bg-gray-800
                    pl-[var(--depth-padding)]
                `}
                style={{ '--depth-padding': `${depth * 20 + 8}px` } as React.CSSProperties}
            >
                {/* Expand/Collapse Toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand(task.id);
                    }}
                    className={`p-1 rounded-lg transition-all ${hasChildren ? 'hover:bg-slate-200 dark:hover:bg-white/5' : 'opacity-0'}`}
                    disabled={!hasChildren}
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* Type Icon */}
                <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${getTypeColorClasses(task.type)}`}>
                    <TypeIcon size={12} />
                </span>

                {/* Title & Info */}
                <div className="flex-1 min-w-0" onClick={() => onEdit(task)}>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            {task.title}
                        </span>
                        {task.status === 'done' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 font-medium flex-shrink-0">
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
                        className="p-1.5 min-w-[2.75rem] min-h-[2.75rem] sm:min-w-0 sm:min-h-0 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-500 transition-all flex items-center justify-center"
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
                        className="p-1.5 min-w-[2.75rem] min-h-[2.75rem] sm:min-w-0 sm:min-h-0 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-all flex items-center justify-center"
                        title="Delete task"
                    >
                        <Trash2 size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCopyToBoard(task);
                        }}
                        className="p-1.5 min-w-[2.75rem] min-h-[2.75rem] sm:min-w-0 sm:min-h-0 rounded-xl hover:bg-slate-200 dark:hover:bg-[#151921] text-gray-400 hover:text-brand-accent transition-all flex items-center justify-center border border-transparent hover:border-slate-300 dark:hover:border-white/5"
                        title="Copy to Task Board"
                    >
                        <Copy size={14} />
                    </button>
                </div>
            </div>

            {/* Quick Add Input Row */}
            {isQuickAddActive && (
                <div
                    className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg mx-2 mb-1 border-2 border-dashed border-green-300 dark:border-green-700 ml-[var(--depth-margin)]"
                    style={{ '--depth-margin': `${(depth + 1) * 20 + 8}px` } as React.CSSProperties}
                >
                    <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${getTypeColorClasses(allowedChildTypes[0] || 'task')}`}>
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
                        className="flex-1 px-2 py-1 text-sm bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        disabled={isQuickAddSaving}
                    />
                    {isQuickAddSaving ? (
                        <Loader size={16} className="animate-spin text-green-500" />
                    ) : (
                        <button
                            onClick={onQuickAddSave}
                            disabled={!quickAddTitle.trim()}
                            className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

    // Calendar navigation - offset in weeks (negative = past, positive = future)
    const [calendarOffset, setCalendarOffset] = useState(0);

    // Calendar refs
    const calendarRef = useRef<HTMLDivElement>(null);
    const todayRef = useRef<HTMLButtonElement>(null);
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

    // Generate calendar items: weekdays only with weekend spanners (3 weeks = 15 weekdays)
    // Uses calendarOffset to shift the visible date range
    const calendarItems = useMemo((): CalendarItem[] => {
        const items: CalendarItem[] = [];
        let today = new Date();

        // If today is Saturday (6) or Sunday (0), snap to next Monday
        const dayOfWeek = today.getDay();
        if (dayOfWeek === 0) {
            today.setDate(today.getDate() + 1); // Sunday -> Monday
        } else if (dayOfWeek === 6) {
            today.setDate(today.getDate() + 2); // Saturday -> Monday
        }

        // Start from Monday of previous week (show some past dates)
        const startDate = new Date(today);
        const currentDayOfWeek = startDate.getDay();
        const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
        startDate.setDate(startDate.getDate() - daysFromMonday - 7); // Go back one more week

        // Apply calendar offset (shift by weeks)
        startDate.setDate(startDate.getDate() + (calendarOffset * 7));

        // Generate 3 weeks of weekdays (15 days total)
        for (let week = 0; week < 3; week++) {
            // Add weekend spanner between weeks
            if (week > 0) {
                items.push({ type: 'weekend' });
            }

            // Add Mon-Fri for this week
            for (let day = 0; day < 5; day++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + (week * 7) + day);
                items.push({ type: 'day', date });
            }
        }

        return items;
    }, [calendarOffset]);

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

    // Calendar navigation - shift visible date range by 1 week
    const navigateCalendar = (direction: 'left' | 'right') => {
        setCalendarOffset(prev => prev + (direction === 'left' ? -1 : 1));
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

    // Auto-scroll to center today on mount
    useEffect(() => {
        const scrollToToday = () => {
            if (todayRef.current && calendarRef.current) {
                const container = calendarRef.current;
                const todayButton = todayRef.current;
                const containerWidth = container.offsetWidth;
                const buttonLeft = todayButton.offsetLeft;
                const buttonWidth = todayButton.offsetWidth;

                // Scroll to center today
                container.scrollLeft = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
            }
        };
        // Small delay to ensure layout is complete
        const timer = setTimeout(scrollToToday, 100);
        return () => clearTimeout(timer);
    }, [calendarItems]);

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

    return (
        <div className="h-full w-full min-w-0 overflow-hidden">
            <div className="h-full w-full flex flex-col space-y-3 overflow-y-auto lg:overflow-hidden">

                {/* Content Header - hidden on mobile (TeacherDashboard provides mobile header) */}
                <div className="hidden lg:flex h-16 flex-shrink-0 items-center justify-between px-4">
                    <div className="flex items-baseline gap-3">
                        <span className="text-fluid-lg font-black text-gray-400">
                            Tasks:
                        </span>
                        <span className="text-fluid-lg font-black text-brand-textDarkPrimary dark:text-brand-textPrimary underline decoration-brand-accent decoration-2 underline-offset-4">
                            Inventory
                        </span>
                    </div>
                </div>

                {/* Header with Filters */}
                <div className="p-4 pt-0 flex-shrink-0">
                    {/* Search & Filters */}
                    <div className="flex flex-wrap gap-3">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search tasks..."
                                className="w-full pl-9 pr-3 py-2 rounded-lg border-2 border-gray-400 dark:border-gray-600 bg-transparent text-sm font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary placeholder-gray-400 hover:border-gray-600 dark:hover:border-gray-400 focus:outline-none focus:border-brand-accent transition-all"
                            />
                        </div>

                        {/* Save Search Button */}
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
                            className="p-2 rounded-lg border-2 border-gray-400 dark:border-gray-600 bg-transparent text-sm font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary placeholder-gray-400 hover:border-gray-600 dark:hover:border-gray-400 focus:outline-none focus:border-brand-accent transition-all"
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
                                iconColor: room.color || '#6B7280',
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
                <div className="px-4 pb-4 w-full flex-shrink-0">
                    <div className="card-base border-0 rounded-md p-3 w-full overflow-hidden">
                        <div className="flex items-center gap-3 w-full overflow-hidden">
                            {/* All Dates Button */}
                            <button
                                onClick={() => setFilterDate(null)}
                                className={`
                                flex-shrink-0 px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all duration-300 transition-float hover:-translate-y-0.5 select-none cursor-pointer
                                focus:outline-none focus:ring-2 focus:ring-brand-accent/20 active:scale-95 shadow-layered-sm
                                ${filterDate === null
                                        ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                                        : 'border-slate-200 dark:border-white/10 text-gray-500 hover:border-slate-400 dark:hover:border-white/20'
                                    }
                            `}
                            >
                                All
                            </button>

                            {/* Left Arrow */}
                            <button
                                onClick={() => navigateCalendar('left')}
                                className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full text-brand-textDarkSecondary dark:text-gray-400 hover:text-brand-textDarkPrimary dark:hover:text-brand-textPrimary hover:bg-white dark:hover:bg-white/10 transition-all duration-300 transition-float hover:-translate-y-0.5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 shadow-layered-sm"
                                title="Previous week"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            {/* Scrollable Calendar Days */}
                            <div
                                ref={calendarRef}
                                onMouseDown={handleCalendarMouseDown}
                                onMouseMove={handleCalendarMouseMove}
                                onMouseUp={handleCalendarMouseUp}
                                onMouseLeave={handleCalendarMouseLeave}
                                className="flex-1 min-w-0 overflow-x-auto flex items-center justify-between scrollbar-hide cursor-grab active:cursor-grabbing select-none"
                            >
                                {calendarItems.map((item, index) => {
                                    // Weekend spanner (subtle gap)
                                    if (item.type === 'weekend') {
                                        return <div key={`weekend-${index}`} className="w-4 flex-shrink-0" />;
                                    }

                                    // Day button
                                    const { dayName, dayNum, dateStr, isToday } = formatCalendarDate(item.date);
                                    const isSelected = filterDate === dateStr;
                                    const counts = getDateTaskCounts(dateStr);
                                    const hasItems = counts.projects > 0 || counts.assignments > 0 || counts.tasks > 0;

                                    return (
                                        <button
                                            key={dateStr}
                                            ref={isToday ? todayRef : null}
                                            data-date={dateStr}
                                            onClick={() => !isDragging && setFilterDate(dateStr)}
                                            className={`
                                            flex flex-col items-center justify-center flex-shrink-0
                                            w-14 h-16 rounded-md transition-all
                                            ${isSelected
                                                    ? 'bg-brand-accent/20'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                                        `}
                                        >
                                            <span className={`text-[11px] font-semibold uppercase tracking-wide ${isToday ? 'text-brand-textDarkPrimary dark:text-brand-textPrimary underline decoration-brand-accent decoration-2 underline-offset-2' : 'text-gray-400'}`}>
                                                {dayName}
                                            </span>
                                            <span className={`text-xl font-bold ${isSelected ? 'text-brand-accent' : 'text-brand-textDarkPrimary dark:text-brand-textPrimary'}`}>
                                                {dayNum}
                                            </span>
                                            {/* Task counts - colored dots */}
                                            {hasItems && (
                                                <div className="flex gap-1 mt-0.5">
                                                    {counts.projects > 0 && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title={`${counts.projects} projects`} />
                                                    )}
                                                    {counts.assignments > 0 && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title={`${counts.assignments} assignments`} />
                                                    )}
                                                    {counts.tasks > 0 && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" title={`${counts.tasks} tasks`} />
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Right Arrow */}
                            <button
                                onClick={() => navigateCalendar('right')}
                                className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full text-brand-textDarkSecondary dark:text-gray-400 hover:text-brand-textDarkPrimary dark:hover:text-brand-textPrimary hover:bg-white dark:hover:bg-white/10 transition-all duration-300 transition-float hover:-translate-y-0.5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 shadow-layered-sm"
                                title="Next week"
                            >
                                <ChevronRight size={18} />
                            </button>

                            {/* Date Picker - Using shared component */}
                            <DatePicker
                                value={filterDate || ''}
                                onChange={(value) => setFilterDate(value || null)}
                                placeholder="Jump to date"
                                className="flex-shrink-0 w-36"
                            />
                        </div>
                    </div>
                </div>

                {/* Content - Three Columns */}
                <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-4">
                    {/* Mobile Tab Selector - only visible on small screens */}
                    <div className="lg:hidden mb-4">
                        <div className="flex rounded-lg border-2 border-gray-400 dark:border-gray-600 p-1 bg-brand-lightSurface dark:bg-brand-darkSurface">
                            <button
                                onClick={() => setMobileActiveTab('projects')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-all ${mobileActiveTab === 'projects'
                                    ? 'bg-purple-500/10 text-purple-500'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                    }`}
                            >
                                <FolderOpen size={16} />
                                <span className="hidden sm:inline">Projects</span>
                                <span className="text-xs opacity-70">({groupedTasks.projects.length})</span>
                            </button>
                            <button
                                onClick={() => setMobileActiveTab('assignments')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-all ${mobileActiveTab === 'assignments'
                                    ? 'bg-blue-500/10 text-blue-500'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                    }`}
                            >
                                <FileText size={16} />
                                <span className="hidden sm:inline">Assignments</span>
                                <span className="text-xs opacity-70">({groupedTasks.assignments.length})</span>
                            </button>
                            <button
                                onClick={() => setMobileActiveTab('tasks')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-all ${mobileActiveTab === 'tasks'
                                    ? 'bg-green-500/10 text-green-500'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                    }`}
                            >
                                <ListChecks size={16} />
                                <span className="hidden sm:inline">Tasks</span>
                                <span className="text-xs opacity-70">({groupedTasks.standaloneTasks.length})</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-full">

                        {/* Projects Column */}
                        <div className={`card-base p-4 min-w-0 overflow-hidden ${mobileActiveTab !== 'projects' ? 'hidden lg:block' : ''}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColorClasses('project')}`}>
                                    <FolderOpen size={16} />
                                </span>
                                <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    Projects
                                </h3>
                                <span className="text-xs text-gray-400 font-medium">
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
                                        className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        {groupedTasks.projects.filter(p => p.childIds?.length > 0).every(p => expandedIds.has(p.id)) ? (
                                            <><span>Collapse</span><ChevronUp size={14} /></>
                                        ) : (
                                            <><span>Expand</span><ChevronDown size={14} /></>
                                        )}
                                    </button>
                                )}
                            </div>

                            {groupedTasks.projects.length === 0 ? (
                                <p className="text-center text-sm text-gray-400 py-8 italic">
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

                        {/* Assignments Column */}
                        <div className={`card-base p-4 min-w-0 overflow-hidden ${mobileActiveTab !== 'assignments' ? 'hidden lg:block' : ''}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColorClasses('assignment')}`}>
                                    <FileText size={16} />
                                </span>
                                <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    Assignments
                                </h3>
                                <span className="text-xs text-gray-400 font-medium">
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
                                        className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        {groupedTasks.assignments.filter(a => a.childIds?.length > 0).every(a => expandedIds.has(a.id)) ? (
                                            <><span>Collapse</span><ChevronUp size={14} /></>
                                        ) : (
                                            <><span>Expand</span><ChevronDown size={14} /></>
                                        )}
                                    </button>
                                )}
                            </div>

                            {groupedTasks.assignments.length === 0 ? (
                                <p className="text-center text-sm text-gray-400 py-8 italic">
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

                        {/* Tasks Column */}
                        <div className={`card-base p-4 min-w-0 overflow-hidden ${mobileActiveTab !== 'tasks' ? 'hidden lg:block' : ''}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColorClasses('task')}`}>
                                    <ListChecks size={16} />
                                </span>
                                <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    Tasks
                                </h3>
                                <span className="text-xs text-gray-400 font-medium">
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
                                        className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        {groupedTasks.standaloneTasks.filter(t => t.childIds?.length > 0).every(t => expandedIds.has(t.id)) ? (
                                            <><span>Collapse</span><ChevronUp size={14} /></>
                                        ) : (
                                            <><span>Expand</span><ChevronDown size={14} /></>
                                        )}
                                    </button>
                                )}
                            </div>

                            {groupedTasks.standaloneTasks.length === 0 ? (
                                <p className="text-center text-sm text-gray-400 py-8 italic">
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
    );
}
