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
    Plus
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Classroom, ItemType, Task, ALLOWED_CHILD_TYPES } from '../../types';
import { useClassStore } from '../../store/classStore';
import { handleError, handleSuccess } from '../../utils/errorHandler';
import { toDateString } from '../../utils/dateHelpers';
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
}

// Recursive tree item component
interface TreeItemProps {
    task: Task;
    allTasks: Task[];
    depth: number;
    expandedIds: Set<string>;
    onToggleExpand: (id: string) => void;
    onEdit: (task: Task) => void;
    onDuplicate: (task: Task) => void;
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
    onDuplicate,
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
    const progress = hasChildren ? getProgress(task.id) : null;
    
    // Check if this task type can have children
    const allowedChildTypes = ALLOWED_CHILD_TYPES[task.type];
    const canHaveChildren = allowedChildTypes && allowedChildTypes.length > 0;
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
                `}
                style={{ paddingLeft: `${depth * 20 + 8}px` }}
            >
                {/* Expand/Collapse Toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand(task.id);
                    }}
                    className={`p-1 rounded transition-all ${hasChildren ? 'hover:bg-gray-200 dark:hover:bg-gray-700' : 'opacity-0'}`}
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
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-brand-textDarkPrimary dark:text-brand-textPrimary truncate">
                            {task.title}
                        </span>
                        {task.status === 'done' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 font-medium">
                                Done
                            </span>
                        )}
                    </div>
                    
                    {/* Progress Bar for parents */}
                    {progress && progress.total > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-20 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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

                {/* Date Range - compact on mobile, full on desktop */}
                {task.startDate && task.endDate && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                        {/* Mobile: show due date only */}
                        <span className="sm:hidden">
                            {new Date(task.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {/* Desktop: show full range */}
                        <span className="hidden sm:inline">
                            {new Date(task.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {task.startDate !== task.endDate && (
                                <> - {new Date(task.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                            )}
                        </span>
                    </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                    {/* Quick Add Button - only show for items that can have children */}
                    {canHaveChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onQuickAdd(task);
                            }}
                            className="p-1.5 min-w-[2.75rem] min-h-[2.75rem] sm:min-w-0 sm:min-h-0 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-500 transition-all flex items-center justify-center"
                            title={`Add ${allowedChildTypes[0]}`}
                        >
                            <Plus size={14} />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate(task);
                        }}
                        className="p-1.5 min-w-[2.75rem] min-h-[2.75rem] sm:min-w-0 sm:min-h-0 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-brand-accent transition-all flex items-center justify-center"
                        title="Duplicate"
                    >
                        <Copy size={14} />
                    </button>
                </div>
            </div>

            {/* Quick Add Input Row */}
            {isQuickAddActive && (
                <div 
                    className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg mx-2 mb-1 border-2 border-dashed border-green-300 dark:border-green-700"
                    style={{ marginLeft: `${(depth + 1) * 20 + 8}px` }}
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
                        className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                            onDuplicate={onDuplicate}
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

export default function TaskInventory({ onEditTask }: TaskInventoryProps) {
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

    const handleDuplicate = useCallback(async (task: Task) => {
        if (!auth.currentUser) return;

        try {
            const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.presentationOrder || 0)) : 0;

            // Create a copy with new dates
            await addDoc(collection(db, 'tasks'), {
                title: `${task.title} (Copy)`,
                description: task.description || '',
                type: task.type,
                parentId: null, // Duplicates are standalone by default
                rootId: null,
                path: [],
                pathTitles: [],
                linkURL: task.linkURL || '',
                startDate: toDateString(),
                endDate: toDateString(),
                selectedRoomIds: task.selectedRoomIds || [],
                teacherId: auth.currentUser.uid,
                presentationOrder: maxOrder + 1,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                imageURL: task.imageURL || '',
                status: 'todo',
                childIds: [],
            });

            handleSuccess(`${getTypeLabel(task.type)} duplicated!`);
        } catch (error) {
            console.error("Error duplicating:", error);
            handleError("Failed to duplicate item.");
        }
    }, [tasks]);

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
                startDate: parentTask.startDate || toDateString(),
                endDate: parentTask.endDate || toDateString(),
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
            console.error("Error creating quick add task:", error);
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
    
    // Reset calendar to show today
    const resetCalendarToToday = () => {
        setCalendarOffset(0);
    };

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
            <div className="h-full w-full flex flex-col overflow-y-auto lg:overflow-hidden">
            {/* Header with Filters */}
            <div className="p-4 flex-shrink-0">
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
                            className="w-full pl-9 pr-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-transparent text-sm font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary placeholder-gray-400 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:border-brand-accent transition-all"
                        />
                    </div>

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
                                flex-shrink-0 px-4 py-2 rounded-md border-2 font-bold text-sm transition-all select-none cursor-pointer
                                focus:outline-none focus:ring-2 focus:ring-brand-accent/20 active:scale-95
                                ${filterDate === null
                                    ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
                                }
                            `}
                        >
                            All
                        </button>

                        {/* Left Arrow */}
                        <button
                            onClick={() => navigateCalendar('left')}
                            className="flex-shrink-0 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
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
                            className="flex-shrink-0 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
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
                    <div className="flex rounded-lg border-2 border-gray-200 dark:border-gray-700 p-1 bg-brand-lightSurface dark:bg-brand-darkSurface">
                        <button
                            onClick={() => setMobileActiveTab('projects')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                                mobileActiveTab === 'projects'
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
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                                mobileActiveTab === 'assignments'
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
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                                mobileActiveTab === 'tasks'
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
                                        onDuplicate={handleDuplicate}
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
                                        onDuplicate={handleDuplicate}
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
                                        onDuplicate={handleDuplicate}
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
